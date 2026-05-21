import { Readable } from 'stream'

export class UploadAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly mimeType: string,
    public readonly fileStream: Readable,
  ) {}
}
