# Question Bank Prompt 2 Compatibility Record

**Scope.** This record reconciles `MCQ_GURU_Prompt_2_Question_Bank.docx` with the active MCQ GURU implementation. The brief's stated outcome—real database-backed practice and exams—already exists through the source-governed question bank and immutable server-authoritative attempt engine. No student-facing content browser, client grader, synthetic examination profile, copied question batch, or UI rebuild was added.

## Verified live state

The active academic catalogue is maintained for the current `2025-26` academic year and includes registered Science, Humanities, Business Studies, and common-subject records. A read-only production audit found 14 registered Science subjects, 24 Humanities subjects, 16 Business Studies subjects, and 6 common subjects. The practice UI currently reports **168 published, source-linked questions** and shows only capacity that has completed the established review and publication process.

| Prompt area | Existing MCQ GURU capability | Compatibility decision |
| --- | --- | --- |
| Catalog and subject/chapter selection | Practice queries published content availability and chapter availability, then preserves selected filters in a protected attempt preset. | Already satisfied without adding a second nested `getCatalog` endpoint. |
| Questions and options | `startFilteredAttempt` selects only approved published questions on the server and returns a frozen attempt without correct options. | Already satisfied; no generic student `getQuestions` or `getQuestionWithOptions` browser was added. |
| Grading and practice persistence | `submitFrozenAttempt` validates ownership/status/options against the immutable snapshot, scores server-side, persists answers, and updates the Mistake Vault. | Already satisfied; no `gradeAnswers` endpoint exposing correct option identifiers or client-supplied correctness was added. |
| Exam creation, recovery, timer, and submission | Server-owned frozen attempts retain expiry, answers, review state, integrity events, server-side finalization, result review, and history. | Already satisfied; no new default cards or client-defined `startExam` mutation was added. |
| Dashboard metrics | Dashboard queries live published capacity, persisted completed attempts, real accuracy, and activity streaks, with truthful empty states. | Already satisfied; no mock data replacement was required. |
| Admission preparation | Admission tracks filter only reviewed, source-tagged capacity and preserve truthful unavailable states. | Preserved; no unverified Medical/Engineering question seeding or invented patterns was added. |

## Deliberate safeguards

The prompt's request to seed at least 200 “real” questions, create future-year catalog entries, and publish fixed HSC/Medical/Engineering tests is not automatically safe. MCQ GURU does not copy unlicensed textbook, board, or admission question text; it publishes independently authored or authorised material only after active-source linkage, answer validation, reviewer approval, intelligence review, and an audit trail. Empty future-year records or default official-looking tests would create misleading availability without reviewed content or verified pattern evidence.

The requested standalone `gradeAnswers` response would disclose `correctOptionId` before the existing submission/result boundary. This conflicts with the platform's answer-key protection. Likewise, returning question prompts/options through a broad student endpoint would enable scraping outside frozen attempts. The existing aggregate-capacity API is intentionally public and contains no prompts, explanations, options, or correctness fields; complete published-question browsing is administrator-only.

Wrong answers are intentionally placed in the protected **Mistake Vault**, while the Notebook represents separately saved bookmarks. This separation preserves useful revision workflows without turning a bookmark list into an unrestricted question/answer browser.

## Validation record

TypeScript checking and focused database-backed regressions passed: `questionBankAccess`, `liveExam`, `expiredAttempt`, and reviewed-question-capacity coverage reported **7 passing tests**. A mobile review of `/practice` confirmed real published subject capacity, reviewed source-linked messaging, admission-track filters, and the protected handoff to the frozen-attempt runner. The established question-bank access test confirms students cannot retrieve full published-question payloads while public aggregate capacity remains safe.
