import { Injectable } from '@nestjs/common'
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TaskStatus } from '../../generated/prisma/client'
import { McpToolRegistrar, Requester } from '../mcp/mcp-tool-registrar.interface'
import { z } from 'zod'
import { TaskService } from './task.service'

@Injectable()
export class TaskTools implements McpToolRegistrar {
  constructor(private readonly taskService: TaskService) {}

  register(server: McpServer, requester: Requester): void {
    server.registerTool(
      'find_tasks',
      {
        description: 'Search tasks by text similarity within a meeting. Read-only.',
        inputSchema: {
          query: z.string().describe('Search string to match against task titles'),
          meetingId: z.string().describe('ID of the meeting to search tasks in'),
        },
        annotations: { readOnlyHint: true },
      },
      async ({ query, meetingId }) => {
        const tasks = await this.taskService.search(query, meetingId, requester.userId)
        return { content: [{ type: 'text' as const, text: JSON.stringify(tasks) }] }
      },
    )

    server.registerTool(
      'upsert_task',
      {
        description:
          'Create or update a task by title. If a task with the given title exists in the meeting, its status is updated; otherwise a new task is created.',
        inputSchema: {
          title: z.string().describe('Task title'),
          status: z
            .enum([TaskStatus.OPEN, TaskStatus.DONE])
            .default(TaskStatus.OPEN)
            .describe('Task status: OPEN or DONE'),
          meetingId: z.string().describe('ID of the meeting the task belongs to'),
        },
        annotations: { readOnlyHint: false },
      },
      async ({ title, status, meetingId }) => {
        const task = await this.taskService.upsert({
          title,
          sourceMeetingId: meetingId,
          ownerId: requester.userId,
          status,
        })
        return { content: [{ type: 'text' as const, text: JSON.stringify(task) }] }
      },
    )

    server.registerResource(
      'open-tasks',
      'tasks://open',
      { mimeType: 'application/json' },
      async (_uri, _extra) => {
        const tasks = await this.taskService.open(requester.userId)
        return {
          contents: [
            { uri: 'tasks://open', mimeType: 'application/json', text: JSON.stringify(tasks) },
          ],
        }
      },
    )

    server.registerResource(
      'task-by-id',
      new ResourceTemplate('task://{taskId}', { list: undefined }),
      { mimeType: 'application/json' },
      async (uri, { taskId }, _extra) => {
        const task = await this.taskService.get(taskId as string)
        if (!task) throw new Error(`Task ${taskId} not found`)
        if (task.sourceMeeting.ownerId !== requester.userId) throw new Error('Forbidden')
        return {
          contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(task) }],
        }
      },
    )
  }
}
