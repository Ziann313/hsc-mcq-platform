# Public Motion Refinement and Authentication Deferral

## Refined public experience

The existing MCQ GURU public landing remains the original learning-signal design. This refinement adds a subtle signal-scan over the hero board, staggered hero entrance motion, and a loader satellite pulse. These are CSS-only decorative effects: they make no network request, add no artificial delay, and are disabled by the established reduced-motion preference handling.

The public landing still derives visible subject capacity from the governed availability query, preserves secure OAuth sign-in calls, and uses the same safe post-sign-in path handling. No reference-site asset, copy, layout, or animation sequence was introduced.

## Local authentication status

Local email/password authentication is **deliberately deferred**, not partially enabled. A complete system requires a verified transactional sender for account verification and password recovery. The configured Resend credentials failed repeated read-only validation, and the project has no verified sender domain. The existing OAuth flow remains the sole live sign-in path, preserving account security rather than allowing unverified local passwords or reset links that cannot be delivered.

| Area | Current decision |
| --- | --- |
| Public homepage and loader | Refined and live. |
| OAuth sign-in | Preserved as the canonical production authentication method. |
| Local registration/password storage | Not created. |
| Email verification/reset tokens | Not created, because secure delivery is unavailable. |
| Resend sender | Deferred until a verified domain and successful read-only credential validation exist. |

## Validation record

TypeScript checking, public-motion, route-integrity, and first-visit tests passed. The production build completed with PWA precaching, and a clean-browser public landing review confirmed the original hero, real subject capacity, and sign-in controls render correctly.
