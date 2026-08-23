# Week 2 P1 Core-Learning-Loop Compatibility Record

**Scope.** This record reconciles `Prompt_Week2_P1_Core_Learning_Loop.md` with the current MCQ GURU platform. The requested learning loop already exists in a stronger form: server-selected source-governed questions, immutable frozen snapshots, owner-scoped answer persistence, server-side scoring, expiry handling, result review, dashboard progress, Mistake Vault, and protected bookmarked practice. No weaker client-defined question API, client answer key, or static placeholder page was reintroduced.

| Requested P1 outcome | Verified active implementation | Compatibility decision |
| --- | --- | --- |
| Timed auto-submit | Live frozen attempts use a server-clock countdown, final-five-minute urgency, automatic expiry handling, instruction acknowledgement, and integrity-event finalization. | Preserved. No parallel client-only timer was added. |
| Real practice questions | Practice uses published aggregate availability for discovery, then a protected server-frozen attempt for question delivery. | Preserved. No scrapeable generic `getQuestions` or `getQuestionById` student API was added. |
| Save, submit, and resume | `saveAttemptSelection`, `activeAttempt`, and `submitFrozenAttempt` persist only valid owner-scoped selections against the immutable snapshot and safely recover a valid active attempt. | Preserved. No client-supplied answer batch or mutable attempt contract was added. |
| Server grading and mistakes | Submitted/expired attempts are server-scored; wrong responses drive the existing spaced Mistake Vault workflow. | Preserved. No client `correctOptionId`, `gradePreview`, or client-reported correctness was added. |
| Real dashboard and learning guidance | Dashboard, insights, Today’s Study, weak-concept handoff, bookmarks, Tutor history, and profile are already backed by protected persisted data. | Preserved. No static metrics or placeholder routes were added. |
| Dedicated routes | Explicit protected routes exist for practice, exams, Tutor, insights, study plan, mistakes, bookmarks, profile, live attempt/review, and compatibility links. | Preserved. No route-to-Home fallback or duplicate page set was added. |

## Deliberate deviations

The attachment assumes an unsafe client question-delivery and scoring model. MCQ GURU intentionally does not return correct answers to an active student, accept a client-created question set, or score a client-provided answer map. The canonical flow remains: **server selection → frozen snapshot → owner-scoped saved selections → server submission/expiry → server scoring → protected result and learning updates**.

## Validation record

TypeScript checking and focused immutable-attempt, expiry, question-access, bookmark, and route tests passed with **14 tests**. Mobile review confirmed the governed practice setup and server-authoritative exam configuration remain usable and display real published capacity without exposing answer keys.
