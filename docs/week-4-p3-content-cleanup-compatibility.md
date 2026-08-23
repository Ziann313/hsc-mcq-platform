# Week 4 P3 Content and Cleanup Compatibility Record

**Scope.** This record reconciles `Prompt_Week4_P3_Content_Cleanup.md` with the current MCQ GURU platform. The attachment contains several requests that would duplicate existing protected routes or create unlicensed/unsupported educational claims. No historical paper text, fabricated cut-off data, guessed eligibility rules, client answer exposure, or destructive schema/package removal was introduced.

| Requested P3 outcome | Verified active implementation | Compatibility decision |
| --- | --- | --- |
| Previous-year questions | `/previous-year-questions` explicitly maps to protected historical analysis, showing only authorised source-linked aggregate records and truthful empty states. | Preserved. No copied board/university/medical question table, fake seed SQL, or public question browser was added. |
| HSC preparation | `/hsc-prep` maps to the governed HSC setup with Science, Humanities, and Business Studies filters carried to server-side frozen selection. | Preserved. No static subject IDs, invented counts, or duplicate page were added. |
| Admission preparation | `/admission-prep` maps to the reviewed admission workflow. DU, BUET, and MBBS use exact source-tag capacity; unsupported tracks remain unavailable. | Preserved. No guessed cut-offs, GPA eligibility checker, or unrelated fallback content was added. |
| Formula rendering | KaTeX and the trusted curriculum `MathFormula` component are already installed. | Preserved. A broad parser for arbitrary question, learner, or Tutor text was not added without a reviewed formula-content contract. |
| Grade prediction and peer comparison | Dashboard uses real attempts, results, weak concepts, and verified admission benchmark records when available. | Preserved. No misleading HSC-grade prediction or cross-paper percentile comparison was fabricated from heterogeneous attempts. |
| Question images | Source-governed question versions support reviewed content metadata. | Preserved. No unverified remote image field was added to active attempt delivery. |
| Dead-code cleanup and indexes | Concepts, question versions, profiles, patterns, Tutor tables, study plans, and governance records are actively used by source control, frozen snapshots, and learning intelligence. | Preserved. No destructive table/package deletion or unvalidated FULLTEXT index migration was performed. |

## Deliberate deviations

The proposed historical-content seed reprints questions and answers with board/year provenance but provides no reuse authorization, source version, or independent verification. MCQ GURU must continue to publish independently authored or authorised reviewed questions and contextual historical analysis only. Static admission cut-offs and GPA eligibility rules are likewise withheld until current official evidence is available.

The requested cleanup would remove schema central to source governance and immutable assessment. The full-text migration was not introduced because it is not a drop-in replacement for the active parameter-bound evidence matching policy and must be designed against the production database/search requirements before adoption.

## Validation record

TypeScript checking, historical-analysis, admission-practice, question-access, and route-integrity tests passed; the production build completed and retained PWA precaching. Mobile direct-route review confirmed governed HSC and admission setup plus a truthful empty historical-analysis state, rather than fabricated content.
