import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { McpModule } from './mcp/mcp.module'
import { MeetingFileModule } from './meeting-file/meeting-file.module'
import { MeetingModule } from './meeting/meeting.module'
import { MeetingSummaryModule } from './meeting-summary/meeting-summary.module'
import { PrismaModule } from './prisma/prisma.module'
import { TaskModule } from './task/task.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    MeetingModule,
    MeetingFileModule,
    MeetingSummaryModule,
    TaskModule,
    McpModule,
  ],
})
export class AppModule {}
