import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { BadRequestException } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { UploadAvatarCommand } from '../commands/upload-avatar.command'

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_SIZE = 5 * 1024 * 1024

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

@CommandHandler(UploadAvatarCommand)
export class UploadAvatarHandler implements ICommandHandler<UploadAvatarCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UploadAvatarCommand): Promise<{ avatarUrl: string }> {
    const { userId, mimeType, fileStream } = command

    if (!ALLOWED_MIMES.has(mimeType)) {
      await fileStream.resume()
      throw new BadRequestException(`File type ${mimeType} is not allowed`)
    }

    const uploadDir = process.env['UPLOAD_DIR'] ?? './uploads'
    const avatarDir = path.resolve(uploadDir, 'avatars')
    await fs.promises.mkdir(avatarDir, { recursive: true })

    const ext = MIME_TO_EXT[mimeType]
    const fileName = `${randomUUID()}.${ext}`
    const filePath = path.join(avatarDir, fileName)

    try {
      await pipeline(fileStream, fs.createWriteStream(filePath))
    } catch (err) {
      await fs.promises.unlink(filePath).catch(() => null)
      if ((err as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new BadRequestException('File size exceeds the 5 MB limit')
      }
      throw err
    }

    if ((fileStream as Readable & { truncated?: boolean }).truncated) {
      await fs.promises.unlink(filePath).catch(() => null)
      throw new BadRequestException('File size exceeds the 5 MB limit')
    }

    const stat = await fs.promises.stat(filePath)
    if (stat.size > MAX_SIZE) {
      await fs.promises.unlink(filePath).catch(() => null)
      throw new BadRequestException('File size exceeds the 5 MB limit')
    }

    const avatarUrl = `/uploads/avatars/${fileName}`

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    })

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    })

    if (existing?.avatarUrl) {
      const oldFile = path.resolve(uploadDir, existing.avatarUrl.replace(/^\//, ''))
      await fs.promises.unlink(oldFile).catch(() => null)
    }

    return { avatarUrl }
  }
}
