import { Module } from '@nestjs/common'
import { TaskTools } from './task.tools'
import { TaskService } from './task.service'

@Module({
  providers: [TaskService, TaskTools],
  exports: [TaskService, TaskTools],
})
export class TaskModule {}
