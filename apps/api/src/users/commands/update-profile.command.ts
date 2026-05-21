export class UpdateProfileCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string | undefined,
    public readonly avatarUrl: string | undefined,
  ) {}
}
