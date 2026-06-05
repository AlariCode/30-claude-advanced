import { Injectable, Logger } from '@nestjs/common'
import { Task, TaskStatus } from '../../generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'

export interface UpsertTaskInput {
  title: string
  sourceMeetingId: string
  status?: TaskStatus
}

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name)

  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, sourceMeetingId: string): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        sourceMeetingId,
        title: { contains: query, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async upsert(input: UpsertTaskInput): Promise<Task> {
    const { title, sourceMeetingId, status = TaskStatus.OPEN } = input

    const task = await this.prisma.task.upsert({
      where: { sourceMeetingId_title: { sourceMeetingId, title } },
      create: { title, sourceMeetingId, status },
      update: { status },
    })

    this.logger.log(`Task upserted: "${title}" for meeting ${sourceMeetingId}`)
    return task
  }
}
