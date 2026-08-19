# MCQ GURU Comprehensive Audit Report

## A. FIXED

The audit preserved the existing architecture and corrected demonstrated defects rather than rebuilding feature areas. Administrative pages are now guarded in the client as well as on the server: unauthorised students are redirected away from review, governance, import, question-intake, and admission-pattern management screens, while the existing `adminProcedure` remains the authoritative server-side control.

The navigation role vocabulary now matches the deployed server model. Only the actual `admin` role exposes management navigation; unsupported client-only labels such as `reviewer`, `content_admin`, and `super_admin` no longer create misleading visibility.

The governed question workflow now requires an active academic year, matching subject, matching book, matching chapter, source version, source page/section, and an explicit Bangla or English content language. The server validates this hierarchy before creating a human-review record, rejects a source-scoped duplicate with the same normalized prompt and answer set, and keeps imports on the same review path. Publication now rechecks the full academic year → subject → book → chapter chain in addition to the existing active-source and exactly-one-correct-answer rules.

One legacy published Biology question lacked a registered chapter. The book itself has no registered chapter available for a safe mapping, so the record was **not guessed, deleted, or silently relabelled**. It was moved to `needs_review` and a traceable audit event was recorded. The remaining published bank now passes the new curriculum, source, answer-set, and duplicate checks.

Public community discussion reads and writes are now limited to published questions with active source evidence. The Tutor evidence lookup now respects the selected academic year instead of treating that parameter as unused. New source versions for an already-active source are retained as review records rather than automatically superseding live evidence and making dependent student content disappear. An admission pattern can now be activated only when an active `official_admission` source record matches its source URL; the evidence version identifier is retained in its configuration.

The weekly leaderboard now asks for the same ISO-week key that the server writes. The Cheat Sheets empty state no longer displays a hardcoded quadratic-formula sample; it truthfully states that no source-reviewed sheet is published.

## B. MISSING IMPLEMENTED

The release adds a database-backed **published-content quality gate**. It validates the currently published bank against the same conditions expected by the review workflow: complete curriculum mapping, active source evidence with a non-empty page reference, at least two options, exactly one correct option, and no normalized duplicate across the same year, subject, book, chapter, and language.

The existing Question Intake workspace now exposes chapter and content-language selectors rather than leaving those data unavailable to reviewers. The existing CSV importer now requires `bookId`, `chapterId`, and `contentLanguage` and validates that language before it submits rows. These are extensions of the existing review and import workflows; no parallel publisher or question tool was created.

Admission pattern activation now has a source-evidence requirement. It remains possible to create draft or under-review records, but student-visible active pattern records cannot be created from an arbitrary URL alone.

## C. DUPLICATES CONSOLIDATED

| Duplicate or overlapping concern | Kept implementation | Consolidation outcome |
|---|---|---|
| Client-visible management access and server authorization | The existing server-side `adminProcedure` | A client-side `AdminRoute` now mirrors the real role model for clarity; it does not replace or weaken server authorization. |
| Multiple source records for the same official URL | The existing `sources` and `source_versions` history | Re-registration now reuses the source record and creates a reviewable version instead of creating a parallel source record or silently replacing live evidence. |
| Question intake paths | The existing manual review intake and CSV/JSON importer | Both paths now submit the same complete curriculum and language metadata to the same human-review lifecycle. |
| Primary versus utility navigation | The existing routes and Platform Shell | Home, Daily Study, Mock Exams, Admission Prep, and AI Tutor are ordered as the core study journey; live exams, revision, notices, and other tools remain available without being presented as equally primary. |

No working learning, scoring, live-exam, result, or governance feature was removed in this audit.

## D. DEMO/PLACEHOLDER REMOVED OR IMPLEMENTED

| Item | Outcome |
|---|---|
| Quadratic-formula “Formula preview” on an empty Cheat Sheets page | Removed and replaced with an explicit no-published-sheet state. |
| Official-looking University of Dhaka values prefilled in the admission-pattern form | Removed. The protected form now begins empty so unverified facts are not implied as official. |
| Published Biology question without any chapter mapping | Removed from student practice by moving it to `needs_review`; it remains available to an authorised reviewer for correction. |
| Misleading non-server role labels in management navigation | Removed from the visibility policy. |

## E. PROTECTED WORKING FEATURES

| Protected area | Verification result |
|---|---|
| 1. MCQ scoring | Preserved; existing scoring tests pass. |
| 2. Negative marking | Preserved; score tests retain per-question negative weights. |
| 3. Frozen attempts | Preserved; server-owned frozen snapshot and option checks remain in place. |
| 4. Expiry and auto-submission | Preserved; expired-attempt and live-room tests pass. |
| 5. Mistake tracking | Preserved; incorrect answers continue to populate Mistake Vault. |
| 6. Spaced revision | Preserved; deterministic spaced-review tests pass. |
| 7. Source retrieval | Strengthened with academic-year filtering; active-source policy remains enforced. |
| 8. Student progress | Preserved; persisted-attempt summaries remain the data source. |
| 9. Daily study recommendations | Preserved; group, performance, recency, and mistake signals remain intact. |
| 10. Daily challenges | Preserved; schedule deduplication and notification tests pass. |
| 11. Live exams | Preserved; source validation, lifecycle, ranking, and integrity workflows pass. |
| 12. Admission versioning | Preserved and strengthened with active official-source activation checks. |
| 13. Question import validation | Strengthened; imported rows still enter human review rather than student practice. |
| 14. Automated tests | Expanded with published-content quality coverage; existing suites remain intact. |

