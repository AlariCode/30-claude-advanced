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

    // Delete DB record first — if disk cleanup fails, orphaned file is recoverable;
    // if we deleted disk first and DB fails, the endpoint would serve a broken record.
    await this.prisma.meetingFile.delete({ where: { id: file.id } })

    await fs.promises.unlink(file.filePath).catch(() => null)
    await fs.promises.rm(path.dirname(file.filePath), { recursive: false }).catch(() => null)
  }
}
