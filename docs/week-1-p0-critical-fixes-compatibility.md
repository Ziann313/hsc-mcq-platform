# Week 1 P0 Critical-Fixes Compatibility Record

**Scope.** This record reconciles `Prompt_Week1_P0_Critical_Fixes.md` with the latest MCQ GURU implementation. All ten requested P0 outcomes were already present through prior audited releases. No duplicate routing, grading, entitlement, rate-limit, or administrator-guard implementation was introduced.

| Requested P0 outcome | Verified active safeguard | Compatibility decision |
| --- | --- | --- |
| SPA direct-route recovery | Production static serving and explicit client routing support direct dashboard, practice, and administrator paths; the application retains a final NotFound fallback. | Preserved. No broad client rest-route or unsafe catch-all replacement was added. |
| Parameter-safe source evidence | `getActiveSourceEvidence` binds user text through Drizzle SQL and `CONCAT('%', value, '%')`. | Preserved. No string-interpolated `LIKE` predicate remains in the active evidence path. |
| Explicit database failures and pooling | `getDb()` requires a usable `DATABASE_URL`, uses a shared `mysql2/promise` pool with a connection limit of ten, and raises clear initialization errors. | Preserved. Truthful empty states in noncritical product reads were not converted into crashes. |
| MCQ GURU branding | Active client, server, template, and HTML source has no Shikha/শিখা reference. | Preserved. No broad replacement affecting historical documentation was necessary. |
| Landing sign-in | The public landing page contains visible sign-in controls and secure OAuth return-path handling. | Preserved. |
| Tutor and Image Solver abuse controls | Tutor has a ten-per-hour policy; Image Solver has a distinct two-per-hour policy, both in addition to subscription usage enforcement. | Preserved. |
| Answer-key leakage | No `gradePreview` endpoint exists. Frozen attempts omit answers from active client payloads and are scored server-side. | Preserved. No client-defined `startExam` or `correctOptionId` contract was reintroduced. |
| Administrator UI access | Protected routes use the existing role-aware `AdminRoute` and server administrator procedures. | Preserved. Role support remains compatible with admin, content_admin, and super_admin safeguards. |

## Validation record

TypeScript checking passed. Focused P0, integrity, live-exam policy, and route-integrity coverage reported **13 passing tests**. Direct desktop route review confirmed `/dashboard`, `/practice`, and `/admin` load through the application and retain their existing protected route behaviours. Fresh source scans returned no active Shikha/শিখা or `gradePreview` matches.
