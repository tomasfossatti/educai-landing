-- Extend the existing insight and intervention workflow without replacing it.
CREATE TYPE "InsightTrend" AS ENUM ('NEW', 'RISING', 'STABLE', 'FALLING');
CREATE TYPE "TeacherInsightStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'ACTION_PLANNED', 'DISMISSED', 'RESOLVED', 'MONITORING');
CREATE TYPE "InterventionStatus" AS ENUM ('PLANNED', 'APPLIED', 'SKIPPED');

ALTER TABLE "AggregatedInsight"
  ADD COLUMN "firstDetectedAt" TIMESTAMP(3),
  ADD COLUMN "lastDetectedAt" TIMESTAMP(3),
  ADD COLUMN "signalCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reformulationCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sessionCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "trend" "InsightTrend",
  ADD COLUMN "teacherStatus" "TeacherInsightStatus" NOT NULL DEFAULT 'OPEN';

-- These values are reconstructible from retained ConceptSignal rows. Trend is deliberately
-- left NULL because the schema did not retain historical snapshots from which to infer it.
UPDATE "AggregatedInsight" insight
SET
  "firstDetectedAt" = aggregate.first_detected_at,
  "lastDetectedAt" = aggregate.last_detected_at,
  "signalCount" = aggregate.signal_count,
  "reformulationCount" = aggregate.reformulation_count,
  "sessionCount" = aggregate.session_count
FROM (
  SELECT signal."conceptId" AS concept_id,
    MIN(signal."createdAt") AS first_detected_at,
    MAX(signal."createdAt") AS last_detected_at,
    COUNT(*)::INTEGER AS signal_count,
    COUNT(*) FILTER (WHERE signal."type" = 'REFORMULATION')::INTEGER AS reformulation_count,
    COUNT(DISTINCT analysis."conversationId")::INTEGER AS session_count
  FROM "ConceptSignal" signal
  JOIN "ConversationAnalysis" analysis ON analysis."id" = signal."analysisId"
  GROUP BY signal."conceptId"
) aggregate
WHERE insight."conceptId" = aggregate.concept_id;

ALTER TABLE "TeacherIntervention"
  ADD COLUMN "conceptId" TEXT,
  ADD COLUMN "status" "InterventionStatus" NOT NULL DEFAULT 'PLANNED',
  ADD COLUMN "plannedAt" TIMESTAMP(3),
  ADD COLUMN "appliedAt" TIMESTAMP(3);

-- Legacy interventions were recorded only when attached to a class, so they represent
-- applied work. Concept is reconstructed through the existing insight relationship.
UPDATE "TeacherIntervention"
SET "status" = 'APPLIED',
    "plannedAt" = "createdAt",
    "appliedAt" = "createdAt"
WHERE "sessionId" IS NOT NULL;

UPDATE "TeacherIntervention" intervention
SET "conceptId" = insight."conceptId"
FROM "AggregatedInsight" insight
WHERE intervention."insightId" = insight."id";

CREATE INDEX "TeacherIntervention_conceptId_idx" ON "TeacherIntervention"("conceptId");
ALTER TABLE "TeacherIntervention"
  ADD CONSTRAINT "TeacherIntervention_conceptId_fkey"
  FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