## F. TEST RESULTS

The final validation completed successfully.

| Check | Result |
|---|---|
| TypeScript | Passed (`pnpm check`) |
| Regression suite | **57 passed**, **1 skipped** across 29 test files |
| Production build | Passed (`pnpm build`) |
| Desktop visual verification | Completed for dashboard, practice, Tutor, Cheat Sheets, and management flow |
| Mobile visual verification | Completed at 390px for dashboard, practice, and Cheat Sheets |
| New audit coverage | `server/contentQuality.db.integration.test.ts` passed |

The remaining warnings are non-blocking build-tool warnings: the root client bundle remains above the 500 kB minification advisory threshold, and `baseline-browser-mapping` reports that its bundled data is over two months old. Neither warning caused a TypeScript, test, or production-build failure.

## G. REMAINING PROBLEMS

The platform is not content-complete. The reviewed source-governed bank currently covers selected chapters only, and the quarantined Biology 1st Paper question cannot be restored until a registered chapter exists for its book and an authorised reviewer confirms the correct mapping.

Admission-pattern source evidence is now enforced at activation, but the source-version reference is retained inside the existing version configuration rather than through a dedicated relational foreign-key column. A future schema migration could make that relationship structurally mandatory without changing the current student flow.

The user request listed CQ/written practice, video lessons, and full nationwide past-paper coverage as strategic needs. Those have not been fabricated or copied from unlicensed sources. They require reviewed original learning resources, explicit permissions, or official reusable evidence before publication.

## H. CONTENT GAPS

The current published, active-source bank contains **84 questions** across 14 chapter batches after the unmapped legacy question was quarantined. The table below records current coverage, not a claim of syllabus completion.

| Group | Subject | Paper | Covered chapter | Published questions | Gap status |
|---|---|---:|---|---:|---|
| Business Studies | Accounting 1st Paper | First | Accounting Equation Fundamentals | 4 | Further chapters and second paper needed. |
| Business Studies | Business Organization and Management 1st Paper | First | Business Organization Fundamentals | 4 | Further chapters and second paper needed. |
| Common Subjects | Bangla 2nd Paper | Second | Bangla Grammar and Usage Fundamentals | 4 | Both broader grammar coverage and Bangla 1st Paper are needed. |
| Common Subjects | English 2nd Paper | Second | English Grammar and Sentence Fundamentals | 4 | Further grammar chapters and English 1st Paper are needed. |
| Common Subjects | ICT | Combined | Number System and Digital Device | 8 | Additional ICT chapters needed. |
| Common Subjects | ICT | Combined | Web Design and Programming Fundamentals | 4 | Additional ICT chapters needed. |
| Humanities | Civics and Good Governance 1st Paper | First | Citizenship and Good Governance Fundamentals | 4 | Further chapters and second paper needed. |
| Humanities | Sociology 1st Paper | First | Social Institutions Fundamentals | 4 | Further chapters and second paper needed. |
| Science | Biology 2nd Paper | Second | Genetics and Cell Division Fundamentals | 8 | Biology 1st Paper is not currently publishable until its chapter registry is completed. |
| Science | Chemistry 1st Paper | First | Laboratory Safety and Core Concepts | 8 | Further chapters needed. |
| Science | Chemistry 2nd Paper | Second | Organic Chemistry and Formula Fundamentals | 8 | Further chapters needed. |
| Science | Higher Mathematics 2nd Paper | Second | Differentiation and Integration Fundamentals | 8 | Higher Mathematics 1st Paper and further chapters needed. |
| Science | Physics 1st Paper | First | Physical World and Measurement | 8 | Further chapters needed. |
| Science | Physics 2nd Paper | Second | Current Electricity and Circuit Fundamentals | 8 | Further chapters needed. |

No English-version Humanities or Business Studies question coverage should be presented until official English-version source evidence exists. The platform correctly keeps these boundaries separate from the Bangla releases.

## I. PRODUCTION READINESS

> **Classification: Almost ready.**

The core assessment, review, source-governance, progress, daily-study, live-exam, and admission-pattern foundations have been audited and are operational under the validated contracts above. The application now has a stricter content-quality release gate, clearer management separation, truthful empty states, and verified responsive student flows.

It should not yet be described as fully ready for broad national HSC and admission preparation because the source-governed question bank covers only selected chapter batches, one legacy record remains quarantined pending a registered chapter, and national past-paper, CQ, learning-resource, and verified admission-pattern coverage are still incomplete. Future releases should prioritise reviewed curriculum expansion and official-source registration over adding new product surface area.
