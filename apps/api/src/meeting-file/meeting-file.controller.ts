import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { FastifyReply, FastifyRequest } from 'fastify'
import { createReadStream } from 'fs'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { DeleteFileCommand } from './commands/delete-file.command'
import { UploadFileCommand } from './commands/upload-file.command'
import { GetFileQuery } from './queries/get-file.query'
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

  @Get(':id/files/:fileId/download')
  async downloadFile(
    @Req() req: AuthRequest,
    @Param('id') meetingId: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const file = await this.queryBus.execute(new GetFileQuery(fileId, meetingId, req.user.id))

    const encoded = encodeURIComponent(file.originalName)
    res.header(
      'Content-Disposition',
      `attachment; filename="${file.originalName}"; filename*=UTF-8''${encoded}`,
    )
    res.header('Content-Type', file.mimeType)

    return new StreamableFile(createReadStream(file.filePath))
  }

  @Delete(':id/files/:fileId')
  @HttpCode(204)
  deleteFile(
    @Req() req: AuthRequest,
    @Param('id') meetingId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.commandBus.execute(new DeleteFileCommand(fileId, meetingId, req.user.id))
  }
}
