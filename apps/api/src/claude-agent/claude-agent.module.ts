import { Module } from '@nestjs/common'
import { ClaudeAgentService } from './claude-agent.service'

@Module({
  providers: [
    {
      provide: ClaudeAgentService,
      useFactory: () =>
        new ClaudeAgentService({
          baseUrl: process.env.ANTHROPIC_BASE_URL ?? '',
          authToken: process.env.ANTHROPIC_API_KEY ?? '',
        }),
    },
  ],
  exports: [ClaudeAgentService],
})
export class ClaudeAgentModule {}
