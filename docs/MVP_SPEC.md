# Educai — MVP Specification

## Objective

Validate the central pedagogical loop in a small university pilot:

`teacher-validated content → contextual student chat → captured conversation → analysis → aggregated insight → actionable recommendation → teacher intervention → class/session → student feedback → pre/post signal comparison`

Educai's product value is the bridge between a private learning interaction and a teacher decision. It is not a generic chat product and it is not an individual surveillance dashboard.

## Scope

### In scope
- University students aged 18+ and university teachers.
- Course as the top-level academic container.
- Teacher-owned validated learning content.
- Native multi-turn student chat.
- PDF, plain text and Markdown ingestion.
- Small-scale lexical RAG over active content chunks.
- Conversation analysis into observable concepts and doubt signals.
- Aggregation by independent participant rather than raw message count.
- First-class evidence states: no data, insufficient, sufficient.
- Anonymous evidence snippets for teachers only above the evidence threshold.
- Actionable recommendations.
- Teacher intervention tracking.
- Class/session lifecycle.
- Short post-class feedback.
- Non-causal before/after signal comparison.
- Student conversation deletion.

### Explicitly out of scope
Institutional administration, minors/parents, grading, billing, marketplace, social features, human messaging, multi-institution analytics, gamification, native mobile apps and advanced distributed infrastructure.

## Users and permissions

### Student
Can authenticate, join a course by code, view enrolled courses, open activities, chat with the tutor, view/delete their own active conversation and submit feedback.

Cannot access teacher dashboards, group analytics, content administration, other students' data or other students' conversations.

### Teacher
Can authenticate, create/manage owned courses, manage content and activities, inspect aggregated analytics, view anonymized evidence, act on recommendations, register interventions, open/close sessions and inspect aggregated feedback.

Cannot use any teacher-facing endpoint to retrieve a student's analytical profile, individual metrics or identified conversation text.

## Main screens

### Public/authentication
- `/login`
- `/register`

### Student
- `/student` — courses + join flow
- `/student/courses/:courseId` — activities, feedback tasks, own conversations
- `/student/chat/:activityId` — native tutor chat
- `/student/feedback/:sessionId?concept=:conceptId` — low-friction feedback

### Teacher
- `/teacher` — owned courses
- `/teacher/courses/new` — create course
- `/teacher/courses/:courseId` — dashboard + content + activities + recommendations + sessions
- `/teacher/courses/:courseId/insights/:insightId` — concept evidence, recommendation and pre/post view

The teacher course screen intentionally consolidates related tasks instead of creating a page per SaaS object.

## Functional rules

1. A student must be enrolled before they can access an activity/chat in a course.
2. A teacher can only access courses owned by their `TeacherProfile`.
3. Only `ACTIVE` learning material is retrieved by the tutor.
4. Each assistant message persists traceability to the retrieved `ContentChunk` IDs.
5. Analysis output is schema-validated before persistence.
6. Analytics deduplicate by a pseudonymous participant key scoped to a course.
7. The default evidence threshold is `3` independent participants, configurable by `INSIGHT_MIN_PARTICIPANTS`.
8. A single conversation can never create a sufficient group pattern under the default configuration.
9. Evidence snippets are sanitized and teacher views never query student identity alongside analytics.
10. Recommendations only appear for sufficient evidence.
11. Recommendation state transitions are constrained: `GENERATED → VIEWED/APPLIED/DISCARDED`, `VIEWED → APPLIED/DISCARDED`.
12. Feedback is concept-specific in this MVP and aggregated before teacher display.
13. Pre/post numbers retain their source metric, sample and timestamp context. The UI explicitly warns that they are not a causal estimate.
14. Deleting a student's conversation removes the source conversation and cascaded analysis/signals, after which course aggregation is refreshed.
15. External AI provider data storage is disabled in the OpenAI request (`store:false`).

## Evidence state behavior

- `NO_DATA`: zero independent participants with signals.
- `INSUFFICIENT`: one or more signals but fewer than the configured threshold.
- `SUFFICIENT`: threshold reached or exceeded.

The UI treats insufficient data as a product state, not as an error.

## Happy path acceptance criteria

1. A clean install can boot from the README.
2. Teacher and student accounts can authenticate.
3. Teacher creates a course and receives a join code.
4. Student joins using that code.
5. Teacher adds validated content.
6. Teacher creates an activity.
7. Student opens activity and holds a multi-turn contextual conversation.
8. Assistant uses retrieved active course chunks and records source chunk IDs.
9. Conversation is analyzed into validated structured signals.
10. Repeated signals across independent participants aggregate by concept.
11. Insufficient data is explicitly represented.
12. Teacher dashboard returns aggregated data only.
13. Sufficient insight exposes sanitized evidence and an actionable recommendation.
14. Teacher opens a session and applies a recommendation as an intervention.
15. Session is closed.
16. Students submit concept feedback.
17. Teacher sees aggregated feedback.
18. Insight detail displays before/after metrics with different metric names/samples and a non-causality warning.
19. Student can delete their own conversation.
20. Core domain tests pass.

## Demo data

The seed creates:
- one teacher;
- one university course;
- one active Markdown material;
- one activity;
- five fictional students;
- five conversations;
- one sufficient recurring concept (`correlación y causalidad`);
- one insufficient concept (`sesgo de selección`);
- one applied recommendation/intervention;
- one closed class session;
- four feedback responses and an aggregate.

Seed identities are clearly demo-only and are not mixed with production data.
