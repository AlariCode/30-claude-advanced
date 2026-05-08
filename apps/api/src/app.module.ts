import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { MeetingModule } from './meeting/meeting.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [PrismaModule, AuthModule, MeetingModule],
})
export class AppModule {}
