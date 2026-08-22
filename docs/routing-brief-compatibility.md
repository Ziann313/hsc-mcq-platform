# Routing Brief Compatibility Record

## Scope

This record reconciles `MCQ_GURU_Prompt_1_Routing_Fix.docx` with the live MCQ GURU route registry. The brief contains several stale implementation claims, so this release changes only the one confirmed gap: unauthenticated deep links did not preserve a student’s intended destination or show a clear sign-in notice.

## Reconciliation

| Brief item | Current state | Decision |
| --- | --- | --- |
| Broad `/:rest*` catch-all renders Home for every path | Not present. The router uses explicit paths and a final `NotFound` fallback. | Preserved and protected by regression coverage. |
| `/dashboard` returns 404 | Not present. `/dashboard` is explicitly registered and protected. | Preserved. |
| `Home.tsx` contains every page | Not present. `Home.tsx` is the authenticated dashboard surface; landing, practice, exams, Tutor, study plan, account, administration, live attempt, historical analysis, and other workflows already live in dedicated lazy-loaded modules. | No needless file split or component-directory duplication. |
| Landing has no sign-in controls | Not present. The header and hero already call the existing secure OAuth start handler. | Preserved. |
| Admin checks only the `admin` role | Not present. The shared authorization policy supports `admin`, `content_admin`, and `super_admin`. | Preserved, including the existing access-denied experience for signed-in non-administrators. |
| Protected links return students to their requested page after sign-in | Confirmed gap. Public visitors were redirected to `/` without storing their original safe internal destination or receiving a bilingual sign-in notice. | Fixed. |

## Implemented repair

The route guard now stores only safe internal destinations, displays **“Please sign in to continue / সাইন ইন করুন”**, and sends the visitor to the landing sign-in flow. After OAuth and profile resolution, the existing first-visit flow returns them to that intended destination; students with incomplete profiles still proceed through onboarding first. The same behavior now applies to unauthenticated administrator-route visitors.

The navigation helper rejects external-style URLs, protocol-relative values, and backslash-containing paths before they can be retained as a post-login destination. Signed-in users without an administrator role continue to receive the explicit access-denied screen rather than a silent redirect.

## Deliberate non-changes

No database schema, server API, question bank, payment, subscription, PWA, analytics, design-system, or page-splitting change was made. The existing route and page structure is already modular and code-split; duplicating it to match stale filenames from the brief would introduce unnecessary maintenance risk without improving accessibility.

## Validation

Type checking, the complete Vitest suite, and the production build completed successfully. Desktop route checks confirmed distinct dashboard, practice, exam-setup, Tutor, and final 404 surfaces; they no longer resolve to a common landing page. Mobile checks at 390px confirmed responsive practice, exam-setup, Tutor, and 404 surfaces. Fresh logs contain no new routing runtime error; the only module-resolution entry remains a historic, pre-existing log line followed by successful server startups.
