# Educai — AI Behavior

## Provider contract

`AIProvider` exposes:
- `complete(messages)` for tutor responses;
- `structured(request, validate)` for schema-constrained analysis.

The DeepSeek implementation is the production path. A clearly labeled deterministic `AI_PROVIDER=local` mode exists only to develop UI/RAG without external credentials; it does not pretend to provide production-quality semantic analysis.

The production provider uses DeepSeek's Responses API with `deepseek-flash` by default. The model remains configurable through `DEEPSEEK_MODEL`. Structured analysis requests use DeepSeek `json_schema` output and are validated again by Educai before persistence.

## Tutor behavior

The tutor system instruction requires the model to:
1. prioritize teacher-validated retrieved course content;
2. help the student understand rather than merely output an answer;
3. switch among explanation forms when useful;
4. ask pedagogically useful questions;
5. explicitly say when retrieved material does not support an answer;
6. never claim that unsupported information came from course sources;
7. avoid permanent learner labels, diagnoses or psychological inference;
8. avoid exposing internal IDs or information about other students.

Only recent conversation history is included to keep the prompt bounded.

## Grounding and traceability

The RAG service retrieves only active content through lexical and optional semantic candidates, then fuses their ranks. Each assistant message atomically persists ranked `MessageSource` provenance while retaining `sourceChunkIds` for migration compatibility. Students see material title and available chunk location, never internal IDs or retrieval scores.

## Conversation analysis

The analyzer receives message IDs, roles and content, but not student name/email/profile data. It returns JSON matching `ANALYSIS_SCHEMA`.

Each concept contains:
- concept name;
- observable signal(s): question, confusion or reformulation;
- evidence message ID and short evidence snippet;
- optional explanation pattern and subsequent observable understanding signal.

The output is validated again in application code before writing to the database.

## Doubt criteria

Valid evidence includes observable conversational behavior such as:
- direct question about a concept;
- explicit statement of confusion;
- repeated/rephrased request after an explanation;
- difficulty differentiating related concepts.

It must not create a clinical/cognitive diagnosis or a permanent label from these signals.

## Understanding criteria

An explanation type can be associated with a positive signal only when the conversation contains observable evidence after the explanation, for example:
- explicit confirmation of understanding;
- progress to a more advanced/new question without repeating the same confusion;
- reduced reformulation on the same concept;
- later aggregated student feedback.

The product language is deliberately probabilistic: “appears associated with”, “signals suggest”, not “this explanation works”.

## Aggregation and uncertainty

A pattern uses the count of distinct pseudonymous participants, not message volume. Default sufficient evidence is 3 participants and is configurable.

States:
- no data;
- insufficient evidence;
- sufficient evidence.

A single student's intense activity cannot produce a sufficient group pattern on its own.

## Recommendations

The MVP recommendation service is deterministic and grounded in the persisted insight. It favors concrete class actions (time-bounded contrast cases, short classification tasks, justification prompts) instead of generic “explain better” advice.

This deterministic choice reduces model variance in the action layer for the pilot. The architecture keeps recommendation generation isolated so a later structured model-based `RecommendationService` can be introduced without changing product objects.

## Post-intervention feedback

Feedback asks:
- current clarity (1–5);
- whether doubt remains;
- optional comment.

Teacher display is aggregated. Before and after values are not treated as the same metric when they come from different sources or samples.

## Failure and uncertainty behavior

- No relevant content: tutor says it lacks validated support.
- AI API failure: the server action fails visibly; the product does not silently fabricate an answer.
- Invalid structured output: analysis is rejected instead of writing free-form data into critical analytics.
- Below threshold: no sufficient insight/recommendation is claimed.
- Missing feedback: pre/post area remains an explicit empty state.
