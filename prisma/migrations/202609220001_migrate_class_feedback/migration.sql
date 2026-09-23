-- This migration intentionally supports both database shapes that have existed:
--   1. the committed initial migration (StudentFeedback/FeedbackAggregate), and
--   2. databases previously aligned to the current schema with `prisma db push`.
-- All operations are additive or archival so neither path destroys historical data.

ALTER TABLE "ClassSession"
  ADD COLUMN IF NOT EXISTS "feedbackSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "feedbackRecommendation" TEXT,
  ADD COLUMN IF NOT EXISTS "feedbackGeneratedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ClassFeedback" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassFeedback_sessionId_studentId_key"
  ON "ClassFeedback"("sessionId", "studentId");
CREATE INDEX IF NOT EXISTS "ClassFeedback_courseId_sessionId_idx"
  ON "ClassFeedback"("courseId", "sessionId");
CREATE INDEX IF NOT EXISTS "ClassFeedback_studentId_idx"
  ON "ClassFeedback"("studentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ClassFeedback_courseId_fkey'
      AND conrelid = '"ClassFeedback"'::regclass
  ) THEN
    ALTER TABLE "ClassFeedback" ADD CONSTRAINT "ClassFeedback_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ClassFeedback_sessionId_fkey'
      AND conrelid = '"ClassFeedback"'::regclass
  ) THEN
    ALTER TABLE "ClassFeedback" ADD CONSTRAINT "ClassFeedback_sessionId_fkey"
      FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ClassFeedback_studentId_fkey'
      AND conrelid = '"ClassFeedback"'::regclass
  ) THEN
    ALTER TABLE "ClassFeedback" ADD CONSTRAINT "ClassFeedback_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('"StudentFeedback"') IS NOT NULL THEN
    -- A concept-specific response only has an unambiguous class-level equivalent
    -- when that student submitted exactly one response for the session. The old
    -- 1..5 clarity scale maps directly only for values accepted by the new 1..4
    -- rating field. Existing ClassFeedback always wins on conflict.
    INSERT INTO "ClassFeedback" (
      "id", "courseId", "sessionId", "studentId", "rating", "comment", "createdAt", "updatedAt"
    )
    SELECT
      MIN(sf."id"),
      MIN(sf."courseId"),
      sf."sessionId",
      sf."studentId",
      MIN(sf."clarity"),
      MIN(sf."comment"),
      MIN(sf."createdAt"),
      MIN(sf."createdAt")
    FROM "StudentFeedback" sf
    GROUP BY sf."sessionId", sf."studentId"
    HAVING COUNT(*) = 1 AND MIN(sf."clarity") BETWEEN 1 AND 4
    ON CONFLICT ("sessionId", "studentId") DO NOTHING;

    -- Keep every source row, including non-convertible 5/5 ratings and multiple
    -- concept responses, as an explicit archive rather than dropping history.
    -- conceptId and stillDoubt have no fields in ClassFeedback and cannot be
    -- reconstructed there without changing their meaning.
    IF to_regclass('"LegacyStudentFeedback"') IS NULL THEN
      ALTER TABLE "StudentFeedback" RENAME TO "LegacyStudentFeedback";
    END IF;
  END IF;

  IF to_regclass('"FeedbackAggregate"') IS NOT NULL THEN
    -- Aggregate counts/rates cannot be expanded into anonymous individual
    -- ClassFeedback rows. Nor can they safely produce narrative summaries or
    -- recommendations, so ClassSession's new fields intentionally remain NULL.
    IF to_regclass('"LegacyFeedbackAggregate"') IS NULL THEN
      ALTER TABLE "FeedbackAggregate" RENAME TO "LegacyFeedbackAggregate";
    END IF;
  END IF;
END $$;

