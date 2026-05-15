import * as fs from 'fs'
import * as path from 'path'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { DeleteFileCommand } from '../commands/delete-file.command'

@CommandHandler(DeleteFileCommand)
export class DeleteFileHandler implements ICommandHandler<DeleteFileCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteFileCommand) {
    const file = await this.prisma.meetingFile.findFirst({
      where: { id: command.fileId, meetingId: command.meetingId },
      include: { meeting: true },
    })

    if (!file) throw new NotFoundException('File not found')
    if (file.meeting.ownerId !== command.userId) throw new ForbiddenException()

    await fs.promises.unlink(file.filePath).catch(() => null)
    await fs.promises.rmdir(path.dirname(file.filePath)).catch(() => null)

    await this.prisma.meetingFile.delete({ where: { id: file.id } })

    return { deleted: true }
  }
}
