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
  let token: string
  let meetingId: string

  const userCredentials = { email: 'fileuser@example.com', password: 'Password1!' }

  beforeAll(async () => {
    process.env['UPLOAD_DIR'] = TEST_UPLOAD_DIR

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()

    // Register multipart with a small fileSize limit (200 bytes) to test size validation
    await app.register(import('@fastify/multipart'), {
      limits: { fileSize: 200, files: 1 },
    })

    await app.getHttpAdapter().getInstance().ready()

    prisma = app.get(PrismaService)
    await prisma.meetingFile.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany()

    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userCredentials)
      .expect(201)
    token = authRes.body.token

    const meetingRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Тест встреча', date: '2026-06-01T10:00:00.000Z', participants: [] })
      .expect(201)
    meetingId = meetingRes.body.id
  })

  afterAll(async () => {
    await prisma.meetingFile.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany()
    await app.close()
    fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true })
  })

  describe('POST /meetings/:id/files', () => {
    it('201: загружает файл и возвращает метаданные без filePath', async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('hello'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
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

    it('400: недопустимый MIME-тип — возвращает 400', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake image'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400)
    })

    it('400: файл превышает лимит размера — возвращает 400', async () => {
      const oversizedContent = Buffer.alloc(300, 'a')
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', oversizedContent, {
          filename: 'big.txt',
          contentType: 'text/plain',
        })
        .expect(400)
    })

    it('404: несуществующая встреча — возвращает 404', async () => {
      await request(app.getHttpServer())
        .post('/meetings/nonexistent-id/files')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('hello'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .attach('file', Buffer.from('hello'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        })
        .expect(401)
    })
  })

  describe('GET /meetings/:id/files', () => {
    it('200: возвращает список файлов без filePath', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
      expect(res.body[0]).toMatchObject({
        originalName: 'test.txt',
        mimeType: 'text/plain',
        meetingId,
      })
      expect(res.body[0]).toHaveProperty('id')
      expect(res.body[0]).toHaveProperty('size')
      expect(res.body[0]).not.toHaveProperty('filePath')
    })

    it('200: загруженный файл появляется в списке', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('second file'), {
          filename: 'second.txt',
          contentType: 'text/plain',
        })
        .expect(201)

      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      const names = res.body.map((f: { originalName: string }) => f.originalName)
      expect(names).toContain('second.txt')
    })

    it('404: несуществующая встреча — возвращает 404', async () => {
      await request(app.getHttpServer())
        .get('/meetings/nonexistent-id/files')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer()).get(`/meetings/${meetingId}/files`).expect(401)
    })
  })

  describe('Сохранение на диск', () => {
    it('файл физически создаётся в UPLOAD_DIR после загрузки', async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('disk check'), {
          filename: 'disk.txt',
          contentType: 'text/plain',
        })
        .expect(201)

      // filePath не в ответе — проверяем через БД напрямую
      const record = await prisma.meetingFile.findUnique({ where: { id: res.body.id } })
      expect(record).not.toBeNull()
      expect(fs.existsSync(record!.filePath)).toBe(true)
    })
  })
})
