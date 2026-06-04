export class GetMeetingSummaryQuery {
  constructor(
    public readonly meetingId: string,
    public readonly userId: string,
  ) {}
}
