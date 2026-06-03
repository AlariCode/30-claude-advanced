import { Module } from '@nestjs/common'
import { ClaudeAgentService } from './claude-agent.service'

@Module({
  providers: [
    {
      provide: ClaudeAgentService,
      useFactory: () =>
        new ClaudeAgentService({
          baseUrl: process.env.ANTHROPIC_BASE_URL ?? '',
          authToken: process.env.ANTHROPIC_AUTH_TOKEN ?? '',
        }),
    },
  ],
  exports: [ClaudeAgentService],
})
export class ClaudeAgentModule {}
