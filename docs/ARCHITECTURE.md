# Educai — MVP Architecture

## Stack

- Next.js App Router + React + TypeScript.
- PostgreSQL.
- Prisma ORM.
- Server Actions for authenticated mutations.
- Node crypto (`scrypt`, HMAC) for password/session primitives and analytics pseudonyms.
- `pdf-parse` for PDF text extraction.
- Provider abstraction for AI.
- Plain CSS to keep the MVP dependency surface small.

The application is a monolith by design. There are no microservices, queues or external vector databases in the MVP.

## Component map

### Web/UI
`app/**` contains role-scoped server-rendered pages. Mutations live in `app/actions.ts` and re-check authorization on the server.

### Persistence
`prisma/schema.prisma` contains operational, content, analytics and feedback entities.

### Core services
- `src/lib/auth.ts`: password hashing, sessions, role guards.
- `src/lib/materials.ts`: file/text ingestion, extraction and chunk persistence.
- `src/lib/rag.ts`: active-content lexical + pgvector semantic retrieval and rank fusion.
- `src/lib/embeddings.ts`: optional OpenAI-compatible embedding generation with bounded retries.
- `src/lib/ai.ts`: `AIProvider`, DeepSeek production provider, explicitly-labeled local dev provider.
- `src/lib/tutor.ts`: context construction and tutor behavior.
- `src/lib/analysis-schema.mjs`: structured analysis schema + runtime validator.
- `src/lib/analysis.ts`: conversation analysis, signals, aggregation and recommendations.
- `src/lib/feedback.ts`: feedback aggregation.
- `src/lib/privacy.ts`: course-scoped pseudonymous participant keys.
- `src/lib/domain.mjs`: pure evidence/aggregation/anonymization/state-machine logic.

## Data model

### Identity and access
- `User`
- `TeacherProfile`
- `StudentProfile`
- `AuthSession`

### Academic context
- `Course`
- `Enrollment`
- `Activity`

### Validated content
- `LearningMaterial`
- `LearningMaterialVersion`
- `ContentChunk`

A material version stores extracted text and, when uploaded, the original small pilot file bytes in Postgres. This avoids introducing a second storage service for the MVP. Production scale should move file bytes to object storage while retaining version/text/chunk records.

### Student interaction
- `Conversation`
- `Message`

`Message.sourceChunkIds` records which internal chunks grounded assistant output.

### Analytics
- `Concept`
- `ConversationAnalysis`
- `ConceptSignal`
- `AggregatedInsight`
- `Recommendation`

`ConversationAnalysis.participantKey` and `ConceptSignal.participantKey` use an HMAC of `(courseId, studentId)` with a separate `ANALYTICS_PEPPER`. Teacher queries do not return this key; it exists only to deduplicate independent participants.

### Intervention and feedback
- `TeacherIntervention`
- `ClassSession`
- `StudentFeedback`
- `FeedbackAggregate`

Identified feedback is operationally stored to prevent duplicate submissions. Teacher-facing pages query only `FeedbackAggregate`.

## RAG pipeline

1. Teacher creates material as text or uploads PDF/TXT/Markdown.
2. Text is extracted.
3. Text is chunked into ~1,400-character overlapping fragments.
4. Chunks persist with normalized search text; optional embeddings are added after commit.
5. On each student turn, active-course chunks produce lexical candidates and, when configured, pgvector cosine candidates.
6. Reciprocal-rank fusion merges both lists without comparing unlike raw scores.
7. Top chunks enter the tutor system context.
8. The assistant message and ranked `MessageSource` provenance persist atomically; legacy chunk IDs remain temporarily.

### Why hybrid retrieval in PostgreSQL?
Lexical retrieval remains a no-credential, no-backfill fallback. Optional pgvector recall improves semantic matching without a second database, while nullable vectors permit incremental backfill. See `docs/PGVECTOR.md` for rollout constraints.

## Tutor information flow

`student message → enrollment authorization → active content retrieval → tutor system prompt + recent history → AIProvider.complete → assistant message + source chunk IDs → analysis pipeline`

If no course content supports the question, the tutor is instructed to say so instead of fabricating source support.

## Analysis pipeline

1. Load one student's conversation internally.
2. Send de-identified conversation content/message IDs to the analysis provider; identity fields are not included.
3. Request structured JSON output describing:
   - concepts;
   - `QUESTION`, `CONFUSION`, `REFORMULATION` signals;
   - evidence message IDs/snippets;
   - optional explanation type + observable understanding signal.
4. Validate the payload at runtime.
5. Replace the previous analysis for that conversation so stale per-turn signals do not multiply.
6. Upsert canonical concept by course + slug.
7. Persist signals with a pseudonymous participant key.
8. Aggregate across distinct participant keys.
9. Evaluate configurable evidence threshold.
10. Persist `AggregatedInsight`.
11. Create one actionable recommendation when evidence is sufficient.

Analytics are persisted. The teacher dashboard does not re-run the model when opened.

## Explanation heuristics

Explanation associations are only persisted when the model identifies an observable post-explanation signal. Allowed types include concrete example, analogy, step-by-step, definition, comparison and applied case. Allowed understanding signals are explicit confirmation, progression without repetition and reduced confusion. These are observations, not stable learner traits.

## Privacy architecture

- RBAC + course ownership/enrollment checks on every mutation.
- Teacher pages never include student relations in analytics queries.
- Analytics use course-scoped pseudonyms.
- Evidence snippets pass through basic PII redaction before persistence/display.
- Minimum evidence threshold protects against presenting one person's interaction as a group pattern.
- DeepSeek's Responses API is used as a stateless API path; Educai sends only the bounded conversation/context required for each call.
- Application logs do not intentionally log chat bodies.
- Student UI explains aggregation and teacher visibility.
- Student can delete their own conversation.

### Limitations
This MVP does not implement enterprise DLP, legal retention workflows, institutional SSO, audit exports or guaranteed PII entity recognition. Those are production-hardening items, not silently claimed as complete.

## Security model

Authentication uses a random opaque cookie token. Only an HMAC hash of the token is stored in `AuthSession`. Cookies are HttpOnly, SameSite=Lax and Secure in production. Passwords use Node `scrypt` with a per-user random salt.

Authorization is server-side, not UI-only. Course queries are always scoped to `teacherId` or enrollment `studentId`.

## Storage and deletion

Relational deletes use cascade/set-null rules aligned to object ownership. Deleting a conversation cascades its messages, analyses and concept signals. Aggregation is refreshed afterwards so deleted evidence no longer counts.

## Deployment

Any Node-compatible host with PostgreSQL works. Provide `DATABASE_URL`, `SESSION_SECRET`, `ANALYTICS_PEPPER`, `DEEPSEEK_API_KEY` and optional model/threshold settings. The current file-byte-in-Postgres choice is acceptable for a tiny pilot with upload limits; production should move binary objects to dedicated storage.
