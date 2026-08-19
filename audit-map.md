# MCQ GURU In-Place Audit Map

This working map records confirmed findings from the current implementation before remediation. It is not a replacement architecture and does not authorize removal of working systems.

## Baseline observed

| Area | Current verified baseline |
|---|---|
| Server authorization | `protectedProcedure` requires a user and `adminProcedure` checks `ctx.user.role === "admin"`. Administrative mutations use the server-side admin procedure. |
| MCQ attempts | Filtered attempts are built from published, active-source questions on the server, frozen, owner-scoped, option-scoped, and scored from the frozen snapshot. |
| Results and expiry | Attempt results auto-finalize expired attempts using persisted selections. Regular and live attempts are owner-scoped. |
| Live exams and challenges | Source-validated questions, lifecycle synchronization, duplicate daily challenge prevention, participant ownership, and integrity-warning auto-submit are implemented. |
| Tutor and image solver | Both retrieve active source evidence first and return an explicit unverified response when evidence is absent. |
| Progress and daily study | Metrics use persisted attempts; Today’s Study applies group, chapter performance, recency, and open-mistake signals. |
| Test baseline | TypeScript passed. Vitest: 56 passed, 1 skipped, before this audit’s code changes. |

## Confirmed P0/P1 findings

| Priority | Finding | Root cause | Safe remediation direction |
|---|---|---|
| Resolved P0 | Client admin routes used `StudentRoute`, so authenticated students could open management pages even though mutations were server-blocked. | No client-side admin route gate. | `AdminRoute` now mirrors the actual server role model; `adminProcedure` remains authoritative. |
| Resolved P0 | Navigation accepted reviewer/content-admin/super-admin labels while the deployed user role schema supports only `user` and `admin`. | UI role vocabulary diverged from authorization schema. | Navigation now grants governance visibility only to `admin`. |
| Resolved P0 | A published Biology question (`id=870001`) had no chapter mapping. | Legacy/publication policy did not require complete curriculum mapping. | The record was quarantined to `needs_review`; future publication now requires a consistent book/chapter chain. |
| P0 | Review creation and bulk import omit chapter and content-language fields in their API/UI contracts even though the database supports them. | Intake contract does not expose the full governed taxonomy. | Require chapter, book-consistency, and language at review intake; preserve the human-review lifecycle. |
| P1 | Publication validates source activity and options, but not chapter/book/subject/year consistency or duplicate equivalence. | Publication policy has incomplete content-validation invariants. | Add a shared validation gate and surface errors in the existing review queue. |
| P1 | Source registration can add versions without superseding an existing active source version. | No explicit activation transition policy in the registration helper. | Add a source-version transition that archives/supersedes prior active versions only when a new version is activated. |
| P1 | Admission patterns hold a URL in JSON rather than a source-version relation; the management page has official-looking prefilled defaults and weak access/error states. | Pattern registry is not fully tied to the existing source/version workflow. | Require a reviewed source version for activation, add access/error states, and use neutral empty forms. |
| P1 | Weekly leaderboard client key is daily ISO text, but the server writes ISO-week keys. | Client/server period-key contract mismatch. | Share an ISO-week key utility and add regression coverage. |
| P2 | Cheat-sheet empty state renders a hardcoded quadratic formula preview. | Student-facing placeholder is used when no published sheet exists. | Replace with a truthful unavailable state. |
| P2 | Community comments accept any existing question, including non-public records. | Comment check tests existence only. | Restrict public read/write discussions to published, source-valid questions. |

## Data-quality snapshot

The live database contains 85 published questions. The audit found one published question with a missing chapter, no detected chapter/book mismatch, and no detected missing-book reference among published questions. Source/option aggregate checks should be rerun after the publication-policy hardening because SQL aggregate semantics can otherwise obscure zero-row anomaly counts.

## Protected systems not to redesign

The following implementations already meet the current reliability direction and should receive regression-only changes unless a defect is demonstrated: MCQ scoring; negative marking; frozen attempts; expiry finalization; mistake re-tests; spaced review; active-source question retrieval; real progress calculation; performance-aware Today’s Study; daily challenge deduplication; live-exam lifecycle; admission version concepts; import-to-human-review behavior; and the existing test suite.
