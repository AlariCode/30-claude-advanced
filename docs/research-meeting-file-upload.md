# Research: Meeting File Upload — Technical Implementation

**План:** docs/plan-meeting-file-upload.md  
**PRD:** docs/prd-meeting-file-upload.md  
**Дата:** 2026-05-15

---

## Стек и контекст

| Слой     | Технологии                                                  |
| -------- | ----------------------------------------------------------- |
| Backend  | NestJS 11, **Fastify** adapter, CQRS, Prisma 7 + PostgreSQL |
| Frontend | Next.js 15, React 19, HeroUI v3, Tailwind CSS v4            |
| Тесты    | E2E only, supertest + реальная PostgreSQL БД                |

Ключевое ограничение: используется **Fastify**, а не Express. Это полностью меняет подход к multipart/file upload.

---

## Фаза 1: Backend — загрузка и список файлов

### Пакеты

```bash
# из корня монорепо
npm install @fastify/multipart --workspace=@video-meetings/api
```

`@nestjs/platform-express` и `multer` **не подходят** — они Express-specific. Для Fastify нужен `@fastify/multipart`.

### Регистрация плагина в `main.ts`

```ts
await app.register(import('@fastify/multipart'), {
  limits: {
    fileSize: 100 * 1_024 * 1_024, // 100 МБ
    files: 1, // один файл за раз (по PRD)
  },
})
```

Регистрировать **до** `app.listen`, рядом с `@fastify/cors`.

### Приём файла в контроллере

Fastify не предоставляет декоратор `@UploadedFile()` — файл достаётся напрямую из raw-запроса:

```ts
@Post(':id/files')
async uploadFile(@Req() req: AuthRequest, @Param('id') meetingId: string) {
  const data = await req.raw.file()       // возвращает MultipartFile | undefined
  if (!data) throw new BadRequestException('File is required')
  // data.filename, data.mimetype, data.file (Readable stream)
}
```

`req.raw` — это нативный Fastify `FastifyRequest`, а `.file()` — метод из `@fastify/multipart`.

### Сохранение файла на диск

Стримить на диск через `stream.pipeline` (promisify) — не буферизировать в память:

```ts
import { pipeline } from 'stream/promises'
import * as fs from 'fs'
import * as path from 'path'

const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
const fileId = createId() // cuid — уже есть через Prisma
const dir = path.join(uploadDir, 'meetings', meetingId, fileId)
await fs.promises.mkdir(dir, { recursive: true })
const filePath = path.join(dir, data.filename)
await pipeline(data.file, fs.createWriteStream(filePath))
```

`createId` из `@paralleldrive/cuid2` (уже используется в Prisma) — либо `randomUUID()` из `crypto`.

### Автосоздание `UPLOAD_DIR` при старте

В `main.ts` после создания приложения:

```ts
const uploadDir = process.env.UPLOAD_DIR ?? './uploads'
await fs.promises.mkdir(uploadDir, { recursive: true })
```

### Валидация типа и размера

Список допустимых MIME-типов проверяется **после** получения файла, до записи на диск:

```ts
const ALLOWED_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
])

if (!ALLOWED_MIMES.has(data.mimetype)) {
  await data.file.resume() // обязательно слить поток, иначе зависнет
  throw new BadRequestException(`File type ${data.mimetype} is not allowed`)
}
```

Превышение размера Fastify обработает само — бросит ошибку `FST_FILES_LIMIT` / `RequestFileTooLargeError`. Перехватить через `@Catch` и вернуть 400.

### Prisma-схема (`MeetingFile`)

```prisma
model MeetingFile {
  id           String   @id @default(cuid())
  meetingId    String
  meeting      Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  originalName String
  mimeType     String
  size         Int
  filePath     String
  uploadedAt   DateTime @default(now())
}

// В модели Meeting добавить:
model Meeting {
  // ...существующие поля...
  files MeetingFile[]
}
```

