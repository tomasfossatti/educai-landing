# Educai MVP

Educai turns student–AI learning conversations into aggregated pedagogical evidence and actionable teacher decisions, then closes the loop with post-class feedback.

## What is implemented

- Teacher/student authentication and backend role authorization.
- Courses + join codes.
- Validated text/PDF/Markdown content with versions and chunks.
- Native multi-turn course tutor.
- Active-content RAG and source-chunk traceability.
- Provider abstraction with OpenAI Responses API support.
- Schema-validated conversation analysis.
- Pseudonymous aggregation by independent participant.
- First-class no-data / insufficient / sufficient evidence states.
- Teacher-only aggregated dashboard and anonymous evidence.
- Actionable recommendations and intervention tracking.
- Class sessions + concept-specific post-class feedback.
- Before/after signal comparison without causal claims.
- Deterministic demo seed.
- Domain tests for privacy/aggregation/evidence/state logic.

Read `docs/MVP_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/AI_BEHAVIOR.md` and `docs/PRODUCT_DECISIONS.md` before extending the product.

## Requirements

- Node.js 20.18+
- npm
- PostgreSQL 16+ (or Docker)
- OpenAI API key for real AI chat/analysis

## 1. Install

```bash
npm install
cp .env.example .env
```

Generate strong independent values for `SESSION_SECRET` and `ANALYTICS_PEPPER`.

## 2. Start PostgreSQL

With Docker:

```bash
docker compose up -d postgres
```

The default `.env.example` points to this database.

## 3. Prepare the database

Apply the committed migration and seed:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

When you intentionally change `prisma/schema.prisma` during development, create the next migration with:

```bash
npm run db:migrate -- --name describe_the_change
```

## 4. AI configuration

Production/pilot path:

```env
AI_PROVIDER="openai"
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-5.6-luna"
```

`OPENAI_MODEL` is configurable. The provider uses the Responses API and sends `store:false`.

Development-only path without external credentials:

```env
AI_PROVIDER="local"
```

Local mode is intentionally limited: it can exercise the UI, RAG and deterministic heuristic analysis, but it is **not** represented as equivalent to a production semantic model.

## 5. Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo credentials

After `npm run db:seed`:

- Teacher: `docente@educai.demo` / `educai-demo`
- Students: `estudiante1@educai.demo` through `estudiante5@educai.demo` / `educai-demo`
- Course join code: `DEMO2026`

The seed is fictional and demonstrates both a sufficient and an insufficient concept pattern plus an applied intervention and post-class feedback.

## Tests

```bash
npm test
```

Current pure-domain coverage protects:
- evidence threshold;
- participant deduplication;
- anonymization;
- role/course-scope primitives;
- recommendation states;
- AI analysis schema validation;
- pre/post non-causal semantics;
- feedback association isolation across courses.

For a pilot deployment, also manually test the end-to-end happy path listed in `docs/MVP_SPEC.md`.

## Production deployment

Set these environment variables in the host:

```env
DATABASE_URL=
SESSION_SECRET=
ANALYTICS_PEPPER=
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
INSIGHT_MIN_PARTICIPANTS=3
```

Then run `prisma migrate deploy` as the database release step and `next build` for the web app.

### Pilot limitations to understand

- Lexical retrieval is intentionally simpler than embedding/vector retrieval.
- Small uploaded file bytes are stored in Postgres for the MVP.
- Conversation analysis is synchronous after each tutor turn.
- Basic snippet redaction does not replace enterprise DLP/PII tooling.
- The local AI provider is development-only.
- Institutional SSO, retention policy administration and audit exports are not implemented.
