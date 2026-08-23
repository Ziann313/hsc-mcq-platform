# Week 5 P4 Production-Readiness Compatibility Record

**Scope.** This record reconciles `Prompt_Week5_P4_Production_Readiness.md` with the current MCQ GURU platform. The release adds one confirmed, low-risk PWA feedback gap: an accessible shared offline-status indicator. It preserves the existing secure payment, entitlement, PWA, scheduling, performance, accessibility, and legal boundaries rather than duplicating or weakening them.

| Requested P4 outcome | Verified active implementation | Compatibility decision |
| --- | --- | --- |
| Subscription and payments | A 30-day trial, Bangladesh-time entitlement limits, Premium access, bKash/Nagad manual proof review, payment audit, protected reconciliation, and notifications are active. SSLCommerz remains a credential-gated server boundary. | Preserved. No duplicate plans or unverified SSLCommerz callback was activated. |
| PWA/offline support | Workbox service-worker generation and static asset precaching are active. Shared authenticated tRPC responses and active submissions are intentionally not cached. | Added an offline-status indicator. No question/answer cache or queued exam submission was introduced. |
| Toasts and scheduled maintenance | Sonner feedback is mounted and critical flows surface errors/success. Subscription maintenance uses the supported Heartbeat workflow. | Preserved. No SMTP fallback, in-process `node-cron`, or duplicate expiry job was introduced. |
| Performance | Lazy routes, code splitting, loading states, pooled database access, focused query policies, and existing indexes are active. | Preserved. The production build remains successful; bundle warnings remain a future optimisation task, not a reason to duplicate route architecture. |
| Accessibility | The shared shell has a skip link and accessible icon-control labels. | Added an `aria-live` offline status message that responds to browser online/offline events. Dark mode was not added because the current light theme is deliberate and the request did not establish a safe theme-token audit. |
| Legal and account controls | Public Terms, Privacy, and Refund pages are active. | Preserved. Account deletion and age-gating require a reviewed retention/consent policy, a full dependency map, and user-safe recovery/notice rules before activation. |

## Offline indicator boundary

`OfflineIndicator` listens only to the browser’s online/offline events and announces loss of connectivity. It makes no network request, writes no cache, and queues no mutation. This keeps it compatible with immutable server-owned attempts: students receive a clear warning without being told that unsaved selections or answers are safely stored offline.

## Deliberate deviations

The attachment's SSLCommerz implementation would activate payment paths without verified merchant credentials and could rely on client-visible/default customer data. It remains unavailable until credentials and a server-side validation callback are verified. The proposed API cache would store authenticated learning responses and is therefore excluded. A broad account deletion transaction cannot be added safely without resolving payments, audit obligations, notifications, source review records, and retention requirements.

## Validation record

TypeScript checking, offline-indicator, P0 security, route-integrity, and subscription policy tests passed with **9 tests**. The production build completed with PWA precaching. The development service was restarted after a transient hot-reload import race; fresh server/browser logs showed a clean startup and no recurring resolution error.
