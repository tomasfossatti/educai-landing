# Class feedback migration notes

This migration reconciles the two database states that existed before feedback
changes were represented by a versioned migration:

1. Databases created by `202609180001_init`, which contain concept-scoped
   `StudentFeedback` and `FeedbackAggregate` tables.
2. Databases previously synchronized to `schema.prisma`, which already contain
   `ClassFeedback` and may already contain the three generated-insight columns
   on `ClassSession`.

All DDL is conditional so both states converge on the current application
tables. Existing current-format rows are never overwritten.

## Safe backfill

A legacy response is copied to `ClassFeedback` only when there is exactly one
`StudentFeedback` row for its `(sessionId, studentId)` and its `clarity` value is
within the current 1–4 rating range. In that case `clarity`, `comment`, and
`createdAt` can be copied without selecting among multiple concept answers or
changing the numeric value. A pre-existing current-format row wins on conflict.

## Data that cannot be reconstructed

- `conceptId` and `stillDoubt` have no equivalent fields in `ClassFeedback`.
- Multiple concept responses from one student in one session cannot become one
  class response without inventing a selection or aggregation rule.
- A legacy clarity value of 5 is outside the current accepted rating range.
- `FeedbackAggregate` counts, averages, and rates cannot be expanded back into
  individual responses.
- Generated prose (`feedbackSummary` and `feedbackRecommendation`) cannot be
  recovered from aggregates without inventing historical AI output;
  `feedbackGeneratedAt` is likewise unknown.

For that reason, non-convertible source data is retained in
`LegacyStudentFeedback` and `LegacyFeedbackAggregate`, while unreconstructable
`ClassSession` fields remain `NULL`. The archive tables are intentionally not
part of the active Prisma model.
