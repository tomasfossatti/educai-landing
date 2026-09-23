-- pgvector remains in the existing PostgreSQL deployment; no external vector store is introduced.
CREATE EXTENSION IF NOT EXISTS vector;

-- Nullable columns keep lexical retrieval available while existing chunks are backfilled.
ALTER TABLE "ContentChunk"
  ADD COLUMN "embedding" vector(1536),
  ADD COLUMN "embeddingModel" TEXT,
  ADD COLUMN "embeddedAt" TIMESTAMP(3);

CREATE TYPE "RetrievalMethod" AS ENUM ('LEXICAL', 'SEMANTIC', 'HYBRID');

CREATE TABLE "MessageSource" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "contentChunkId" TEXT NOT NULL,
  "retrievalMethod" "RetrievalMethod" NOT NULL,
  "retrievalScore" DOUBLE PRECISION NOT NULL,
  "rank" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageSource_messageId_contentChunkId_key" ON "MessageSource"("messageId", "contentChunkId");
CREATE UNIQUE INDEX "MessageSource_messageId_rank_key" ON "MessageSource"("messageId", "rank");
CREATE INDEX "MessageSource_contentChunkId_idx" ON "MessageSource"("contentChunkId");
CREATE INDEX "ContentChunk_embedding_hnsw_idx" ON "ContentChunk" USING hnsw ("embedding" vector_cosine_ops);

ALTER TABLE "MessageSource" ADD CONSTRAINT "MessageSource_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageSource" ADD CONSTRAINT "MessageSource_contentChunkId_fkey"
  FOREIGN KEY ("contentChunkId") REFERENCES "ContentChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
