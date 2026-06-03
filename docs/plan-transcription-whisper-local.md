# Plan: Audio/Video Transcription via Local Whisper

**PRD:** docs/prd-transcription-whisper-local.md
**Дата:** 2026-05-29

## Фазы реализации

---

### Фаза 1: Database & Backend — миграция схемы и запуск транскрибации

**Цель:** Расширить `MeetingFile` полями транскрибации, запустить Whisper асинхронно после upload, вернуть статус в API.

**Затрагивает:** database, backend

**Задачи:**

- [ ] Добавить enum `TranscriptionStatus` (`PENDING`, `IN_PROGRESS`, `DONE`, `FAILED`, `SKIPPED`) и поля `transcriptionStatus`, `transcript`, `transcriptionError` в модель `MeetingFile` в `schema.prisma`; запустить миграцию
- [ ] Создать `TranscriptionService` с методом `transcribeFile(fileId, filePath)` — запускает `whisper` через `child_process.spawn`, модель `base`; обновляет статус `IN_PROGRESS` → `DONE`/`FAILED` через `PrismaService`
- [ ] В `UploadFileHandler.execute()` после `prisma.meetingFile.create()`: если mimeType `audio/mpeg` или `video/mp4` — установить `transcriptionStatus: PENDING`, иначе `SKIPPED`; вызвать `transcriptionService.transcribeFile()` через `setImmediate` (без await)
- [ ] Обновить `FILE_SELECT` во всех handler-ах (`upload-file`, `get-meeting-files`, `get-file`) — добавить `transcriptionStatus`, `transcript`, `transcriptionError`
- [ ] e2e-тест: загрузка mp3 → ответ содержит `transcriptionStatus: 'PENDING'`; загрузка pdf → `transcriptionStatus: 'SKIPPED'`

**Когда готова:** `POST /meetings/:id/files` с mp3 возвращает `transcriptionStatus: "PENDING"` и Whisper запускается в фоне; `GET /meetings/:id/files` возвращает актуальный статус и `transcript`

---

### Фаза 2: Frontend — показ статуса и polling

**Цель:** Отобразить статус транскрибации рядом с каждым файлом, polling пока хотя бы один файл в `PENDING`/`IN_PROGRESS`, показать текст при `DONE`.

**Затрагивает:** frontend

**Задачи:**

- [ ] Обновить тип `MeetingFile` в `apps/web/src/lib/types.ts` — добавить `transcriptionStatus: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED' | 'SKIPPED'`, `transcript: string | null`, `transcriptionError: string | null`
- [ ] В `meeting-page.tsx` добавить polling: `useEffect` с `setInterval(loadFiles, 3000)` активен пока хотя бы один файл имеет статус `PENDING` или `IN_PROGRESS`; остановить интервал при размонтировании
- [ ] В `file-row.tsx` добавить блок статуса транскрибации под строкой с именем файла: badge/лейбл для каждого статуса (`PENDING` — «Ожидает», `IN_PROGRESS` — спиннер + «Транскрибация...», `DONE` — «Готово», `FAILED` — «Ошибка»); блок показывается только для mp3/mp4
- [ ] В `file-row.tsx` при статусе `DONE` показать раскрывающийся блок с текстом `transcript` (HTML `<details>` или кнопка «Показать транскрипцию»)
- [ ] Визуальная проверка через Playwright MCP: загрузить mp3, убедиться что статус меняется с `PENDING` → `IN_PROGRESS` → `DONE` и текст появляется

**Когда готова:** Пользователь видит актуальный статус транскрибации без перезагрузки страницы; при `DONE` доступен текст транскрипции
