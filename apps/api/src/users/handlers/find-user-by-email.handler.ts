import { IQueryHandler, QueryHandler } from '@nestjs/cqrs'
import { PrismaService } from '../../prisma/prisma.service'
import { FindUserByEmailQuery } from '../queries/find-user-by-email.query'

export interface UserRecord {
  id: string
  email: string
  password: string
}

@QueryHandler(FindUserByEmailQuery)
export class FindUserByEmailHandler implements IQueryHandler<FindUserByEmailQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindUserByEmailQuery): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email: query.email } })
  }
}
