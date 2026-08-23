# HSC MCQ P0 Fixes Compatibility Record

**Scope.** This record reconciles `HSC_MCQ_P0_Fixes.md` with the current MCQ GURU platform. The brief describes an earlier template architecture. Its routing, database, dashboard, authentication-hook, and administrator-control issues have already been addressed through stronger current implementations; no duplicate system was added.

| Requested P0 outcome | Current implementation | Decision |
| --- | --- | --- |
| Remove broad rest route and use explicit pages | The route registry has explicit student/admin/public paths, safe modern redirects, and a final NotFound fallback. Route regression forbids `/:rest*`. | Preserved. |
| SPA direct-link fallback | Production static serving falls through to `index.html` for non-file routes. Anonymous direct `/practice` and `/admin` loads reached the app and showed a bilingual sign-in notice rather than a raw 404 or workspace. | Preserved; hash routing was not introduced. |
| Local email/password auth | Current secure OAuth flow is canonical. Local passwords would require hashing policy, email verification, password reset/recovery, abuse controls, and updated consent/retention work. | Deferred pending a complete authentication design; no insecure partial password implementation was added. |
| Real dashboard data | The dashboard already uses protected profile, learning, availability, coverage, and submitted-attempt contracts rather than hardcoded learner metrics. | Preserved. |
| `useAuth` side effect | Local storage mirroring already occurs in a `useEffect`, outside `useMemo`, with restricted-storage handling. | Preserved. |
| dotenv dependency | Installed resolution is `dotenv 17.2.3`; the brief’s claim that version 17 does not exist is stale. | Preserved; no destructive lockfile/node_modules reset or downgrade was performed. |
| Admin guard | `AdminRoute`, server role checks, safe unauthenticated return handling, and Access Denied behavior already protect administrator pages. | Preserved. |

## Validation record

Read-only verification found an explicit static SPA fallback, a final NotFound route, and no broad rest route. Anonymous browser tests of direct `/practice` and `/admin` links returned the public sign-in state rather than protected content. TypeScript and focused authorization, first-visit, security, route-integrity, safe-navigation, and public-motion tests passed with **20 tests**.
