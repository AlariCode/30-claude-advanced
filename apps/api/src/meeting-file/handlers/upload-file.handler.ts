import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { BadRequestException } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { UploadFileCommand } from '../commands/upload-file.command'

@CommandHandler(UploadFileCommand)
export class UploadFileHandler implements ICommandHandler<UploadFileCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UploadFileCommand) {
    const { meetingId, originalName, mimeType, fileStream } = command

    const uploadDir = process.env['UPLOAD_DIR'] ?? './uploads'
    const fileId = randomUUID()
    const dir = path.join(uploadDir, 'meetings', meetingId, fileId)
    await fs.promises.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, originalName)

    try {
      await pipeline(fileStream, fs.createWriteStream(filePath))
    } catch (err) {
      await fs.promises.unlink(filePath).catch(() => null)
      if ((err as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new BadRequestException('File size exceeds the limit')
      }
      throw err
    }

    // @fastify/multipart sets truncated=true when fileSize limit is hit without throwing
    if ((fileStream as Readable & { truncated?: boolean }).truncated) {
      await fs.promises.unlink(filePath).catch(() => null)
      throw new BadRequestException('File size exceeds the limit')
    }

    const stat = await fs.promises.stat(filePath)

    let record
    try {
      record = await this.prisma.meetingFile.create({
        data: { meetingId, originalName, mimeType, size: stat.size, filePath },
      })
    } catch (err) {
      await fs.promises.unlink(filePath).catch(() => null)
      throw err
    }

    return record
  }
}
