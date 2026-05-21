import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { CreateMeetingHandler } from './handlers/create-meeting.handler'
import { GetMeetingHandler } from './handlers/get-meeting.handler'
import { GetMeetingsHandler } from './handlers/get-meetings.handler'
import { MeetingController } from './meeting.controller'

@Module({
  imports: [CqrsModule],
  controllers: [MeetingController],
  providers: [JwtGuard, CreateMeetingHandler, GetMeetingsHandler, GetMeetingHandler],
})
export class MeetingModule {}
