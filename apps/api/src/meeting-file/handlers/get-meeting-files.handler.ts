import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { GetMeetingFilesQuery } from '../queries/get-meeting-files.query'

@QueryHandler(GetMeetingFilesQuery)
export class GetMeetingFilesHandler implements IQueryHandler<GetMeetingFilesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  execute(query: GetMeetingFilesQuery) {
    return this.prisma.meetingFile.findMany({
      where: { meetingId: query.meetingId },
      orderBy: { uploadedAt: 'desc' },
    })
  }
}
