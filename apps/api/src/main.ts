import 'dotenv/config'
import * as fs from 'fs'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap() {
  const uploadDir = process.env['UPLOAD_DIR'] ?? './uploads'
  await fs.promises.mkdir(uploadDir, { recursive: true })

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
  await app.register(import('@fastify/cors'), {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  await app.register(import('@fastify/multipart'), {
    limits: { fileSize: 100 * 1_024 * 1_024, files: 1 },
  })
  await app.listen(3001, '0.0.0.0')
}

bootstrap()
