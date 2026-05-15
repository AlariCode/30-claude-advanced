import { NotFoundException } from '@nestjs/common'
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { GetFileQuery } from '../queries/get-file.query'

@QueryHandler(GetFileQuery)
export class GetFileHandler implements IQueryHandler<GetFileQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetFileQuery) {
    const file = await this.prisma.meetingFile.findFirst({
      where: {
        id: query.fileId,
        meetingId: query.meetingId,
        meeting: { ownerId: query.userId },
      },
    })

    if (!file) throw new NotFoundException('File not found')

    return file
  }
}
