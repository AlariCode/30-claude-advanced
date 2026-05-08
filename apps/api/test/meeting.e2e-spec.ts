import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Meetings (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let token: string

  const userCredentials = { email: 'meetinguser@example.com', password: 'Password1!' }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    prisma = app.get(PrismaService)
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany()

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userCredentials)
      .expect(201)

    token = res.body.token
  })

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM "Meeting" WHERE TRUE`).catch(() => null)
    await prisma.user.deleteMany()
    await app.close()
  })

  // тест #1
  describe('POST /meetings', () => {
    it('201: создаёт встречу и возвращает её данные', async () => {
      const res = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Планёрка',
          date: '2026-06-01T10:00:00.000Z',
          participants: ['alice@example.com', 'bob@example.com'],
        })
        .expect(201)

      expect(res.body).toMatchObject({
        title: 'Планёрка',
        date: '2026-06-01T10:00:00.000Z',
        participants: expect.arrayContaining(['alice@example.com', 'bob@example.com']),
      })
      expect(res.body).toHaveProperty('id')
    })

    it('400: отсутствует title', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${token}`)
        .send({ date: '2026-06-01T10:00:00.000Z', participants: [] })
        .expect(400)
    })

    it('400: отсутствует date', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Без даты', participants: [] })
        .expect(400)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .send({ title: 'Анон', date: '2026-06-01T10:00:00.000Z', participants: [] })
        .expect(401)
    })
  })

  // тест #2
  describe('GET /meetings', () => {
    it('200: возвращает список встреч текущего пользователя', async () => {
      const res = await request(app.getHttpServer())
        .get('/meetings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
      expect(res.body[0]).toHaveProperty('id')
      expect(res.body[0]).toHaveProperty('title')
    })

    it('200: не возвращает встречи чужого пользователя', async () => {
      const otherRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'other@example.com', password: 'Password1!' })
        .expect(201)

      const otherToken = otherRes.body.token

      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Чужая встреча', date: '2026-07-01T10:00:00.000Z', participants: [] })
        .expect(201)

      const res = await request(app.getHttpServer())
        .get('/meetings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      const titles = res.body.map((m: { title: string }) => m.title)
      expect(titles).not.toContain('Чужая встреча')
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer()).get('/meetings').expect(401)
    })
  })

  // тест #3
  describe('GET /meetings/:id', () => {
    let meetingId: string

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Конкретная встреча', date: '2026-08-01T10:00:00.000Z', participants: [] })
        .expect(201)

      meetingId = res.body.id
    })

    it('200: возвращает встречу по ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body).toMatchObject({
        id: meetingId,
        title: 'Конкретная встреча',
      })
    })

    it('404: встреча не найдена', async () => {
      await request(app.getHttpServer())
        .get('/meetings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer()).get(`/meetings/${meetingId}`).expect(401)
    })
  })
})
