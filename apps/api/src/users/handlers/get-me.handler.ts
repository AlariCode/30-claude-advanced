import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { GetMeQuery } from '../queries/get-me.query'
import { UserProfile } from '../types'

@QueryHandler(GetMeQuery)
export class GetMeHandler implements IQueryHandler<GetMeQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMeQuery): Promise<UserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id: query.userId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    })
  }
}
