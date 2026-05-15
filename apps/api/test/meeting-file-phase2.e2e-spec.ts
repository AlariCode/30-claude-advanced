import * as fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_UPLOAD_DIR = './uploads-test-phase2'

describe('MeetingFiles Phase 2 (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let token: string
  let otherToken: string
  let meetingId: string
  let fileId: string

  const userCredentials = { email: 'phase2user@example.com', password: 'Password1!' }
  const otherUserCredentials = { email: 'phase2other@example.com', password: 'Password1!' }

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
      where: { email: { in: [userCredentials.email, otherUserCredentials.email] } },
    })

    const authRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userCredentials)
      .expect(201)
    token = authRes.body.token

    const otherRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(otherUserCredentials)
      .expect(201)
    otherToken = otherRes.body.token

    const meetingRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Фаза 2 встреча', date: '2026-06-01T10:00:00.000Z', participants: [] })
      .expect(201)
    meetingId = meetingRes.body.id

    const uploadRes = await request(app.getHttpServer())
      .post(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('test file content'), {
        filename: 'sample.txt',
        contentType: 'text/plain',
      })
      .expect(201)
    fileId = uploadRes.body.id
  })

  afterAll(async () => {
    await prisma.meetingFile.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany({
      where: { email: { in: [userCredentials.email, otherUserCredentials.email] } },
    })
    await app.close()
    fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true })
  })

  describe('GET /meetings/:id/files/:fileId/download', () => {
    it('200: возвращает файл с корректным Content-Disposition', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.headers['content-disposition']).toMatch(/attachment/)
      expect(res.headers['content-disposition']).toMatch(/sample\.txt/)
      expect(res.headers['content-disposition']).toMatch(/filename\*=UTF-8/)
      expect(res.headers['content-type']).toMatch(/text\/plain/)
    })

    it('200: тело ответа содержит содержимое файла', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${token}`)
        .buffer(true)
        .expect(200)

      expect(res.text).toBe('test file content')
    })

    it('404: несуществующий fileId', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/nonexistent-id/download`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })

    it('404: чужой пользователь не может скачать файл', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404)
    })

    it('404: файл удалён с диска — возвращает 404', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
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
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .expect(401)
    })
  })

  describe('DELETE /meetings/:id/files/:fileId', () => {
    let deleteFileId: string

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('to be deleted'), {
          filename: 'deleteme.txt',
          contentType: 'text/plain',
        })
        .expect(201)
      deleteFileId = res.body.id
    })

    it('204: владелец удаляет файл — файл исчезает из БД и с диска', async () => {
      const record = await prisma.meetingFile.findUnique({ where: { id: deleteFileId } })
      const filePath = record!.filePath

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${deleteFileId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204)

      const deleted = await prisma.meetingFile.findUnique({ where: { id: deleteFileId } })
      expect(deleted).toBeNull()
      expect(fs.existsSync(filePath)).toBe(false)
    })

    it('403: чужой пользователь не может удалить файл', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${deleteFileId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403)

      const record = await prisma.meetingFile.findUnique({ where: { id: deleteFileId } })
      expect(record).not.toBeNull()
    })

    it('404: несуществующий fileId', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/nonexistent-id`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${deleteFileId}`)
        .expect(401)
    })
  })
})
