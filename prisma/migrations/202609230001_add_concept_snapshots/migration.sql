CREATE TABLE "ConceptSnapshot" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "participantCount" INTEGER NOT NULL,
    "signalCount" INTEGER NOT NULL,
    "evidenceState" "EvidenceState" NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConceptSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConceptSnapshot_sessionId_conceptId_key" ON "ConceptSnapshot"("sessionId", "conceptId");
CREATE INDEX "ConceptSnapshot_courseId_conceptId_capturedAt_idx" ON "ConceptSnapshot"("courseId", "conceptId", "capturedAt");
CREATE INDEX "ConceptSnapshot_courseId_capturedAt_idx" ON "ConceptSnapshot"("courseId", "capturedAt");

ALTER TABLE "ConceptSnapshot" ADD CONSTRAINT "ConceptSnapshot_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptSnapshot" ADD CONSTRAINT "ConceptSnapshot_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptSnapshot" ADD CONSTRAINT "ConceptSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
