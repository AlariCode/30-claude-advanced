import { Logger } from '@nestjs/common'
import {
  HookCallback,
  HookCallbackMatcher,
  PostToolUseHookInput,
  PreToolUseHookInput,
} from '@anthropic-ai/claude-agent-sdk'

const logger = new Logger('MeetingHooks')

const UPSERT_TASK_TOOL = 'mcp__meeting__upsert_task'
const TOOL_CALL_LIMIT = 20

export const preToolUseGuard: HookCallback = async (input) => {
  const hookInput = input as PreToolUseHookInput
  if (hookInput.tool_name !== UPSERT_TASK_TOOL) {
    return { continue: true }
  }

  const toolInput = hookInput.tool_input as Record<string, unknown>
  const title = typeof toolInput?.title === 'string' ? toolInput.title : ''

  if (title.length < 3) {
    const reason =
      title.length === 0
        ? 'Поле title обязательно и не может быть пустым'
        : `Поле title слишком короткое: "${title}" (${title.length} симв.). Минимум — 3 символа`

    logger.warn(`preToolUseGuard blocked ${UPSERT_TASK_TOOL}: ${reason}`)

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse' as const,
        permissionDecision: 'deny' as const,
        permissionDecisionReason: reason,
      },
    }
  }

  return { continue: true }
}

export function createCallBudget(limitOverride?: number): HookCallback {
  const limit = limitOverride ?? TOOL_CALL_LIMIT
  let callCount = 0

  return async () => {
    callCount += 1
    logger.debug(`callBudget: вызов инструмента №${callCount} из ${limit}`)

    if (callCount > limit) {
      const reason = `Превышен лимит вызовов инструментов: ${callCount - 1} из ${limit} исчерпаны`
      logger.warn(`callBudget blocked: ${reason}`)

      return {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse' as const,
          permissionDecision: 'deny' as const,
          permissionDecisionReason: reason,
        },
      }
    }

    return { continue: true }
  }
}

export const auditLog: HookCallback = async (input) => {
  const hookInput = input as PostToolUseHookInput

  logger.log(
    [
      `[audit] tool=${hookInput.tool_name}`,
      `input=${JSON.stringify(hookInput.tool_input)}`,
      `response=${JSON.stringify(hookInput.tool_response)}`,
    ].join(' | '),
  )

  return { continue: true }
}

export function buildMeetingHooks(toolCallLimitOverride?: number): {
  PreToolUse: HookCallbackMatcher[]
  PostToolUse: HookCallbackMatcher[]
} {
  return {
    PreToolUse: [{ hooks: [preToolUseGuard, createCallBudget(toolCallLimitOverride)] }],
    PostToolUse: [{ hooks: [auditLog] }],
  }
}
