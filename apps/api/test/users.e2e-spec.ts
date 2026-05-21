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

  describe('POST /users/me/change-password', () => {
    const changePasswordEmail = 'changepwuser@example.com'
    const originalPassword = 'OldPass1!'
    let changeToken: string

    beforeAll(async () => {
      await prisma.user.deleteMany({ where: { email: changePasswordEmail } })
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: changePasswordEmail, password: originalPassword })
        .expect(201)
      changeToken = res.body.token
    })

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { email: changePasswordEmail } })
    })

    it('200: верный старый пароль — пароль успешно сменён', async () => {
      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .set('Authorization', `Bearer ${changeToken}`)
        .send({ oldPassword: originalPassword, newPassword: 'NewPass1!' })
        .expect(200)
    })

    it('200: после смены пароля можно войти с новым паролем', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'changepw2@example.com', password: 'InitPass1!' })
        .expect(201)

      const loginRes1 = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'changepw2@example.com', password: 'InitPass1!' })
        .expect(200)

      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .set('Authorization', `Bearer ${loginRes1.body.token}`)
        .send({ oldPassword: 'InitPass1!', newPassword: 'ChangedPass1!' })
        .expect(200)

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'changepw2@example.com', password: 'ChangedPass1!' })
        .expect(200)

      await prisma.user.deleteMany({ where: { email: 'changepw2@example.com' } })
    })

    it('400: неверный старый пароль — возвращает ошибку', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'changepw3@example.com', password: 'MyPass1!' })
        .expect(201)

      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .set('Authorization', `Bearer ${res.body.token}`)
        .send({ oldPassword: 'WrongPass1!', newPassword: 'NewPass1!' })
        .expect(400)

      await prisma.user.deleteMany({ where: { email: 'changepw3@example.com' } })
    })

    it('400: невалидное тело — newPassword отсутствует', async () => {
      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .set('Authorization', `Bearer ${changeToken}`)
        .send({ oldPassword: 'NewPass1!' })
        .expect(400)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer())
        .post('/users/me/change-password')
        .send({ oldPassword: originalPassword, newPassword: 'NewPass1!' })
        .expect(401)
    })
  })
})
