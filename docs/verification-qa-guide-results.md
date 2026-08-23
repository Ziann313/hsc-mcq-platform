# Verification and QA Guide Results

**Scope.** This record evaluates `MCQ_GURU_Verification_QA_Guide.md` against the current MCQ GURU architecture. The guide is useful as a launch-review checklist but several items refer to an earlier client-driven design and should not be treated as acceptance criteria for this source-governed, immutable server-authoritative platform.

## Automated results

| Check | Result | Notes |
| --- | --- | --- |
| TypeScript | Pass | `pnpm check` completed successfully. |
| Full regression suite | Pass | **103 passing tests**, **1 intentional skip**. |
| Drizzle integrity | Pass | `pnpm drizzle-kit check` completed successfully. |
| Production build | Pass | Build completed and the PWA generated a 74-entry static precache. |
| P0 string scan | Pass | No active `Shikha`/`শিখা` or `gradePreview` match in client/server TypeScript sources. |
| Direct mobile-route review | Pass | Landing, governed practice, frozen-attempt entry, Terms, and Refund routes loaded correctly. |

## Guide items reconciled to the active platform

| Guide assumption | Current MCQ GURU verification | Result |
| --- | --- | --- |
| Client `getQuestions`, `submitExam`, `saveAnswer`, and `getExamAttempt` endpoints | The canonical protected contracts are `startFilteredAttempt`, `saveAttemptSelection`, `activeAttempt`, and `submitFrozenAttempt`. They preserve server selection, frozen snapshots, owner checks, and server scoring. | Verified; guide names are stale. |
| No `correctOptionId` anywhere in source/client | Active attempt payloads omit answer keys. Internal frozen snapshots retain correctness for server scoring, and post-submission review intentionally contains correct option IDs. | Verified boundary; a literal whole-repository string scan is not a valid leakage test. |
| PYQ table with mass seed data | Historical material is authorised aggregate analysis; student practice is independently authored or authorised, reviewer-approved content. | Deliberately excluded; no unlicensed PYQ seeding. |
| Static subject IDs, cut-offs, eligibility, and grade prediction | HSC/admission preparation uses source-governed availability and official-version gates. | Deliberately excluded until evidence exists. |
| Three-plan SSLCommerz/SMTP/node-cron configuration | Trial/Premium/manual bKash-Nagad reconciliation and supported maintenance are active. SSLCommerz and email remain credential-gated. | Preserved; no unverified provider activation. |
| Broad API response cache/offline submission queue | Static PWA precaching is active. Authenticated tRPC responses and immutable exam submissions are not cached or queued. | Verified safety boundary. |
| Generic SM-2 client mutation | Mistake review advances from server-scored frozen review attempts. | Verified; client-reported correctness is intentionally rejected. |
| Table/package removal by name | Concepts, question versions, profiles, patterns, Tutor, and study data are active architecture. | Deliberately excluded; no destructive cleanup. |

## QA limitations and follow-up

Database failure simulation, third-party payment sandbox checkout, transactional email, and account deletion were not executed because they require credentials, retention/consent rules, or could change production data. The user-facing offline banner was source-tested and production-built, but browser network emulation is still recommended before a launch campaign.

The production build reports a large shared JavaScript chunk. It does not block the current build, PWA, or route functionality; measure bundle composition before selectively splitting shared dependencies.

## Conclusion

No confirmed regression requiring code remediation was found by this QA pass. The guide’s useful tests have been executed or mapped to stronger existing controls, while its stale/unsafe assumptions are documented for future verification.
