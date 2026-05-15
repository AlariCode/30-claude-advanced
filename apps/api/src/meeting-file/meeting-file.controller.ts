import { BadRequestException, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { FastifyRequest } from 'fastify'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { UploadFileCommand } from './commands/upload-file.command'
import { GetMeetingFilesQuery } from './queries/get-meeting-files.query'

type AuthRequest = FastifyRequest & { user: { id: string; email: string } }

const ALLOWED_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
])

@Controller('meetings')
@UseGuards(JwtGuard)
export class MeetingFileController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post(':id/files')
  async uploadFile(@Req() req: AuthRequest, @Param('id') meetingId: string) {
    const data = await req.file()
    if (!data) throw new BadRequestException('File is required')

    if (!ALLOWED_MIMES.has(data.mimetype)) {
      await data.file.resume()
      throw new BadRequestException(`File type ${data.mimetype} is not allowed`)
    }

    return this.commandBus.execute(
      new UploadFileCommand(meetingId, req.user.id, data.filename, data.mimetype, data.file),
    )
  }

  @Get(':id/files')
  getFiles(@Req() req: AuthRequest, @Param('id') meetingId: string) {
    return this.queryBus.execute(new GetMeetingFilesQuery(meetingId, req.user.id))
  }
}
