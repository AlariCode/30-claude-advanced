import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateProfileCommand } from '../commands/update-profile.command'
import { UserProfile } from '../types'

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateProfileCommand): Promise<UserProfile> {
    const data: { name?: string; avatarUrl?: string } = {}
    if (command.name !== undefined) data.name = command.name
    if (command.avatarUrl !== undefined) data.avatarUrl = command.avatarUrl

    return this.prisma.user.update({
      where: { id: command.userId },
      data,
      select: { id: true, email: true, name: true, avatarUrl: true },
    })
  }
}
