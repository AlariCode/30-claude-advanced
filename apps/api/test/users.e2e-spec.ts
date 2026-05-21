import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Users (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let token: string

  const userCredentials = { email: 'profileuser@example.com', password: 'Password1!' }

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

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userCredentials)
      .expect(201)

    token = res.body.token
  })

  afterAll(async () => {
    await prisma.user.deleteMany()
    await app.close()
  })

  describe('GET /users/me', () => {
    it('200: возвращает профиль текущего пользователя', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body).toMatchObject({
        email: userCredentials.email,
      })
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('email')
      expect(res.body).toHaveProperty('name')
      expect(res.body).toHaveProperty('avatarUrl')
    })

    it('401: без токена', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401)
    })
  })

  describe('PATCH /users/me', () => {
    it('200: обновляет имя пользователя', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Иван Петров' })
        .expect(200)

      expect(res.body).toMatchObject({
        email: userCredentials.email,
        name: 'Иван Петров',
      })
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('avatarUrl')
    })

    it('400: невалидное тело — name не строка', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 123 })
        .expect(400)
    })

    it('401: без токена', async () => {
      await request(app.getHttpServer()).patch('/users/me').send({ name: 'Test' }).expect(401)
    })
  })
})
