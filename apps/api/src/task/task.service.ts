import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { Task, TaskStatus } from '../../generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface UpsertTaskInput {
  title: string
  sourceMeetingId: string
  ownerId: string
  status?: TaskStatus
}

export type TaskWithOwner = Task & { sourceMeeting: { ownerId: string } }

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name)

  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, sourceMeetingId: string, ownerId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        sourceMeetingId,
        sourceMeeting: { ownerId },
        title: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async upsert(input: UpsertTaskInput): Promise<Task> {
    const { title, sourceMeetingId, ownerId, status = TaskStatus.OPEN } = input

    const meeting = await this.prisma.meeting.findFirst({
      where: { id: sourceMeetingId, ownerId },
      select: { id: true },
    })
    if (!meeting) throw new ForbiddenException()

    const task = await this.prisma.task.upsert({
      where: { sourceMeetingId_title: { sourceMeetingId, title } },
      create: { title, sourceMeetingId, status },
      update: { status },
    })

    this.logger.log(`Task upserted: "${title}" for meeting ${sourceMeetingId}`)
    return task
  }

  async open(ownerId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: { status: TaskStatus.OPEN, sourceMeeting: { ownerId } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async get(taskId: string): Promise<TaskWithOwner | null> {
    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: { sourceMeeting: { select: { ownerId: true } } },
    })
  }
}
