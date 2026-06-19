import { Module } from '@nestjs/common'
import { MeetingPrompts } from '../meeting-summary/meeting.prompts'
import { MeetingSummaryModule } from '../meeting-summary/meeting-summary.module'
import { TaskTools } from '../task/task.tools'
import { TaskModule } from '../task/task.module'
import { McpToolRegistrar, MCP_TOOL_REGISTRAR } from './mcp-tool-registrar.interface'
import { McpController } from './mcp.controller'
import { McpService } from './mcp.service'

@Module({
  imports: [TaskModule, MeetingSummaryModule],
  controllers: [McpController],
  providers: [
    {
      provide: MCP_TOOL_REGISTRAR,
      useFactory: (taskTools: TaskTools, meetingPrompts: MeetingPrompts): McpToolRegistrar[] => [
        taskTools,
        meetingPrompts,
      ],
      inject: [TaskTools, MeetingPrompts],
    },
    McpService,
  ],
})
export class McpModule {}
