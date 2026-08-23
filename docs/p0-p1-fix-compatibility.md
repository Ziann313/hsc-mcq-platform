# P0/P1 Fix-Brief Compatibility Record

**Scope.** This record reconciles `MCQ_GURU_P0_P1_Fix_Prompt.docx` with the production MCQ GURU architecture. The remediation is deliberately limited to confirmed reliability, input-boundary, and frozen-attempt integrity gaps. It does not recreate systems already present or weaken server authority over assessment outcomes.

## Audit outcome

| Brief area | Existing platform state | Decision |
| --- | --- | --- |
| Branding, routes, sign-in, and administrator access | Active application/template source already uses MCQ GURU, explicit protected routes, safe post-sign-in return paths, a final not-found route, and role-aware administrator guards. | Preserved; no duplicate routing or redesign work. |
| Question delivery and scoring | Questions are selected and frozen server-side; active attempts withhold answer keys; submissions are owner-scoped and server-scored. | Preserved; no client answer map, client grading, or client-defined paper assembly was introduced. |
| Content and learning data | Source governance, reviewer workflow, published-capacity contracts, real dashboard data, Tutor caching, Tutor request controls, and subscription safeguards already exist. | Preserved; no copied past-paper content, speculative source claims, or duplicate data APIs were introduced. |
| Database reliability | Database initialization previously lacked an explicit shared-pool failure boundary. | Remediated with a shared `mysql2/promise` pool and clear `DATABASE_URL` initialization failures. |
| Source evidence matching | The active-evidence lookup needed a parameter-safe substring predicate. | Remediated with Drizzle SQL parameter binding and `CONCAT('%', value, '%')`. |
| Input and Image Solver protection | Plain-text normalization and a distinct short-window Image Solver abuse guard were not shared at the relevant boundary. | Remediated without replacing existing subscription enforcement. |
| Standard frozen-attempt integrity feedback | The server can record integrity events, but progressive warning state and third-warning automatic finalization required completion. | Remediated while retaining immutable snapshots, owner checks, server timing, and server-side scoring. |

## Implemented changes

The database layer now initializes Drizzle through a shared `mysql2/promise` pool with a connection limit of ten, idle handling, and keep-alive enabled. `getDb()` fails explicitly when `DATABASE_URL` is absent or unusable. The active source-evidence predicate now binds its value through Drizzle SQL rather than interpolating a `LIKE` pattern, preserving the same governed evidence-selection rules.

Shared plain-text sanitization removes markup/control characters and normalizes optional text before Tutor, onboarding/profile, and institution fields enter their existing workflows. A separate per-user Image Solver policy permits no more than two requests per rolling hour, before the existing entitlement and subscription controls; it does not change the established weekly limits.

The frozen-attempt runner now receives the structured outcome of its protected integrity-event mutation. First and second visibility warnings are visible to the student, and the server finalizes the owned active attempt on the third recorded visibility warning. The entry screen requires acknowledgement of the existing server-authoritative instructions before it can start an attempt, and the timer adopts urgency styling in the final five minutes. Focus mode, context-menu/clipboard shortcuts protection, immutable attempt recovery, and server-side expiry remain intact.

## Deliberate compatibility boundaries

| Excluded request pattern | Reason |
| --- | --- |
| Client-delivered correct-answer maps or client-side grading | They would expose answer keys and undermine the server-authoritative frozen-attempt model. |
| Broad duplicate `getQuestions`/question-browsing APIs | Student question delivery is intentionally restricted to protected, server-frozen attempts; public capacity remains aggregate-only. |
| Claims of “200 real” historical questions or automatic official-pattern assertions | Content must remain original or authorised, source-linked, independently reviewed, and honestly described. |
| Blanket conversion of all no-database read states into failures | Several existing read helpers intentionally represent truthful empty/unavailable product states. Only the confirmed initialization boundary was hardened. |

## Validation record

The final validation completed successfully: TypeScript checking, focused integrity coverage, full Vitest regression coverage, Drizzle schema integrity checking, and the production build. The full suite reported **100 passing tests and one intentional OAuth skip**. Fresh development and browser-console log review showed no new runtime errors. A mobile rendering check confirmed the existing frozen-attempt entry screen remains responsive with the server-authority instruction state.
