import { Injectable } from '@nestjs/common'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TaskStatus } from '../../generated/prisma/client'
import { McpToolRegistrar, Requester } from '../mcp/mcp-tool-registrar.interface'
import { PrismaService } from '../prisma/prisma.service'
import { z } from 'zod'

@Injectable()
export class MeetingPrompts implements McpToolRegistrar {
  constructor(private readonly prisma: PrismaService) {}

  register(server: McpServer, _requester: Requester): void {
    server.registerPrompt(
      'meeting_brief',
      {
        title: 'Meeting brief',
        description:
          'Load meeting data and prepare a structured overview: title, date, participants, summary, open tasks.',
        argsSchema: {
          meetingId: z.string().describe('ID of the meeting to summarize'),
        },
      },
      async ({ meetingId }) => {
        const meeting = await this.prisma.meeting.findUniqueOrThrow({
          where: { id: meetingId },
          include: { summary: true, tasks: true },
        })
        const openTaskCount = meeting.tasks.filter((t) => t.status === TaskStatus.OPEN).length
        const doneTaskCount = meeting.tasks.filter((t) => t.status === TaskStatus.DONE).length

        const lines = [
          `Meeting: ${meeting.title}`,
          `Date: ${meeting.date.toISOString()}`,
          `Participants (${meeting.participants.length}): ${meeting.participants.join(', ') || '—'}`,
          '',
          '## Summary',
          meeting.summary?.summary ?? '(not generated yet)',
          '',
          '## Decisions',
          meeting.summary?.decisions ? JSON.stringify(meeting.summary.decisions, null, 2) : '—',
          '',
          `## Tasks  (open: ${openTaskCount}, done: ${doneTaskCount})`,
          ...meeting.tasks.map((t) => `- [${t.status}] ${t.title}`),
        ]

        return {
          description: `Brief for meeting "${meeting.title}"`,
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text:
                  'Here is the meeting data. Provide a concise structured brief in the same language as the meeting title.\n\n' +
                  lines.join('\n'),
              },
            },
          ],
        }
      },
    )

    server.registerPrompt(
      'meeting_tasks_review',
      {
        title: 'Meeting tasks review',
        description:
          'Load meeting tasks and action items from the summary; prepare a review prompt asking the model to verify completeness and suggest missing tasks.',
        argsSchema: {
          meetingId: z.string().describe('ID of the meeting to review tasks for'),
        },
      },
      async ({ meetingId }) => {
        const meeting = await this.prisma.meeting.findUniqueOrThrow({
          where: { id: meetingId },
          include: { summary: true, tasks: true },
        })

        const taskLines = meeting.tasks.length
          ? meeting.tasks.map((t) => `- [${t.status}] ${t.title}`)
          : ['(no tasks yet)']

        const actionItems = meeting.summary?.actionItems
          ? JSON.stringify(meeting.summary.actionItems, null, 2)
          : '(no action items in summary)'

        const lines = [
          `Meeting: ${meeting.title}`,
          `Date: ${meeting.date.toISOString()}`,
          '',
          '## Existing tasks',
          ...taskLines,
          '',
          '## Action items from summary',
          actionItems,
        ]

        return {
          description: `Tasks review for meeting "${meeting.title}"`,
          messages: [
            {
              role: 'user' as const,
              content: {
                type: 'text' as const,
                text:
                  'Review the tasks and action items below. Identify any action items that are missing from the task list and list them. ' +
                  'Then confirm which existing tasks are already covered by the action items.\n\n' +
                  lines.join('\n'),
              },
            },
          ],
        }
      },
    )
  }
}
