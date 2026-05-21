import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { PrismaModule } from '../prisma/prisma.module'
import { CreateUserHandler } from './handlers/create-user.handler'
import { FindUserByEmailHandler } from './handlers/find-user-by-email.handler'
import { GetMeHandler } from './handlers/get-me.handler'
import { UpdateProfileHandler } from './handlers/update-profile.handler'

@Module({
  imports: [CqrsModule, PrismaModule],
  providers: [CreateUserHandler, FindUserByEmailHandler, GetMeHandler, UpdateProfileHandler],
})
export class UsersModule {}
