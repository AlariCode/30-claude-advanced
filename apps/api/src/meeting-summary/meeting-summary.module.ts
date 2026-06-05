import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { ClaudeAgentModule } from '../claude-agent/claude-agent.module'
import { TaskModule } from '../task/task.module'
import { GenerateSummaryHandler } from './handlers/generate-summary.handler'
import { GetMeetingSummaryHandler } from './handlers/get-meeting-summary.handler'
import { MeetingSummaryController } from './meeting-summary.controller'
import { MeetingSummaryService } from './meeting-summary.service'

@Module({
  imports: [CqrsModule, ClaudeAgentModule, TaskModule],
  controllers: [MeetingSummaryController],
  providers: [JwtGuard, MeetingSummaryService, GenerateSummaryHandler, GetMeetingSummaryHandler],
})
export class MeetingSummaryModule {}
