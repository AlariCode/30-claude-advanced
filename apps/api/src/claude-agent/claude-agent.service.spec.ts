import 'dotenv/config'
import { ClaudeAgentService } from './claude-agent.service'

const config = {
  baseUrl: process.env.ANTHROPIC_BASE_URL ?? '',
  authToken: process.env.ANTHROPIC_API_KEY ?? '',
}

describe('ClaudeAgentService (real API)', () => {
  let service: ClaudeAgentService

  beforeEach(() => {
    service = new ClaudeAgentService(config)
  })

  it('возвращает непустой ответ на простой вопрос', async () => {
    const answer = await service.ask('Столица Франции? Ответь одним словом.')

    expect(typeof answer).toBe('string')
    expect(answer.trim().length).toBeGreaterThan(0)
  }, 60_000)
})
