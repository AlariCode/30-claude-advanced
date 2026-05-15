import * as fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_UPLOAD_DIR = './uploads-test-phase4'

describe('MeetingFiles Phase 4 — Upload UX: валидация типа и размера (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let ownerToken: string
  let meetingId: string

  const ownerCredentials = { email: 'phase4owner@example.com', password: 'Password1!' }

  beforeAll(async () => {
    process.env['UPLOAD_DIR'] = TEST_UPLOAD_DIR

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    // Small limit to test size-exceeded error without uploading 100 MB
    await app.register(import('@fastify/multipart'), {
      limits: { fileSize: 512, files: 1 },
    })
    await app.getHttpAdapter().getInstance().ready()

    prisma = app.get(PrismaService)
    await prisma.meetingFile.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany({ where: { email: ownerCredentials.email } })

    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(ownerCredentials)
      .expect(201)
    ownerToken = authRes.body.token

    const meetingRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Phase 4 тест встреча', date: '2026-08-01T10:00:00.000Z', participants: [] })
      .expect(201)
    meetingId = meetingRes.body.id
  })

  afterAll(async () => {
    await prisma.meetingFile.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany({ where: { email: ownerCredentials.email } })
    await app.close()
    fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true })
  })

  describe('Валидация типа файла', () => {
    it('400: недопустимый MIME-тип возвращает ошибку с понятным сообщением', async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('fake image data'), {
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
        .attach('file', Buffer.from('png data'), {
          filename: 'image.png',
          contentType: 'image/png',
        })
        .expect(400)

      expect(res.body.message).toMatch(/image\/png/)
    })

    it('400: application/zip отклоняется', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('zip content'), {
          filename: 'archive.zip',
          contentType: 'application/zip',
        })
        .expect(400)
    })
  })

  describe('Допустимые типы файлов загружаются успешно', () => {
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
      { filename: 'audio.wav', contentType: 'audio/wav' },
    ]

    it.each(allowedTypes)('201: $contentType принимается', async ({ filename, contentType }) => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('small content'), { filename, contentType })
        .expect(201)

      expect(res.body).toMatchObject({ originalName: filename, mimeType: contentType })
      expect(res.body).toHaveProperty('id')
      expect(res.body).not.toHaveProperty('filePath')
    })
  })

  describe('Валидация размера файла', () => {
    it('400: файл, превышающий лимит, возвращает ошибку', async () => {
      // fileSize limit is 512 bytes; this buffer is larger
      const bigBuffer = Buffer.alloc(600, 'x')

      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', bigBuffer, { filename: 'big.pdf', contentType: 'application/pdf' })
        .expect(400)

      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toMatch(/size|limit|large/i)
    })

    it('201: файл в пределах лимита загружается успешно', async () => {
      const smallBuffer = Buffer.alloc(100, 'x')

      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', smallBuffer, { filename: 'small.txt', contentType: 'text/plain' })
        .expect(201)
    })
  })

  describe('Список файлов обновляется после загрузки', () => {
    it('новый файл появляется в GET /meetings/:id/files первым (свежие первыми)', async () => {
      const before = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)

      const countBefore = (before.body as unknown[]).length

      const uploadRes = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('new file content'), {
          filename: 'new.txt',
          contentType: 'text/plain',
        })
        .expect(201)

      const after = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)

      expect((after.body as unknown[]).length).toBe(countBefore + 1)

      const ids = (after.body as Array<{ id: string }>).map((f) => f.id)
      expect(ids[0]).toBe(uploadRes.body.id)
    })
  })
})
