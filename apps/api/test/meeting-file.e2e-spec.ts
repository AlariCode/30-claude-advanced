import * as fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_UPLOAD_DIR = './uploads-test'

describe('MeetingFiles (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let ownerToken: string
  let participantToken: string
  let strangerToken: string
  let meetingId: string
  let fileId: string

  const ownerCredentials = { email: 'fileowner@example.com', password: 'Password1!' }
  const participantCredentials = { email: 'fileparticipant@example.com', password: 'Password1!' }
  const strangerCredentials = { email: 'filestranger@example.com', password: 'Password1!' }

  beforeAll(async () => {
    process.env['UPLOAD_DIR'] = TEST_UPLOAD_DIR

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    // 512-byte limit lets us trigger size errors with small buffers
    await app.register(import('@fastify/multipart'), {
      limits: { fileSize: 512, files: 1 },
    })
    await app.getHttpAdapter().getInstance().ready()

    prisma = app.get(PrismaService)
    await prisma.meetingFile.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ownerCredentials.email, participantCredentials.email, strangerCredentials.email],
        },
      },
    })

    const ownerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(ownerCredentials)
      .expect(201)
    ownerToken = ownerRes.body.token

    const participantRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(participantCredentials)
      .expect(201)
    participantToken = participantRes.body.token

    const strangerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(strangerCredentials)
      .expect(201)
    strangerToken = strangerRes.body.token

    const meetingRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Тест встреча',
        date: '2026-06-01T10:00:00.000Z',
        participants: [participantCredentials.email],
      })
      .expect(201)
    meetingId = meetingRes.body.id

    const uploadRes = await request(app.getHttpServer())
      .post(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('test file content'), {
        filename: 'sample.pdf',
        contentType: 'application/pdf',
      })
      .expect(201)
    fileId = uploadRes.body.id
  })

  afterAll(async () => {
    await prisma.meetingFile.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [ownerCredentials.email, participantCredentials.email, strangerCredentials.email],
        },
      },
    })
    await app.close()
    fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true })
  })

  // ─── POST /meetings/:id/files ─────────────────────────────────────────────

  describe('POST /meetings/:id/files — загрузка файла', () => {
    it('201: возвращает метаданные без filePath', async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' })
        .expect(201)

      expect(res.body).toMatchObject({
        originalName: 'test.txt',
        mimeType: 'text/plain',
        meetingId,
      })
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('size')
      expect(res.body).toHaveProperty('uploadedAt')
      expect(res.body).not.toHaveProperty('filePath')
    })

    it('404: несуществующая встреча', async () => {
      await request(app.getHttpServer())
        .post('/meetings/nonexistent-id/files')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' })
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' })
        .expect(401)
    })
  })

  // ─── GET /meetings/:id/files ──────────────────────────────────────────────

  describe('GET /meetings/:id/files — список файлов', () => {
    it('200: владелец получает список с полными метаданными, без filePath', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)

      const file = res.body.find((f: { id: string }) => f.id === fileId)
      expect(file).toBeDefined()
      expect(file).toMatchObject({
        id: fileId,
        meetingId,
        originalName: 'sample.pdf',
        mimeType: 'application/pdf',
      })
      expect(typeof file.size).toBe('number')
      expect(file.size).toBeGreaterThan(0)
      expect(file).toHaveProperty('uploadedAt')
      expect(file).not.toHaveProperty('filePath')
    })

    it('200: отсортирован по дате загрузки (свежие первыми)', async () => {
      const secondUpload = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('second'), {
          filename: 'second.txt',
          contentType: 'text/plain',
        })
        .expect(201)

      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)

      const dates = res.body.map((f: { uploadedAt: string }) => new Date(f.uploadedAt).getTime())
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i])
      }

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${secondUpload.body.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204)
    })

    it('404: участник не может получить список', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(404)
    })

    it('404: посторонний не может получить список', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer()).get(`/meetings/${meetingId}/files`).expect(401)
    })

    it('404: несуществующий meetingId', async () => {
      await request(app.getHttpServer())
        .get('/meetings/nonexistent-meeting-id/files')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404)
    })
  })

  // ─── GET .../download ─────────────────────────────────────────────────────

  describe('GET /meetings/:id/files/:fileId/download — скачивание', () => {
    it('200: Content-Disposition и Content-Type корректны, тело содержит файл', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .buffer(true)
        .expect(200)

      expect(res.headers['content-disposition']).toMatch(/attachment/)
      expect(res.headers['content-disposition']).toMatch(/sample\.pdf/)
      expect(res.headers['content-disposition']).toMatch(/filename\*=UTF-8/)
      expect(res.headers['content-type']).toMatch(/application\/pdf/)
      expect(Buffer.from(res.body as ArrayBuffer).toString()).toBe('test file content')
    })

    it('404: несуществующий fileId', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/nonexistent-id/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404)
    })

    it('404: участник не может скачать', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(404)
    })

    it('404: посторонний не может скачать', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404)
    })

    it('404: файл удалён с диска', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('orphan'), {
          filename: 'orphan.txt',
          contentType: 'text/plain',
        })
        .expect(201)

      const orphanId = uploadRes.body.id
      const record = await prisma.meetingFile.findUnique({ where: { id: orphanId } })
      await fs.promises.unlink(record!.filePath)

      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${orphanId}/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .expect(401)
    })
  })

  // ─── DELETE .../files/:fileId ─────────────────────────────────────────────

  describe('DELETE /meetings/:id/files/:fileId — удаление', () => {
    let deleteFileId: string

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('to delete'), {
          filename: 'del.txt',
          contentType: 'text/plain',
        })
        .expect(201)
      deleteFileId = res.body.id
    })

    it('204: владелец удаляет — файл исчезает из БД, диска и списка', async () => {
      const record = await prisma.meetingFile.findUnique({ where: { id: deleteFileId } })
      const filePath = record!.filePath

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${deleteFileId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204)

      expect(await prisma.meetingFile.findUnique({ where: { id: deleteFileId } })).toBeNull()
      expect(fs.existsSync(filePath)).toBe(false)

      const listRes = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)
      expect((listRes.body as Array<{ id: string }>).map((f) => f.id)).not.toContain(deleteFileId)
    })

    it('403: участник не может удалить', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${deleteFileId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(403)

      expect(await prisma.meetingFile.findUnique({ where: { id: deleteFileId } })).not.toBeNull()
    })

    it('403: посторонний не может удалить', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${deleteFileId}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(403)
    })

    it('404: несуществующий fileId', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/nonexistent-id`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${deleteFileId}`)
        .expect(401)
    })
  })

  // ─── Валидация типа файла ─────────────────────────────────────────────────

  describe('Валидация типа файла', () => {
    it('400: image/jpeg отклоняется с понятным сообщением', async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('fake image'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400)

      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toMatch(/image\/jpeg/)
    })

    it('400: image/png отклоняется', async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('png'), { filename: 'image.png', contentType: 'image/png' })
        .expect(400)

      expect(res.body.message).toMatch(/image\/png/)
    })

    it('400: application/zip отклоняется', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('zip'), {
          filename: 'archive.zip',
          contentType: 'application/zip',
        })
        .expect(400)
    })

    const allowedTypes: Array<{ filename: string; contentType: string }> = [
      { filename: 'doc.pdf', contentType: 'application/pdf' },
      { filename: 'notes.txt', contentType: 'text/plain' },
      {
        filename: 'report.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      {
        filename: 'table.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      {
        filename: 'slides.pptx',
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      },
      { filename: 'clip.mp4', contentType: 'video/mp4' },
      { filename: 'clip.mov', contentType: 'video/quicktime' },
      { filename: 'clip.webm', contentType: 'video/webm' },
      { filename: 'audio.mp3', contentType: 'audio/mpeg' },
      { filename: 'audio.m4a', contentType: 'audio/mp4' },
      { filename: 'audio.wav', contentType: 'audio/wav' },
    ]

    it.each(allowedTypes)('201: $contentType принимается', async ({ filename, contentType }) => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('x'), { filename, contentType })
        .expect(201)

      expect(res.body).toMatchObject({ originalName: filename, mimeType: contentType })
      expect(res.body).toHaveProperty('id')
      expect(res.body).not.toHaveProperty('filePath')
    })
  })

  // ─── Валидация размера файла ──────────────────────────────────────────────

  describe('Валидация размера файла', () => {
    it('400: файл > 512 байт возвращает ошибку с сообщением', async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.alloc(600, 'x'), {
          filename: 'big.pdf',
          contentType: 'application/pdf',
        })
        .expect(400)

      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toMatch(/size|limit|large/i)
    })

    it('201: файл ≤ 512 байт загружается успешно', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.alloc(100, 'x'), {
          filename: 'small.txt',
          contentType: 'text/plain',
        })
        .expect(201)
    })
  })

  // ─── Сохранение на диск ───────────────────────────────────────────────────

  describe('Сохранение на диск', () => {
    it('файл физически создаётся в UPLOAD_DIR', async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('disk check'), {
          filename: 'disk.txt',
          contentType: 'text/plain',
        })
        .expect(201)

      const record = await prisma.meetingFile.findUnique({ where: { id: res.body.id } })
      expect(record).not.toBeNull()
      expect(fs.existsSync(record!.filePath)).toBe(true)
    })
  })

  // ─── Список файлов обновляется после загрузки ─────────────────────────────

  describe('Список файлов обновляется после загрузки', () => {
    it('новый файл появляется в списке первым', async () => {
      const before = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)

      const countBefore = (before.body as unknown[]).length

      const uploadRes = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('new file'), { filename: 'new.txt', contentType: 'text/plain' })
        .expect(201)

      const after = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)

      expect((after.body as unknown[]).length).toBe(countBefore + 1)
      expect((after.body as Array<{ id: string }>)[0].id).toBe(uploadRes.body.id)
    })
  })
})
