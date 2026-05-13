import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { MeetingModule } from './meeting/meeting.module'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, MeetingModule],
})
export class AppModule {}