`onDelete: Cascade` — при удалении встречи файловые записи удаляются из БД автоматически (файлы с диска — нет, это отдельная задача при необходимости).

### CQRS-структура модуля `MeetingFileModule`

```
src/meeting-file/
  commands/
    upload-file.command.ts
    delete-file.command.ts
  queries/
    get-meeting-files.query.ts
  handlers/
    upload-file.handler.ts
    delete-file.handler.ts
    get-meeting-files.handler.ts
  meeting-file.controller.ts
  meeting-file.module.ts
```

Контроллер пробрасывает файловый поток и метаданные в `UploadFileCommand`. **Важно:** запись в БД и стриминг на диск происходят в handler синхронно — сначала диск, потом БД; при ошибке записи в БД удалять файл с диска.

### E2E-тест загрузки (supertest + Fastify)

```ts
import { createReadStream } from 'fs'

it('201: загружает файл и возвращает метаданные', async () => {
  const res = await request(app.getHttpServer())
    .post(`/meetings/${meetingId}/files`)
    .set('Authorization', `Bearer ${token}`)
    .attach('file', Buffer.from('dummy content'), {
      filename: 'test.txt',
      contentType: 'text/plain',
    })
    .expect(201)

  expect(res.body).toMatchObject({
    originalName: 'test.txt',
    mimeType: 'text/plain',
  })
  expect(res.body).toHaveProperty('id')
})
```

`.attach()` из supertest отправляет `multipart/form-data`. Поле должно называться `file` — это то, что `req.raw.file()` ожидает.

---

## Фаза 2: Backend — скачивание и удаление

### Download — `StreamableFile`

`StreamableFile` из `@nestjs/common` совместим с Fastify-адаптером:

```ts
import { StreamableFile } from '@nestjs/common'
import { createReadStream } from 'fs'

@Get(':id/files/:fileId/download')
async download(
  @Param('id') meetingId: string,
  @Param('fileId') fileId: string,
  @Res({ passthrough: true }) res: FastifyReply,
) {
  const file = await this.queryBus.execute(new GetFileQuery(fileId, meetingId))
  res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`)
  res.header('Content-Type', file.mimeType)
  return new StreamableFile(createReadStream(file.filePath))
}
```

`@Res({ passthrough: true })` — ключевое: без `passthrough` NestJS отдаст управление ответом Fastify напрямую и `StreamableFile` не сработает.

Тип `FastifyReply` из `fastify` (не Express `Response`).

### Delete — ownership check

```ts
@Delete(':id/files/:fileId')
async deleteFile(
  @Req() req: AuthRequest,
  @Param('id') meetingId: string,
  @Param('fileId') fileId: string,
) {
  return this.commandBus.execute(new DeleteFileCommand(fileId, meetingId, req.user.id))
}
```

В handler:

1. Загрузить `MeetingFile` вместе с `meeting` (include: { meeting: true })
2. Если `file.meeting.ownerId !== userId` — `throw new ForbiddenException()`
3. Удалить файл с диска: `fs.promises.unlink(file.filePath)`
4. Удалить директорию файла: `fs.promises.rmdir(dir)` (если пустая)
5. Удалить запись из БД

### E2E-тест скачивания

```ts
it('200: возвращает файл с корректным Content-Disposition', async () => {
  const res = await request(app.getHttpServer())
    .get(`/meetings/${meetingId}/files/${fileId}/download`)
    .set('Authorization', `Bearer ${token}`)
    .expect(200)

  expect(res.headers['content-disposition']).toMatch(/attachment/)
  expect(res.headers['content-disposition']).toMatch(/test\.txt/)
})
```

### E2E-тест ownership (403)

```ts
it('403: чужой пользователь не может удалить файл', async () => {
  // создать второго пользователя, получить его token
  await request(app.getHttpServer())
    .delete(`/meetings/${meetingId}/files/${fileId}`)
    .set('Authorization', `Bearer ${otherToken}`)
    .expect(403)
})
```

---

## Фаза 3 & 4: Frontend

### Drag-and-drop зона

**Рекомендация:** нативный HTML5 Drag and Drop API без дополнительных зависимостей. React 19 с новыми хуками достаточно:

```tsx
function DropZone({ onDrop }: { onDrop: (file: File) => void }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onDrop(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* HeroUI-компоненты */}
    </div>
  )
}
```

Альтернатива — `react-dropzone`, но добавляет зависимость ради функционала, который покрывается нативно.

### Прогресс-бар — XHR вместо fetch

`fetch` API **не поддерживает** `upload.onprogress`. Нужен `XMLHttpRequest`:

```ts
function uploadFile(meetingId: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<MeetingFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const formData = new FormData()
    formData.append('file', file)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 201) resolve(JSON.parse(xhr.responseText))
      else reject(new Error(xhr.responseText))
    }
    xhr.onerror = () => reject(new Error('Network error'))

    xhr.open('POST', `/api/meetings/${meetingId}/files`)
    xhr.setRequestHeader('Authorization', `Bearer ${getToken()}`)
    xhr.send(formData)
  })
}
```

Альтернатива — `axios` (обёртка над XHR с поддержкой `onUploadProgress`). Оправдана, если `axios` уже есть в проекте — иначе лишняя зависимость.

### Иконки по MIME-type

Без сторонних библиотек — маппинг MIME → SVG-иконка:

```ts
const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'video/mp4': '🎬',
  'audio/mpeg': '🎵',
  // ...
}
```

Для production-UI: `react-icons` или HeroUI Icon (если есть в v3).

### Обновление списка без перезагрузки

В React 19 + Next.js 15 App Router — Server Actions + `useOptimistic` или клиентский state:

```tsx
// После успешной загрузки
const [files, setFiles] = useState<MeetingFile[]>(initialFiles)

