import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { JwtModule } from '@nestjs/jwt'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { UploadFileHandler } from './handlers/upload-file.handler'
import { GetMeetingFilesHandler } from './handlers/get-meeting-files.handler'
import { MeetingFileController } from './meeting-file.controller'

@Module({
  imports: [
    CqrsModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'] ?? 'fallback-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [MeetingFileController],
  providers: [JwtGuard, UploadFileHandler, GetMeetingFilesHandler],
})
export class MeetingFileModule {}
