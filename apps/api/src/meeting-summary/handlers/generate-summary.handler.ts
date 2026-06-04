import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'
import { MeetingSummaryService } from '../meeting-summary.service'
import { GenerateSummaryCommand } from '../commands/generate-summary.command'

@CommandHandler(GenerateSummaryCommand)
export class GenerateSummaryHandler implements ICommandHandler<GenerateSummaryCommand> {
  constructor(private readonly meetingSummaryService: MeetingSummaryService) {}

  async execute(command: GenerateSummaryCommand): Promise<void> {
    await this.meetingSummaryService.generateSummary(command.meetingId, command.userId)
  }
}
