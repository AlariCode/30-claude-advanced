import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { AuthRequest } from '../auth/types'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { CreateMeetingCommand } from './commands/create-meeting.command'
import { CreateMeetingDto } from './dto/create-meeting.dto'
import { GetMeetingQuery } from './queries/get-meeting.query'
import { GetMeetingsQuery } from './queries/get-meetings.query'

@Controller('meetings')
@UseGuards(JwtGuard)
export class MeetingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(@Req() req: AuthRequest, @Body() dto: CreateMeetingDto) {
    return this.commandBus.execute(
      new CreateMeetingCommand(req.user.id, dto.title, dto.date, dto.participants),
    )
  }

  @Get()
  findAll(@Req() req: AuthRequest) {
    return this.queryBus.execute(new GetMeetingsQuery(req.user.id))
  }

  @Get(':id')
  findOne(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.queryBus.execute(new GetMeetingQuery(id, req.user.id))
  }
}
