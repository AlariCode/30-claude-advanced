import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
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
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  })
  await app.register(import('@fastify/multipart'), {
    limits: { fileSize: 100 * 1_024 * 1_024, files: 1 },
  })
  await app.register(import('@fastify/static'), {
    root: path.resolve(uploadDir),
    prefix: '/uploads',
    decorateReply: false,
  })
  const port = parseInt(process.env['PORT'] ?? '3001', 10)
  if (Number.isNaN(port)) throw new Error(`Invalid PORT env var: "${process.env['PORT']}"`)
  await app.listen(port, '0.0.0.0')
}

bootstrap()
