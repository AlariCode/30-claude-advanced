import { Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { AuthRequest } from '../auth/types'
import { JwtGuard } from '../auth/guards/jwt.guard'
import { GenerateSummaryCommand } from './commands/generate-summary.command'
import { GetMeetingSummaryQuery } from './queries/get-meeting-summary.query'

@Controller('meetings/:id/summary')
@UseGuards(JwtGuard)
export class MeetingSummaryController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(202)
  async generate(
    @Req() req: AuthRequest,
    @Param('id') meetingId: string,
  ): Promise<{ message: string }> {
    await this.commandBus.execute(new GenerateSummaryCommand(meetingId, req.user.id))
    return { message: 'Генерация запущена' }
  }

  @Get()
  getSummary(@Req() req: AuthRequest, @Param('id') meetingId: string) {
    return this.queryBus.execute(new GetMeetingSummaryQuery(meetingId, req.user.id))
  }
}
