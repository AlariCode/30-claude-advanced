import { Injectable, Logger } from '@nestjs/common'
import { query } from '@anthropic-ai/claude-agent-sdk'

export interface ClaudeAgentConfig {
  baseUrl: string
  authToken: string
}

@Injectable()
export class ClaudeAgentService {
  private readonly logger = new Logger(ClaudeAgentService.name)
  private readonly config: ClaudeAgentConfig

  constructor(config: ClaudeAgentConfig) {
    this.config = config
  }

  async ask(prompt: string): Promise<string> {
    this.logger.log(`Sending prompt to Claude Agent: ${prompt.slice(0, 80)}...`)

    const messages = query({
      prompt,
      options: {
        model: 'claude-haiku-4-5-20251001',
        maxTurns: 1,
        tools: [],
        persistSession: false,
        env: {
          ...process.env,
          ANTHROPIC_BASE_URL: this.config.baseUrl,
          ANTHROPIC_API_KEY: this.config.authToken,
        },
      },
    })

    for await (const message of messages) {
      if (message.type !== 'result') {
        continue
      }

      if (message.subtype === 'success') {
        return message.result
      }

      const errorMessage = `Claude Agent error: ${message.subtype}`
      this.logger.error(errorMessage)
      throw new Error(errorMessage)
    }

    throw new Error('Claude Agent did not return a result')
  }
}
