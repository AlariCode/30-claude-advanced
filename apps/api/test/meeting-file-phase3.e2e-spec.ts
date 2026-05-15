import * as fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_UPLOAD_DIR = './uploads-test-phase3'

describe('MeetingFiles Phase 3 — Files Panel (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let ownerToken: string
  let participantToken: string
  let strangerToken: string
  let meetingId: string
  let fileId: string

  const ownerCredentials = { email: 'phase3owner@example.com', password: 'Password1!' }
  const participantCredentials = { email: 'phase3participant@example.com', password: 'Password1!' }
  const strangerCredentials = { email: 'phase3stranger@example.com', password: 'Password1!' }

  beforeAll(async () => {
    process.env['UPLOAD_DIR'] = TEST_UPLOAD_DIR

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    await app.register(import('@fastify/multipart'), {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
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
        title: 'Фаза 3 встреча',
        date: '2026-07-01T10:00:00.000Z',
        participants: [participantCredentials.email],
      })
      .expect(201)
    meetingId = meetingRes.body.id

    const uploadRes = await request(app.getHttpServer())
      .post(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('phase 3 file content'), {
        filename: 'report.pdf',
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

  describe('GET /meetings/:id/files — отображение списка файлов', () => {
    it('200: владелец получает список файлов с полными метаданными', async () => {
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
        originalName: 'report.pdf',
        mimeType: 'application/pdf',
      })
      expect(typeof file.size).toBe('number')
      expect(file.size).toBeGreaterThan(0)
      expect(file).toHaveProperty('uploadedAt')
      expect(file).not.toHaveProperty('filePath')
    })

    it('200: список отсортирован по дате загрузки (свежие первыми)', async () => {
      const secondUpload = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('second file'), {
          filename: 'notes.txt',
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

    it('404: не-владелец (участник) не может получить список файлов', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(404)
    })

    it('404: посторонний пользователь не может получить список файлов', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404)
    })

    it('401: запрос без токена возвращает 401', async () => {
      await request(app.getHttpServer()).get(`/meetings/${meetingId}/files`).expect(401)
    })

    it('404: несуществующий meetingId возвращает 404', async () => {
      await request(app.getHttpServer())
        .get('/meetings/nonexistent-meeting-id/files')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404)
    })
  })

  describe('Права доступа — скачивание и удаление файлов', () => {
    it('404: участник не может скачать файл', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(404)
    })

    it('404: посторонний не может скачать файл', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404)
    })

    it('403: участник не может удалить файл', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${fileId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(403)
    })

    it('403: посторонний не может удалить файл', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${fileId}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(403)
    })

    it('200: владелец может скачать файл', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .buffer(true)
        .expect(200)

      expect(Buffer.from(res.body as ArrayBuffer).toString()).toBe('phase 3 file content')
      expect(res.headers['content-disposition']).toMatch(/attachment/)
      expect(res.headers['content-type']).toMatch(/application\/pdf/)
    })

    it('204: владелец может удалить файл — он исчезает из списка', async () => {
      const tempUpload = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('temp'), {
          filename: 'temp.txt',
          contentType: 'text/plain',
        })
        .expect(201)

      const tempId = tempUpload.body.id

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${tempId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204)

      const listRes = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)

      const ids = listRes.body.map((f: { id: string }) => f.id)
      expect(ids).not.toContain(tempId)
    })
  })
})
