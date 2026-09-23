# Educai — Product Decisions Register

| Decision | Source | Reason | Consequences |
|---|---|---|---|
| Educai’s core bridge is private learning interaction → pedagogical evidence → teacher decision. | Source-defined | This is the documented product differential, not an implementation invention. | MVP architecture preserves the separation between student interaction and teacher-facing aggregate evidence. |
| Initial users are university students 18+ and university teachers. | User-defined | Explicit MVP decision. | No minor/parent/school flows. |
| Course is the primary academic container. | User-defined | Explicit MVP decision. | Course owns content, activities, analytics, sessions and feedback. |
| Educai contains its own native chat. | User-defined | Resolves the source ambiguity around imported conversations. | No ChatGPT/Gemini/Claude import flow. |
| Teacher can only see group-level analytics. | User-defined | Structural privacy rule. | Backend teacher queries exclude student identities and individual analytics. |
| Analysis describes observable patterns, not learner types/diagnoses. | User-defined | Avoid unsupported personal labeling. | Schema only models observable conversation signals. |
| Post-class feedback is in MVP. | User-defined | Required to close the second product loop. | Session/intervention/feedback entities and UI are required. |
| Minimum pattern threshold is configurable, default 3 independent participants. | MVP Implementation Decision | The source explicitly authorizes 3 as an initial configurable value, not as a pedagogical truth. | `INSIGHT_MIN_PARTICIPANTS`; UI shows insufficient evidence below it. |
| Join mechanism is a random course code. | MVP Implementation Decision | Simplest robust pilot flow. | No invitation email infrastructure. |
| RAG uses lexical + optional pgvector candidates with rank fusion. | Redesign implementation | PostgreSQL already owns chunks, so a separate vector database adds unnecessary operational and consistency cost. | Nullable embeddings preserve lexical fallback during outages/backfill; only `ACTIVE` material is eligible. |
| Uploaded pilot files are stored in Postgres with extracted text/version. | MVP Implementation Decision | Avoid a second external storage dependency. | Suitable for small files/pilot; object storage is future hardening. |
| Password auth uses scrypt + opaque DB-backed sessions. | MVP Implementation Decision | Minimal secure auth without adding an auth framework. | Institutional SSO is out of scope. |
| OpenAI is the first production AI provider behind `AIProvider`. | MVP Implementation Decision | A concrete provider is required for a real chat while avoiding permanent coupling. | Provider can later be replaced; keys are env-only. |
| Default OpenAI model is `gpt-5.6-luna`. | MVP Implementation Decision | Cost-conscious default for pilot traffic; configurable. | Override with `OPENAI_MODEL`. |
| OpenAI requests set `store:false`. | MVP Implementation Decision | Minimize provider-side retention by default. | May limit provider-side debugging/state features. |
| Analysis runs synchronously after each tutor turn. | MVP Implementation Decision | Avoid queue/job infrastructure in a small pilot. | Higher turn latency; can move to jobs later without changing persisted objects. |
| Previous analysis of a conversation is replaced on re-analysis. | MVP Implementation Decision | Avoid duplicate stale signals as a multi-turn conversation evolves. | Aggregates represent latest interpreted state of each conversation. |
| Analytics deduplicate with HMAC course-scoped participant keys. | MVP Implementation Decision | Count independent participants without exposing identity to analytics surfaces. | Requires separate `ANALYTICS_PEPPER`. |
| Recommendations are deterministic templates grounded in sufficient insights. | MVP Implementation Decision | Keeps action layer stable and testable during pilot. | Later model-based structured recommendation service can replace it. |
| Feedback is concept-specific rather than general-session-only. | MVP Implementation Decision | Makes pre/post comparison interpretable and lowers schema ambiguity. | A session can request feedback for each intervened concept. |
| Teacher course management is consolidated into one page with sections. | MVP Implementation Decision | Avoid unnecessary standalone SaaS screens. | Faster pilot workflow; can split later if complexity grows. |
| Plain CSS is used instead of Tailwind. | MVP Implementation Decision | Reduces dependency/configuration surface without changing product behavior. | Design system is simple but accessible/responsive. |
| Binary upload limit follows the Server Action limit (8 MB). | MVP Implementation Decision | Keeps pilot file storage bounded. | Large academic PDFs require later object-storage/upload redesign. |
| Seed data directly persists analysis/insights instead of calling an external model. | MVP Implementation Decision | Deterministic reproducible demo. | Seed is explicitly fictional and separate from real data. |
| Before/after comparison never computes a causal “improvement” value. | User-defined | Explicit product trust rule. | UI retains separate metric names, samples and non-causality warning. |
