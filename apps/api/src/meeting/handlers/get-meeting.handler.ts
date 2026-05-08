import { NotFoundException } from '@nestjs/common'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { GetMeetingQuery } from '../queries/get-meeting.query'

@QueryHandler(GetMeetingQuery)
export class GetMeetingHandler implements IQueryHandler<GetMeetingQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMeetingQuery) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: query.id, ownerId: query.ownerId },
    })

    if (!meeting) {
      throw new NotFoundException(`Meeting not found`)
    }

    return meeting
  }
}
