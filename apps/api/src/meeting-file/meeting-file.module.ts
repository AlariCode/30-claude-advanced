import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { PrismaModule } from '../prisma/prisma.module'
import { DeleteFileHandler } from './handlers/delete-file.handler'
import { GetFileHandler } from './handlers/get-file.handler'
import { GetMeetingFilesHandler } from './handlers/get-meeting-files.handler'
import { UploadFileHandler } from './handlers/upload-file.handler'
import { MeetingFileController } from './meeting-file.controller'
import { TranscriptionService } from './transcription.service'

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [MeetingFileController],
  providers: [
    JwtGuard,
    UploadFileHandler,
    GetMeetingFilesHandler,
    GetFileHandler,
    DeleteFileHandler,
    TranscriptionService,
  ],
})
export class MeetingFileModule {}
