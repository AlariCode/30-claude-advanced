export class GetFileQuery {
  constructor(
    public readonly fileId: string,
    public readonly meetingId: string,
    public readonly userId: string,
  ) {}
}
