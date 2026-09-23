-- Incremental concept intelligence: aliases, merge state, suggestions and auditable changes.
CREATE TYPE "ConceptAliasSource" AS ENUM ('AI', 'TEACHER', 'SYSTEM');
CREATE TYPE "ConceptSuggestionStatus" AS ENUM ('PENDING', 'MERGED', 'KEPT_SEPARATE', 'DISMISSED');
CREATE TYPE "ConceptChangeType" AS ENUM ('MERGE', 'SPLIT', 'RENAME');

ALTER TABLE "Concept"
  ADD COLUMN "mergedIntoConceptId" TEXT,
  ADD COLUMN "mergedAt" TIMESTAMP(3);

CREATE TABLE "ConceptAlias" (
  "id" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "normalizedLabel" TEXT NOT NULL,
  "source" "ConceptAliasSource" NOT NULL,
  "similarity" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConceptAlias_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ConceptMergeSuggestion" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sourceConceptId" TEXT NOT NULL,
  "targetConceptId" TEXT NOT NULL,
  "similarity" DOUBLE PRECISION NOT NULL,
  "status" "ConceptSuggestionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "ConceptMergeSuggestion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ConceptChange" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "type" "ConceptChangeType" NOT NULL,
  "actorId" TEXT,
  "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConceptChange_pkey" PRIMARY KEY ("id")
);

-- Safe, repeatable backfill: every current display name becomes a SYSTEM alias.
INSERT INTO "ConceptAlias" ("id", "conceptId", "label", "normalizedLabel", "source")
SELECT 'backfill_' || md5(c."id"), c."id", c."name",
       trim(regexp_replace(translate(lower(c."name"), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g')),
       'SYSTEM'::"ConceptAliasSource"
FROM "Concept" c
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "ConceptAlias_conceptId_normalizedLabel_key" ON "ConceptAlias"("conceptId", "normalizedLabel");
CREATE INDEX "ConceptAlias_normalizedLabel_idx" ON "ConceptAlias"("normalizedLabel");
CREATE UNIQUE INDEX "ConceptMergeSuggestion_sourceConceptId_targetConceptId_key" ON "ConceptMergeSuggestion"("sourceConceptId", "targetConceptId");
CREATE INDEX "ConceptMergeSuggestion_courseId_status_idx" ON "ConceptMergeSuggestion"("courseId", "status");
CREATE INDEX "ConceptChange_courseId_createdAt_idx" ON "ConceptChange"("courseId", "createdAt");
CREATE INDEX "Concept_courseId_mergedAt_idx" ON "Concept"("courseId", "mergedAt");

ALTER TABLE "Concept" ADD CONSTRAINT "Concept_mergedIntoConceptId_fkey" FOREIGN KEY ("mergedIntoConceptId") REFERENCES "Concept"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConceptAlias" ADD CONSTRAINT "ConceptAlias_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptMergeSuggestion" ADD CONSTRAINT "ConceptMergeSuggestion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptMergeSuggestion" ADD CONSTRAINT "ConceptMergeSuggestion_sourceConceptId_fkey" FOREIGN KEY ("sourceConceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptMergeSuggestion" ADD CONSTRAINT "ConceptMergeSuggestion_targetConceptId_fkey" FOREIGN KEY ("targetConceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptChange" ADD CONSTRAINT "ConceptChange_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
