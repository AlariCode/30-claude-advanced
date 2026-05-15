import { Readable } from 'stream'

export class UploadFileCommand {
  constructor(
    public readonly meetingId: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly fileStream: Readable,
  ) {}
}
