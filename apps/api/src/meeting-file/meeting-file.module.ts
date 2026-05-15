import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { JwtModule } from '@nestjs/jwt'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { PrismaModule } from '../prisma/prisma.module'
import { UploadFileHandler } from './handlers/upload-file.handler'
import { GetMeetingFilesHandler } from './handlers/get-meeting-files.handler'
import { MeetingFileController } from './meeting-file.controller'

@Module({
  imports: [
    CqrsModule,
    PrismaModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'] ?? 'fallback-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [MeetingFileController],
  providers: [JwtGuard, UploadFileHandler, GetMeetingFilesHandler],
})
export class MeetingFileModule {}
