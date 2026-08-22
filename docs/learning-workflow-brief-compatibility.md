# Tutor, Notebook, Study Plan, and Dashboard Brief Compatibility Record

## Scope and audit outcome

The attached brief was reconciled with the existing MCQ GURU learning workflow rather than used to replace it. The platform already had a grounded Tutor persona, approved-evidence retrieval, a 24-hour response cache, a ten-questions-per-hour Tutor limit, server-enforced free-tier usage limits, real student progress data, spaced mistake re-tests, adaptive today-study recommendations, source-bound image solving, reviewer queues, account settings, and an application-wide error boundary.

The confirmed missing workflows were persisted Tutor history and a usable owner-only bookmark path. Both are completed in this release.

| Brief area | Compatible MCQ GURU status | Decision |
| --- | --- | --- |
| Tutor persona, source grounding, cache, and rate limit | Already implemented under the MCQ GURU identity. | Preserved without a duplicate LLM pipeline. |
| Tutor conversation history | `ai_conversations` and `ai_messages` existed but were not connected to the student Tutor UI. | Added protected history, owner-only message retrieval, append-only saved exchanges, ordering by a new `updatedAt` column, a responsive saved-conversation panel, and bilingual typing text. |
| Mistakes and spaced review | Existing Mistake Vault is generated from completed immutable attempts and uses server-scored spaced re-tests. | Preserved; no client-created answer history was added. |
| Bookmarks | The owner-scoped table existed, but the prior route redirected to practice. | Restored `/bookmarks` as a protected notebook view. Students can save a question only from an active frozen attempt, remove only their own metadata, and start a server-frozen practice attempt from still-published source-linked bookmarks. |
| Study plan | Existing Study Plan reuses real saved attempts, reviewed available content, student progress, and adaptive Today’s Study recommendations. | Preserved. A synthetic static seven-day schedule was not introduced. |
| Dashboard and Insights | Existing dashboard and learning-progress surfaces already read real availability, curriculum coverage, student progress, and benchmark data with honest no-data states. | Preserved; no mock metrics or chart arrays were reintroduced. |
| Image Solver | Existing protected endpoint accepts validated PNG/JPEG/WebP data URLs, applies subscription limits, and withholds a factual solve when approved evidence is absent. | Preserved; no ungrounded OCR/LLM chain was added. |
| Administrator workflow | Existing protected review, publication, source evidence, generation review, import, and audit workflows are real and role-gated. | Preserved; no direct student publication route was added. |

## Security and data boundaries

Tutor conversations are scoped by the authenticated student ID. A conversation identifier belonging to a different user is indistinguishable from a missing record to the caller, and no history is returned across accounts. The new recency timestamp is additive; it does not alter message content or source-grounding policy.

Bookmark listings deliberately show only subject, chapter, language, and save time. They do not expose prompt text, options, explanations, or answer keys outside the immutable attempt where the server selected and froze the question. Bookmarked practice repeats the same source-validity and answer-key-protection checks used for any other frozen attempt.

## Validation

The release includes database-backed Tutor conversation and bookmark privacy coverage. Validation covers TypeScript, the complete regression suite, Drizzle migration integrity, production build, and mobile/desktop Tutor and bookmark route rendering. The schema migration is additive: `0021_material_vivisector.sql` adds `updatedAt` to `ai_conversations`.
