import { Injectable, Logger } from '@nestjs/common'
import {
  HookCallbackMatcher,
  HookEvent,
  McpServerConfig,
  NonNullableUsage,
  OutputFormat,
  SDKResultMessage,
  SDKResultSuccess,
  query,
} from '@anthropic-ai/claude-agent-sdk'

export interface ClaudeAgentConfig {
  baseUrl: string
  authToken: string
}

export interface AskStructuredParams {
  systemPrompt: string
  userPrompt: string
  outputFormat: OutputFormat
  mcpServers: Record<string, McpServerConfig>
  allowedTools: string[]
  maxTurns?: number
  maxRetries?: number
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>
  runLabel?: string
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

  async askStructured<T>(params: AskStructuredParams): Promise<T> {
    const {
      systemPrompt,
      userPrompt,
      outputFormat,
      mcpServers,
      allowedTools,
      maxTurns = 50,
      maxRetries = 3,
      hooks,
      runLabel,
    } = params

    let lastError: Error = new Error('Claude Agent did not return a structured result')

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const messages = query({
          prompt: userPrompt,
          options: {
            model: 'claude-haiku-4-5-20251001',
            maxTurns,
            tools: [],
            persistSession: false,
            systemPrompt,
            mcpServers,
            allowedTools,
            outputFormat,
            strictMcpConfig: true,
            hooks,
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

          this.logRunCost(message as SDKResultMessage, runLabel)

          if (message.subtype === 'success') {
            return this.extractStructuredResult<T>(message as SDKResultSuccess)
          }

          throw new Error(`Claude Agent structured error: ${message.subtype}`)
        }

        throw new Error('Claude Agent did not return a structured result')
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.logger.warn(
          `askStructured attempt ${attempt}/${maxRetries} failed: ${lastError.message}`,
        )
      }
    }

    this.logger.error(`askStructured failed after ${maxRetries} attempts: ${lastError.message}`)
    throw lastError
  }

  private extractStructuredResult<T>(message: SDKResultSuccess): T {
    if (message.structured_output !== undefined) {
      return message.structured_output as T
    }
    const raw = message.result.trim()
    const jsonBody = raw.startsWith('```')
      ? raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      : raw
    return JSON.parse(jsonBody) as T
  }

  private logRunCost(message: SDKResultMessage, runLabel: string | undefined): void {
    const label = runLabel ? ` meetingId=${runLabel}` : ''
    const { total_cost_usd, usage } = message
    const u = usage as NonNullableUsage
    this.logger.log(
      `[cost]${label} total_cost_usd=${total_cost_usd.toFixed(6)}` +
        ` input_tokens=${u.input_tokens} output_tokens=${u.output_tokens}`,
    )
  }
}
