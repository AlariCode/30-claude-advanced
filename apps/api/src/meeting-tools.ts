import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk'
import { Logger } from '@nestjs/common'
import { z } from 'zod'
import { Prisma, SummaryStatus, TaskStatus } from '../generated/prisma/client'
import { PrismaService } from './prisma/prisma.service'
import { TaskService } from './task/task.service'

const logger = new Logger('MeetingTools')

const textContent = (text: string) => ({ content: [{ type: 'text' as const, text }] })

const findTasksTool = (taskService: TaskService, meetingId: string) =>
  tool(
    'find_tasks',
    'Search tasks by text similarity within the current meeting. Read-only.',
    { query: z.string().describe('Search string to match against task titles') },
    async ({ query }) => {
      logger.log(`find_tasks called — meetingId=${meetingId} query="${query}"`)
      const tasks = await taskService.search(query, meetingId)
      logger.log(`find_tasks result — ${tasks.length} task(s) found`)
      return textContent(JSON.stringify(tasks))
    },
    { annotations: { readOnlyHint: true } },
  )

const upsertTaskTool = (taskService: TaskService, meetingId: string) =>
  tool(
    'upsert_task',
    'Create or update a task within the current meeting.',
    {
      title: z.string().describe('Task title'),
      status: z.enum(['OPEN', 'DONE']).optional().describe('Task status (defaults to OPEN)'),
    },
    async ({ title, status }) => {
      logger.log(
        `upsert_task called — meetingId=${meetingId} title="${title}" status=${status ?? 'OPEN'}`,
      )
      const task = await taskService.upsert({
        title,
        sourceMeetingId: meetingId,
        status: status as TaskStatus | undefined,
      })
      logger.log(`upsert_task result — id=${task.id} status=${task.status}`)
      return textContent(JSON.stringify(task))
    },
  )

const updateMeetingTool = (prisma: PrismaService, meetingId: string) =>
  tool(
    'update_meeting',
    'Write summary text and decisions list to the current meeting summary record.',
    {
      summary: z.string().describe('Plain-text meeting summary'),
      decisions: z.array(z.string()).describe('List of decisions made during the meeting'),
    },
    async ({ summary, decisions }) => {
      logger.log(
        `update_meeting called — meetingId=${meetingId} decisions=${decisions.length} summaryLength=${summary.length}`,
      )
      const meetingSummary = await prisma.meetingSummary.upsert({
        where: { meetingId },
        create: {
          meetingId,
          summary,
          decisions: decisions as unknown as Prisma.InputJsonValue,
          status: SummaryStatus.DONE,
          actionItems: Prisma.JsonNull,
        },
        update: {
          summary,
          decisions: decisions as unknown as Prisma.InputJsonValue,
          status: SummaryStatus.DONE,
        },
      })
      logger.log(
        `update_meeting result — summaryId=${meetingSummary.id} status=${meetingSummary.status}`,
      )
      return textContent(JSON.stringify(meetingSummary))
    },
  )

export function createMeetingMcpServer(
  taskService: TaskService,
  prisma: PrismaService,
  meetingId: string,
) {
  return createSdkMcpServer({
    name: 'meeting',
    tools: [
      findTasksTool(taskService, meetingId),
      upsertTaskTool(taskService, meetingId),
      updateMeetingTool(prisma, meetingId),
    ],
  })
}
