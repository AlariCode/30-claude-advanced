export class GenerateSummaryCommand {
  constructor(
    public readonly meetingId: string,
    public readonly userId: string,
  ) {}
}
