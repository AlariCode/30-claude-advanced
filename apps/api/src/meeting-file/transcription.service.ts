import { Injectable, Logger } from '@nestjs/common'
import { spawn } from 'child_process'
import * as fs from 'fs/promises'
import * as path from 'path'

import { TranscriptionStatus } from '../../generated/prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name)

  constructor(private readonly prismaService: PrismaService) {}

  async transcribeFile(fileId: string, filePath: string): Promise<void> {
    await this.prismaService.meetingFile.update({
      where: { id: fileId },
      data: { transcriptionStatus: TranscriptionStatus.IN_PROGRESS },
    })

    const outputDir = path.dirname(filePath)

    try {
      await this.runWhisper(filePath, outputDir)

      const transcriptPath = this.buildTranscriptPath(filePath)
      const transcriptText = await fs.readFile(transcriptPath, 'utf-8')

      await this.prismaService.meetingFile.update({
        where: { id: fileId },
        data: {
          transcriptionStatus: TranscriptionStatus.DONE,
          transcript: transcriptText,
        },
      })

      this.logger.log(`Transcription completed for file ${fileId}`)
    } catch (transcriptionError) {
      const errorMessage =
        transcriptionError instanceof Error
          ? transcriptionError.message
          : String(transcriptionError)

      this.logger.error(`Transcription failed for file ${fileId}: ${errorMessage}`)

      await this.prismaService.meetingFile.update({
        where: { id: fileId },
        data: {
          transcriptionStatus: TranscriptionStatus.FAILED,
          transcriptionError: errorMessage,
        },
      })
    }
  }

  private runWhisper(filePath: string, outputDir: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const whisperProcess = spawn('whisper', [
        filePath,
        '--model',
        'base',
        '--output_format',
        'txt',
        '--output_dir',
        outputDir,
      ])

      whisperProcess.on('close', (exitCode: number) => {
        if (exitCode === 0) {
          resolve()
        } else {
          reject(new Error(`Whisper process exited with code ${exitCode}`))
        }
      })

      whisperProcess.on('error', (processError: Error) => {
        reject(processError)
      })
    })
  }

  private buildTranscriptPath(filePath: string): string {
    const fileExtension = path.extname(filePath)
    const fileBaseName = path.basename(filePath, fileExtension)
    const fileDir = path.dirname(filePath)
    return path.join(fileDir, `${fileBaseName}.txt`)
  }
}
