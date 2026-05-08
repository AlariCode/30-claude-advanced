import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateMeetingCommand } from '../commands/create-meeting.command'

@CommandHandler(CreateMeetingCommand)
export class CreateMeetingHandler implements ICommandHandler<CreateMeetingCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateMeetingCommand) {
    return this.prisma.meeting.create({
      data: {
        title: command.title,
        date: new Date(command.date),
        participants: command.participants,
        ownerId: command.ownerId,
      },
    })
  }
}
