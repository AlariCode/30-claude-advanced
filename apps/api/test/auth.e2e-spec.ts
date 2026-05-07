import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    await app.getHttpAdapter().getInstance().ready()

    prisma = app.get(PrismaService)
    await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.user.deleteMany()
    await app.close()
  })

  describe('POST /auth/register', () => {
    it('201: создаёт пользователя и возвращает JWT-токен', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'newuser@example.com', password: 'Password1!' })
        .expect(201)

      expect(res.body).toHaveProperty('token')
      expect(typeof res.body.token).toBe('string')
      expect(res.body.token.length).toBeGreaterThan(0)
    })

    it('409: повторная регистрация с тем же email', async () => {
      const credentials = { email: 'duplicate@example.com', password: 'Password1!' }

      await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(201)

      await request(app.getHttpServer()).post('/auth/register').send(credentials).expect(409)
    })

    it('400: отсутствует email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'Password1!' })
        .expect(400)
    })

    it('400: отсутствует пароль', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'nopass@example.com' })
        .expect(400)
    })

    it('400: невалидный формат email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'Password1!' })
        .expect(400)
    })
  })

  describe('POST /auth/login', () => {
    const loginCredentials = { email: 'loginuser@example.com', password: 'Password1!' }

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/auth/register').send(loginCredentials)
    })

    it('200: возвращает JWT-токен для верных учётных данных', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginCredentials)
        .expect(200)

      expect(res.body).toHaveProperty('token')
      expect(typeof res.body.token).toBe('string')
      expect(res.body.token.length).toBeGreaterThan(0)
    })

    it('401: пользователь не найден', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password1!' })
        .expect(401)
    })

    it('401: неверный пароль', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: loginCredentials.email, password: 'WrongPass!' })
        .expect(401)
    })

    it('400: отсутствует email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'Password1!' })
        .expect(400)
    })

    it('400: отсутствует пароль', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: loginCredentials.email })
        .expect(400)
    })
  })
})
