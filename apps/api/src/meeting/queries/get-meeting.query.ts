export class GetMeetingQuery {
  constructor(
    public readonly id: string,
    public readonly ownerId: string,
  ) {}
}
