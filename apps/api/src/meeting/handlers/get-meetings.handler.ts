import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { GetMeetingsQuery } from '../queries/get-meetings.query'

@QueryHandler(GetMeetingsQuery)
export class GetMeetingsHandler implements IQueryHandler<GetMeetingsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMeetingsQuery) {
    return this.prisma.meeting.findMany({
      where: { ownerId: query.ownerId },
      orderBy: { date: 'asc' },
    })
  }
}
