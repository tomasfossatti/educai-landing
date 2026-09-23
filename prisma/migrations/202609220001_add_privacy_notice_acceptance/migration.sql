-- Existing accounts remain unaccepted until they next enter the tutor.
ALTER TABLE "StudentProfile"
ADD COLUMN "privacyNoticeVersion" TEXT,
ADD COLUMN "privacyNoticeAcceptedAt" TIMESTAMP(3);
