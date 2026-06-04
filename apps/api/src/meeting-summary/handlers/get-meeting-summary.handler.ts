import { NotFoundException } from '@nestjs/common'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { MeetingSummary } from '../../../generated/prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { GetMeetingSummaryQuery } from '../queries/get-meeting-summary.query'

@QueryHandler(GetMeetingSummaryQuery)
export class GetMeetingSummaryHandler implements IQueryHandler<GetMeetingSummaryQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMeetingSummaryQuery): Promise<MeetingSummary> {
    const meetingSummary = await this.prisma.meetingSummary.findFirst({
      where: { meetingId: query.meetingId },
      include: { meeting: true },
    })

    if (!meetingSummary || meetingSummary.meeting.ownerId !== query.userId) {
      throw new NotFoundException('Meeting summary not found')
    }

    return meetingSummary
  }
}
