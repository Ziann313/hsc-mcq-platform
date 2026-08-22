# Question-Bank Brief Compatibility Record

## Scope

This record reconciles `MCQ_GURU_Prompt_2_Question_Bank.docx` with the live MCQ GURU question bank. The attached brief assumes an earlier, largely empty implementation. MCQ GURU already has an academic hierarchy, source-governed questions, review and publication controls, immutable attempts, server-side scoring, answer persistence, mistake tracking, real dashboard metrics, and responsive student preparation routes.

## Requirement reconciliation

| Brief request | Current MCQ GURU implementation | Decision |
| --- | --- | --- |
| Group → subject → chapter catalog | The academic-group, subject, book, chapter, topic, and concept hierarchy already exists and drives the live published-content availability and preparation filters. | Preserved; no duplicate catalog tables or seeded placeholder chapters. |
| Questions, options, difficulty, explanations, bilingual content, and negative marks | Existing question, option, question-DNA, source, version, intelligence, and immutable snapshot contracts already support these capabilities. | Preserved; no replacement schema. |
| Mass seed of 200 “real” questions and supplied examples | The brief has no reuse authorization, source-version evidence, page references, or human-review record for copied or historical content. | Not seeded. New content must be original and curriculum/pattern-linked, or authorised with recorded evidence and reviewer approval. |
| Public question-browsing API | Full prompts, explanations, and options should not be browsable outside a controlled activity merely because the answer flag is hidden. | Strengthened. Full `publishedQuestions` browsing is now administrator-only; students receive prompts, options, explanations, and answer review through their server-frozen attempt lifecycle. |
| Student-facing capacity discovery | Students need to know which source-linked content is available without receiving a scrapeable item bank. | Added `publishedQuestionCapacity`, which reports only total, subject, and chapter counts under the existing published/active-source filters. |
| Practice and exam creation | Existing `startFilteredAttempt` performs server selection, freezes content and option order, persists answers and review flags, finalizes from the server clock, scores server-side, and updates the mistake vault. | Preserved; no client-provided question set or client-side grading route was added. |
| Static HSC, Medical, and Engineering “default exams” | Specific official profiles/patterns remain unavailable until review confirms session, date, question total, duration, marking, negative marking, and authorised capacity. | Not fabricated or activated from the brief. |
| Real dashboard metrics and mistake notebook | Existing dashboard, attempt history, result review, and mistake-vault queries read persisted learning records. | Preserved; no mock metrics or duplicate practice-session table added. |

## Implemented access boundary

The question-bank API is now deliberately split. `publishedQuestionCapacity` is suitable for public availability cards and admission-track readiness controls because it returns only aggregate counts. `publishedQuestions` is limited to the administrator workflow that schedules source-linked live challenges. Student practice, examinations, live rooms, resumption, submission, scoring, and review continue to use frozen server-owned attempts.

This also avoids a misleading implementation of the brief’s suggested `gradeAnswers` endpoint, which would return correct option identifiers to the caller. Correct options remain in immutable server snapshots and appear in the owner’s post-submission review only.

## Content-release rule

Each student-releasable question must retain an active source version, academic-chain mapping, validated answer/options, reviewer approval, and publication state. The existing importer and reviewer workflows remain the appropriate path for authorised batches. The platform must not download textbooks, copy protected board/admission papers, or claim that an independently authored item is an official historical question.

## Validation

The release adds authorization and safe-capacity regression coverage. It verifies that anonymous and ordinary student callers cannot retrieve the administrator full-content payload, aggregate capacity does not contain prompt, explanation, option, or answer-key fields, and administrator browsing still strips `isCorrect` from option responses. The broader assessment, frozen-attempt, source-quality, and content-capacity tests continue to pass.

Browser verification confirmed that an unauthenticated `/practice` visit returns to the secure landing/sign-in flow. The public landing may display aggregate subject availability, but it does not display individual prompts, options, explanations, or answer keys.