const handleUploadSuccess = (newFile: MeetingFile) => {
  setFiles((prev) => [...prev, newFile])
}

const handleDelete = async (fileId: string) => {
  await deleteFile(meetingId, fileId)
  setFiles((prev) => prev.filter((f) => f.id !== fileId))
}
```

Для полного соответствия Next.js 15 паттернам — `router.refresh()` после мутации (если данные приходят через RSC), но это вызовет полный рефетч. Клиентский state оптимальнее для UX.

---

## Ключевые риски и нюансы

| Риск                                                                       | Решение                                                                                                              |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `@fastify/multipart` не зарегистрирован → `req.raw.file is not a function` | Регистрировать в `main.ts` до `listen`                                                                               |
| Поток файла не слит при ошибке валидации → request зависнет                | Всегда вызывать `data.file.resume()` при отклонении                                                                  |
| `StreamableFile` без `passthrough: true` → пустой ответ                    | Использовать `@Res({ passthrough: true })`                                                                           |
| Размер файла считается из `Content-Length`, не из реального стрима         | Fastify сам обрывает поток при превышении лимита; размер записывать в БД из `data.file.bytesRead` **после** pipeline |
| Файл на диске остался после ошибки записи в БД                             | В handler: при `catch` удалять файл с диска через `fs.promises.unlink`                                               |
| E2E тест не чистит файлы с диска                                           | В `afterAll` — удалять тестовую директорию: `fs.rmSync(testUploadDir, { recursive: true, force: true })`             |
| `Content-Disposition` с кириллическими именами                             | Использовать `encodeURIComponent` + RFC 5987: `filename*=UTF-8''${encoded}`                                          |

---

## Итоговые пакеты к установке

```bash
# Backend
npm install @fastify/multipart --workspace=@video-meetings/api

# Frontend (опционально — только если нужен progress без ручного XHR)
# npm install axios --workspace=@video-meetings/web
```

Всё остальное (Node.js `fs`, `stream/promises`, `crypto`, `path`) — встроенные модули.
