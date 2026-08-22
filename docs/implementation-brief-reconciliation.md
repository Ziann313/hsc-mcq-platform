# MCQ GURU Implementation-Brief Reconciliation

## Purpose

The supplied brief was written against an earlier, materially different version of the application. This release preserves the current production architecture and implements compatible gaps without undoing established security controls, source governance, immutable exam snapshots, or reviewer publication gates.

## Existing Capabilities Retained

MCQ GURU already uses URL-based Wouter routes, code-split page modules, protected student routes, server-selected frozen attempts, server-authoritative timing and scoring, persisted answers/review flags, active-attempt recovery, answer-key suppression during live attempts, reviewer-gated question publication, real dashboard metrics, PWA asset precaching, source-grounded tutoring, and a reviewer workspace. These existing systems remain the authoritative implementations rather than being replaced by the brief’s older proposed APIs.

## Completed in This Release

| Area | Change |
|---|---|
| Branding | Replaced the remaining active Tutor identity with **MCQ GURU**. The deployed HTML title and PWA metadata already used MCQ GURU. |
| Tutor cost controls | Added a 24-hour, in-memory response cache keyed by a SHA-256 digest of normalized academic year, language, and question. Cached data is copied on return and does not expose the learner’s raw question in cache keys. |
| Tutor abuse controls | Added a bounded per-user limit of ten Tutor requests per rolling hour. The learner receives a bilingual, friendly response when the limit is reached. |
| Authorization UX | Non-administrators now see a dedicated bilingual access-denied page for restricted workspaces instead of being silently redirected. The policy recognizes `admin`, `content_admin`, and `super_admin` if the identity system supplies them. |
| Regression coverage | Added deterministic tests for cache-key normalization, cache expiry, per-user rate limits, and administrative-role authorization. |

## Security-Preserving Decisions

The brief proposed client-side grading with answer keys delivered to the browser. MCQ GURU deliberately does **not** do this: answer keys remain inside immutable server snapshots until submission. The brief’s generic client-supplied `startExam` path is likewise not reintroduced because server-side question selection and frozen attempts already prevent tampering.

The service worker continues to precache application assets. It does not broadly cache authenticated tRPC responses because doing so could retain a learner’s protected attempts, results, or profile on a shared device. Offline-sensitive exam recovery remains server-backed and uses the existing persisted attempt lifecycle.

## Validation

The release passed TypeScript validation, the production build, the complete Vitest suite (80 passing tests and one intentional OAuth credential skip), focused Tutor/authorization policy tests, mobile Tutor rendering, and runtime-log inspection.
