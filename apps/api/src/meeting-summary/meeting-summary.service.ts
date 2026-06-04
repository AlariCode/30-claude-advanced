import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
  MeetingSummary,
  Prisma,
  SummaryStatus,
  TranscriptionStatus,
} from '../../generated/prisma/client'
import { ClaudeAgentService } from '../claude-agent/claude-agent.service'
import { PrismaService } from '../prisma/prisma.service'
import { SummaryResult } from './types'

@Injectable()
export class MeetingSummaryService {
  private readonly logger = new Logger(MeetingSummaryService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly claudeAgentService: ClaudeAgentService,
  ) {}

  async generateSummary(meetingId: string, userId: string): Promise<void> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, ownerId: userId },
    })

    if (!meeting) {
      throw new NotFoundException('Meeting not found')
    }

    const transcript = await this.collectTranscripts(meetingId)

    await this.upsertSummaryRecord(meetingId, {
      status: SummaryStatus.PENDING,
      error: null,
    })

    void this.processGeneration(meetingId, transcript)
  }

  private async processGeneration(meetingId: string, transcript: string): Promise<void> {
    try {
      await this.upsertSummaryRecord(meetingId, { status: SummaryStatus.IN_PROGRESS })

      const prompt = this.buildPrompt(transcript)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Таймаут генерации выжимки (60 секунд)')), 60_000),
      )
      const claudeResponse = await Promise.race([
        this.claudeAgentService.ask(prompt),
        timeoutPromise,
      ])
      const summaryResult = this.parseSummaryResponse(claudeResponse)

      await this.upsertSummaryRecord(meetingId, {
        status: SummaryStatus.DONE,
        summary: summaryResult.summary,
        actionItems: summaryResult.actionItems as unknown as Prisma.InputJsonValue,
        decisions: summaryResult.decisions as unknown as Prisma.InputJsonValue,
        error: null,
      })

      this.logger.log(`Summary generation completed for meeting ${meetingId}`)
    } catch (generationError) {
      const errorMessage =
        generationError instanceof Error ? generationError.message : String(generationError)

      this.logger.error(`Summary generation failed for meeting ${meetingId}: ${errorMessage}`)

      await this.upsertSummaryRecord(meetingId, {
        status: SummaryStatus.FAILED,
        error: errorMessage,
      })
    }
  }

  private async collectTranscripts(meetingId: string): Promise<string> {
    const meetingFiles = await this.prisma.meetingFile.findMany({
      where: {
        meetingId,
        transcriptionStatus: TranscriptionStatus.DONE,
        transcript: { not: null },
      },
    })

    const completedFiles = meetingFiles.filter(
      (meetingFile) => meetingFile.transcript && meetingFile.transcript.trim().length > 0,
    )

    if (completedFiles.length === 0) {
      throw new BadRequestException('Нет завершённых транскрипций для генерации выжимки')
    }

    return completedFiles.map((meetingFile) => meetingFile.transcript as string).join('\n\n---\n\n')
  }

  private buildPrompt(transcript: string): string {
    return `You are analyzing a meeting transcript. Respond ONLY with valid JSON in this exact format:
{
  "summary": "brief text summary of the meeting",
  "actionItems": [{"task": "task description", "assignee": "person name or null"}],
  "decisions": ["decision 1", "decision 2"]
}
No markdown, no explanation, ONLY the JSON object.
IMPORTANT: Write all text values (summary, task, assignee, decisions) in the same language as the meeting transcript.

Meeting transcript:
${transcript}`
  }

  private parseSummaryResponse(response: string): SummaryResult {
    try {
      const stripped = response
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '')
        .trim()
      return JSON.parse(stripped) as SummaryResult
    } catch {
      throw new Error('Невалидный ответ Claude: не удалось распарсить JSON')
    }
  }

  private async upsertSummaryRecord(
    meetingId: string,
    data: Prisma.MeetingSummaryUpdateInput,
  ): Promise<MeetingSummary> {
    return this.prisma.meetingSummary.upsert({
      where: { meetingId },
      create: {
        meetingId,
        status: (data.status as SummaryStatus) ?? SummaryStatus.PENDING,
        summary: (data.summary as string | null) ?? null,
        actionItems: data.actionItems ?? Prisma.JsonNull,
        decisions: data.decisions ?? Prisma.JsonNull,
        error: (data.error as string | null) ?? null,
      },
      update: data,
    })
  }
}
