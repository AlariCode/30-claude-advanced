-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "MeetingFile" ADD COLUMN     "transcript" TEXT,
ADD COLUMN     "transcriptionError" TEXT,
ADD COLUMN     "transcriptionStatus" "TranscriptionStatus" NOT NULL DEFAULT 'SKIPPED';
