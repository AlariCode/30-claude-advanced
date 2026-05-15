import { NotFoundException } from '@nestjs/common'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { GetMeetingFilesQuery } from '../queries/get-meeting-files.query'

const FILE_SELECT = {
  id: true,
  meetingId: true,
  originalName: true,
  mimeType: true,
  size: true,
  uploadedAt: true,
}

@QueryHandler(GetMeetingFilesQuery)
export class GetMeetingFilesHandler implements IQueryHandler<GetMeetingFilesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMeetingFilesQuery) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: query.meetingId, ownerId: query.userId },
    })
    if (!meeting) throw new NotFoundException(`Meeting not found`)

    return this.prisma.meetingFile.findMany({
      where: { meetingId: query.meetingId },
      orderBy: { uploadedAt: 'desc' },
      select: FILE_SELECT,
    })
  }
}
