import * as fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

const TEST_UPLOAD_DIR = './uploads-test-avatar'

describe('Avatar Upload (e2e)', () => {
  let app: NestFastifyApplication
  let prisma: PrismaService
  let token: string

  const userCredentials = { email: 'avataruser@example.com', password: 'Password1!' }

  beforeAll(async () => {
    process.env['UPLOAD_DIR'] = TEST_UPLOAD_DIR

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
    // 512-byte limit позволяет тестировать превышение размера с маленькими буферами
    await app.register(import('@fastify/multipart'), {
      limits: { fileSize: 512, files: 1 },
    })
    await app.getHttpAdapter().getInstance().ready()

    prisma = app.get(PrismaService)
    await prisma.user.deleteMany({ where: { email: userCredentials.email } })

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(userCredentials)
      .expect(201)

    token = res.body.token
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: userCredentials.email } })
    await app.close()
    fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true })
  })

  describe('POST /users/me/avatar', () => {
    it('201: image/jpeg загружается, возвращает avatarUrl', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake jpeg'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201)

      expect(res.body).toHaveProperty('avatarUrl')
      expect(res.body.avatarUrl).toMatch(/\/uploads\/avatars\/.+\.jpg$/)
    })

    it('201: image/png загружается успешно', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake png'), {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(201)

      expect(res.body.avatarUrl).toMatch(/\.png$/)
    })

    it('201: image/webp загружается успешно', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('fake webp'), {
          filename: 'photo.webp',
          contentType: 'image/webp',
        })
        .expect(201)

      expect(res.body.avatarUrl).toMatch(/\.webp$/)
    })

    it('201: avatarUrl обновляется в профиле пользователя', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('img'), {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201)

      const profileRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(profileRes.body.avatarUrl).toBe(uploadRes.body.avatarUrl)
    })

    it('201: файл физически создаётся в UPLOAD_DIR/avatars/', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('disk check'), {
          filename: 'check.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201)

      const avatarUrl: string = res.body.avatarUrl
      const fileName = avatarUrl.split('/').pop()!
      const filePath = `${TEST_UPLOAD_DIR}/avatars/${fileName}`
      expect(fs.existsSync(filePath)).toBe(true)
    })

    it('400: неразрешённый mime-тип возвращает ошибку', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.from('pdf content'), {
          filename: 'doc.pdf',
          contentType: 'application/pdf',
        })
        .expect(400)

      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toMatch(/application\/pdf/)
    })

    it('400: файл > 512 байт (лимит теста) возвращает ошибку о размере', async () => {
      const res = await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('file', Buffer.alloc(600, 'x'), {
          filename: 'big.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400)

      expect(res.body).toHaveProperty('message')
      expect(res.body.message).toMatch(/size|limit|large/i)
    })

    it('406: запрос без multipart тела возвращает ошибку', async () => {
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .expect(406)
    })

    it('401: запрос без токена', async () => {
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .attach('file', Buffer.from('img'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(401)
    })
  })
})
