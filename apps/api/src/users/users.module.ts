import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { PrismaModule } from '../prisma/prisma.module'
import { CreateUserHandler } from './handlers/create-user.handler'
import { FindUserByEmailHandler } from './handlers/find-user-by-email.handler'
import { GetMeHandler } from './handlers/get-me.handler'
import { UpdateProfileHandler } from './handlers/update-profile.handler'
import { UploadAvatarHandler } from './handlers/upload-avatar.handler'
import { UsersController } from './users.controller'

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [UsersController],
  providers: [
    CreateUserHandler,
    FindUserByEmailHandler,
    GetMeHandler,
    UpdateProfileHandler,
    UploadAvatarHandler,
    JwtGuard,
  ],
})
export class UsersModule {}
