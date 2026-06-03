import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { TranscriptionStatus } from '../../../generated/prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { TranscriptionService } from '../transcription.service'
import { UploadFileCommand } from '../commands/upload-file.command'

const FILE_SELECT = {
  id: true,
  meetingId: true,
  originalName: true,
  mimeType: true,
  size: true,
  uploadedAt: true,
  transcriptionStatus: true,
  transcript: true,
  transcriptionError: true,
}

const TRANSCRIBABLE_MIME_TYPES = ['audio/mpeg', 'video/mp4']

@CommandHandler(UploadFileCommand)
export class UploadFileHandler implements ICommandHandler<UploadFileCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transcriptionService: TranscriptionService,
  ) {}

  async execute(command: UploadFileCommand) {
    const { meetingId, userId, originalName, mimeType, fileStream } = command

    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, ownerId: userId },
    })
    if (!meeting) throw new NotFoundException(`Meeting not found`)

    const uploadDir = process.env['UPLOAD_DIR'] ?? './uploads'
    const fileId = randomUUID()
    const dir = path.resolve(uploadDir, 'meetings', meetingId, fileId)
    await fs.promises.mkdir(dir, { recursive: true })

    // path.basename prevents path traversal via crafted filename
    const safeName = path.basename(originalName)
    const filePath = path.join(dir, safeName)

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

    const isTranscribable = TRANSCRIBABLE_MIME_TYPES.includes(mimeType)

    let createdFile
    try {
      createdFile = await this.prisma.meetingFile.create({
        data: {
          meetingId,
          originalName: safeName,
          mimeType,
          size: stat.size,
          filePath,
          transcriptionStatus: isTranscribable
            ? TranscriptionStatus.PENDING
            : TranscriptionStatus.SKIPPED,
        },
        select: FILE_SELECT,
      })
    } catch (err) {
      await fs.promises.unlink(filePath).catch(() => null)
      throw err
    }

    if (isTranscribable) {
      setImmediate(() => {
        this.transcriptionService.transcribeFile(createdFile.id, filePath).catch(() => null)
      })
    }

    return createdFile
  }
}
