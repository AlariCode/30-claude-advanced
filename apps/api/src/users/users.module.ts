import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { PrismaModule } from '../prisma/prisma.module'
import { CreateUserHandler } from './handlers/create-user.handler'
import { FindUserByEmailHandler } from './handlers/find-user-by-email.handler'

@Module({
  imports: [CqrsModule, PrismaModule],
  providers: [CreateUserHandler, FindUserByEmailHandler],
})
export class UsersModule {}
