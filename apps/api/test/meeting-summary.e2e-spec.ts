import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { ClaudeAgentService } from '../src/claude-agent/claude-agent.service'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { TranscriptionStatus } from '../generated/prisma/client'

const VALID_CLAUDE_RESPONSE = JSON.stringify({
  summary: 'Test meeting summary',
  actionItems: [{ task: 'Follow up', assignee: 'Alice' }],
  decisions: ['Use TypeScript', 'Weekly syncs'],
})

describe('MeetingSummary (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let ownerToken: string
  let strangerToken: string
  let meetingId: string
  let meetingWithNoFilesId: string

  const ownerCredentials = { email: 'summaryowner@example.com', password: 'Password1!' }
  const strangerCredentials = { email: 'summarystranger@example.com', password: 'Password1!' }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    await app.register(import('@fastify/cookie'))
    await app.getHttpAdapter().getInstance().ready()

    prisma = app.get(PrismaService)

    await prisma.meetingSummary.deleteMany()
    await prisma.meetingFile.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany({
      where: { email: { in: [ownerCredentials.email, strangerCredentials.email] } },
    })

    const ownerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(ownerCredentials)
      .expect(201)
    ownerToken = ownerRes.body.token

    const strangerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(strangerCredentials)
      .expect(201)
    strangerToken = strangerRes.body.token

    // meeting with a DONE transcription file
    const meetingRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Summary Meeting', date: '2026-06-01T10:00:00.000Z', participants: [] })
      .expect(201)
    meetingId = meetingRes.body.id

    await prisma.meetingFile.create({
      data: {
        meetingId,
        originalName: 'recording.mp3',
        mimeType: 'audio/mpeg',
        size: 1024,
        filePath: '/uploads/recording.mp3',
        transcriptionStatus: TranscriptionStatus.DONE,
        transcript:
          'Alice: Let us use TypeScript. Bob: Agreed. Follow up next week assigned to Alice.',
      },
    })

    // meeting with no DONE files
    const noFilesRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'No Files Meeting', date: '2026-06-02T10:00:00.000Z', participants: [] })
      .expect(201)
    meetingWithNoFilesId = noFilesRes.body.id
  })

  afterAll(async () => {
    await prisma.meetingSummary.deleteMany()
    await prisma.meetingFile.deleteMany()
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany({
      where: { email: { in: [ownerCredentials.email, strangerCredentials.email] } },
    })
    await app.close()
  })

  describe('POST /meetings/:id/summary', () => {
    it('202: запускает генерацию для встречи с DONE файлами', async () => {
      jest.spyOn(app.get(ClaudeAgentService), 'ask').mockResolvedValueOnce(VALID_CLAUDE_RESPONSE)

      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/summary`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(202)

      expect(res.body).toEqual({ message: 'Генерация запущена' })
    })

    it('400: нет завершённых транскрипций', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingWithNoFilesId}/summary`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400)
    })

    it('404: не владелец встречи получает 404', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/summary`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer()).post(`/meetings/${meetingId}/summary`).expect(401)
    })
  })

  describe('GET /meetings/:id/summary', () => {
    it('200: возвращает запись выжимки со статусом', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/summary`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)

      expect(res.body).toHaveProperty('status')
      expect(res.body).toHaveProperty('meetingId', meetingId)
    })

    it('404: чужая встреча не раскрывается', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/summary`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer()).get(`/meetings/${meetingId}/summary`).expect(401)
    })
  })

  describe('POST /meetings/:id/summary — повторная генерация', () => {
    it('202: повторный вызов перезаписывает предыдущий результат', async () => {
      const newResponse = JSON.stringify({
        summary: 'Updated summary',
        actionItems: [],
        decisions: ['New decision'],
      })

      jest.spyOn(app.get(ClaudeAgentService), 'ask').mockResolvedValueOnce(newResponse)

      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/summary`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(202)

      // give the async generation a moment to complete
      await new Promise((resolve) => setTimeout(resolve, 200))

      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/summary`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)

      expect(res.body.summary).toBe('Updated summary')
    })
  })
})
