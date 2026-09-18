-- Educai MVP initial schema
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER');
CREATE TYPE "MaterialType" AS ENUM ('TEXT', 'PDF', 'MARKDOWN');
CREATE TYPE "MaterialState" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');
CREATE TYPE "MessageRole" AS ENUM ('STUDENT', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "EvidenceState" AS ENUM ('NO_DATA', 'INSUFFICIENT', 'SUFFICIENT');
CREATE TYPE "SignalType" AS ENUM ('QUESTION', 'CONFUSION', 'REFORMULATION');
CREATE TYPE "ExplanationType" AS ENUM ('CONCRETE_EXAMPLE', 'ANALOGY', 'STEP_BY_STEP', 'DEFINITION', 'COMPARISON', 'APPLIED_CASE', 'OTHER');
CREATE TYPE "UnderstandingSignal" AS ENUM ('EXPLICIT_CONFIRMATION', 'ADVANCED_WITHOUT_REPETITION', 'REDUCED_CONFUSION', 'FEEDBACK_POSITIVE', 'NONE');
CREATE TYPE "RecommendationStatus" AS ENUM ('GENERATED', 'VIEWED', 'APPLIED', 'DISCARDED');
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "passwordSalt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

CREATE TABLE "TeacherProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

CREATE TABLE "StudentProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

CREATE TABLE "Course" (
  "id" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "joinCode" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Course_joinCode_key" ON "Course"("joinCode");
CREATE INDEX "Course_teacherId_idx" ON "Course"("teacherId");

CREATE TABLE "Enrollment" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Enrollment_courseId_studentId_key" ON "Enrollment"("courseId", "studentId");
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

CREATE TABLE "Activity" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Activity_courseId_idx" ON "Activity"("courseId");

CREATE TABLE "LearningMaterial" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "MaterialType" NOT NULL,
  "state" "MaterialState" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LearningMaterial_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LearningMaterial_courseId_state_idx" ON "LearningMaterial"("courseId", "state");

CREATE TABLE "LearningMaterialVersion" (
  "id" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "rawText" TEXT NOT NULL,
  "fileName" TEXT,
  "fileMime" TEXT,
  "fileData" BYTEA,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LearningMaterialVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LearningMaterialVersion_materialId_version_key" ON "LearningMaterialVersion"("materialId", "version");

CREATE TABLE "ContentChunk" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "materialId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "searchText" TEXT NOT NULL,
  CONSTRAINT "ContentChunk_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentChunk_versionId_position_key" ON "ContentChunk"("versionId", "position");
CREATE INDEX "ContentChunk_courseId_idx" ON "ContentChunk"("courseId");
CREATE INDEX "ContentChunk_materialId_idx" ON "ContentChunk"("materialId");

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "activityId" TEXT,
  "studentId" TEXT NOT NULL,
  "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
  "consentedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Conversation_courseId_activityId_idx" ON "Conversation"("courseId", "activityId");
CREATE INDEX "Conversation_studentId_idx" ON "Conversation"("studentId");

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "MessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "sourceChunkIds" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

CREATE TABLE "Concept" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Concept_courseId_slug_key" ON "Concept"("courseId", "slug");

CREATE TABLE "ConversationAnalysis" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "participantKey" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL DEFAULT 'v1',
  "modelProvider" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConversationAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConversationAnalysis_conversationId_createdAt_idx" ON "ConversationAnalysis"("conversationId", "createdAt");
CREATE INDEX "ConversationAnalysis_participantKey_idx" ON "ConversationAnalysis"("participantKey");

CREATE TABLE "ConceptSignal" (
  "id" TEXT NOT NULL,
  "analysisId" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "participantKey" TEXT NOT NULL,
  "type" "SignalType" NOT NULL,
  "evidenceSnippet" TEXT NOT NULL,
  "explanationType" "ExplanationType",
  "understandingSignal" "UnderstandingSignal" NOT NULL DEFAULT 'NONE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConceptSignal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ConceptSignal_conceptId_participantKey_idx" ON "ConceptSignal"("conceptId", "participantKey");
CREATE INDEX "ConceptSignal_analysisId_idx" ON "ConceptSignal"("analysisId");

CREATE TABLE "AggregatedInsight" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "affectedParticipants" INTEGER NOT NULL,
  "totalParticipants" INTEGER NOT NULL,
  "proportion" DOUBLE PRECISION NOT NULL,
  "evidenceState" "EvidenceState" NOT NULL,
  "summary" TEXT NOT NULL,
  "evidenceJson" JSONB NOT NULL,
  "explanationJson" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AggregatedInsight_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AggregatedInsight_courseId_conceptId_key" ON "AggregatedInsight"("courseId", "conceptId");
CREATE INDEX "AggregatedInsight_courseId_evidenceState_idx" ON "AggregatedInsight"("courseId", "evidenceState");

CREATE TABLE "Recommendation" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "insightId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "actionText" TEXT NOT NULL,
  "status" "RecommendationStatus" NOT NULL DEFAULT 'GENERATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Recommendation_courseId_status_idx" ON "Recommendation"("courseId", "status");

CREATE TABLE "ClassSession" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "activityId" TEXT,
  "title" TEXT NOT NULL,
  "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClassSession_courseId_status_idx" ON "ClassSession"("courseId", "status");

CREATE TABLE "TeacherIntervention" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "insightId" TEXT,
  "recommendationId" TEXT,
  "sessionId" TEXT,
  "actualAction" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherIntervention_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TeacherIntervention_courseId_idx" ON "TeacherIntervention"("courseId");

CREATE TABLE "StudentFeedback" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "clarity" INTEGER NOT NULL,
  "stillDoubt" BOOLEAN NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentFeedback_sessionId_studentId_conceptId_key" ON "StudentFeedback"("sessionId", "studentId", "conceptId");
CREATE INDEX "StudentFeedback_courseId_sessionId_idx" ON "StudentFeedback"("courseId", "sessionId");

CREATE TABLE "FeedbackAggregate" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "conceptId" TEXT NOT NULL,
  "responseCount" INTEGER NOT NULL,
  "averageClarity" DOUBLE PRECISION NOT NULL,
  "stillDoubtCount" INTEGER NOT NULL,
  "stillDoubtRate" DOUBLE PRECISION NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeedbackAggregate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FeedbackAggregate_sessionId_conceptId_key" ON "FeedbackAggregate"("sessionId", "conceptId");
CREATE INDEX "FeedbackAggregate_courseId_idx" ON "FeedbackAggregate"("courseId");

ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningMaterialVersion" ADD CONSTRAINT "LearningMaterialVersion_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LearningMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "LearningMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentChunk" ADD CONSTRAINT "ContentChunk_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LearningMaterialVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationAnalysis" ADD CONSTRAINT "ConversationAnalysis_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptSignal" ADD CONSTRAINT "ConceptSignal_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ConversationAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConceptSignal" ADD CONSTRAINT "ConceptSignal_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AggregatedInsight" ADD CONSTRAINT "AggregatedInsight_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AggregatedInsight" ADD CONSTRAINT "AggregatedInsight_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "AggregatedInsight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherIntervention" ADD CONSTRAINT "TeacherIntervention_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeacherIntervention" ADD CONSTRAINT "TeacherIntervention_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "AggregatedInsight"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherIntervention" ADD CONSTRAINT "TeacherIntervention_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherIntervention" ADD CONSTRAINT "TeacherIntervention_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentFeedback" ADD CONSTRAINT "StudentFeedback_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentFeedback" ADD CONSTRAINT "StudentFeedback_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentFeedback" ADD CONSTRAINT "StudentFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudentFeedback" ADD CONSTRAINT "StudentFeedback_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedbackAggregate" ADD CONSTRAINT "FeedbackAggregate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedbackAggregate" ADD CONSTRAINT "FeedbackAggregate_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedbackAggregate" ADD CONSTRAINT "FeedbackAggregate_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;
