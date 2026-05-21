import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { GetMeQuery } from '../queries/get-me.query'
import { USER_PROFILE_SELECT, UserProfile } from '../types'

@QueryHandler(GetMeQuery)
export class GetMeHandler implements IQueryHandler<GetMeQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMeQuery): Promise<UserProfile | null> {
    return this.prisma.user.findUnique({
      where: { id: query.userId },
      select: USER_PROFILE_SELECT,
    })
  }
}
