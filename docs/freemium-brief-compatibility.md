# Freemium Subscription Brief Compatibility Record

## Decision

The attached freemium brief was audited against the live MCQ GURU subscription, payment, proof, review, notification, and entitlement implementation. Its requested core system is already present. No duplicate subscription tables, payment routes, upgrade page, trial banner, plan cards, manual-payment form, or feature-gating middleware were added.

| Brief requirement | Existing MCQ GURU implementation | Decision |
| --- | --- | --- |
| Premium Monthly and Yearly plans | Active `premium-monthly` (৳199 / 30 days) and `premium-yearly` (৳999 / 365 days) seeds, including bilingual descriptions and premium feature metadata. | Preserved. |
| Thirty-day full-access trial | A one-per-user entitlement is created with a 30-day trial; active trials have full access. | Preserved. |
| Free-tier limits | Server-side Bangladesh-time reservations enforce 20 practice questions/day, one exam/week, five Tutor requests/day, and two Image Solver requests/week after the trial. | Preserved. |
| Upgrade page | `/upgrade` already contains live plan cards, manual bKash/Nagad choice, receiver number `01956953111`, transaction and sender validation, optional proof upload, and safety copy. | Preserved. |
| Payment proof | JPEG, PNG, and WebP are limited to 5 MB, validated by type and file signature, stored as S3 metadata references, and available only through the administrator review flow. | Preserved. |
| Manual payment review | `/admin/payments` provides protected pending-request review, proof preview, reviewer notes, approval/rejection, audit records, and critical in-app outcome notifications. | Preserved. |
| Trial and expired messages | The shared authenticated shell mounts a subscription banner with a trial countdown/upgrade action and a persistent expired state. | Preserved. |
| Account subscription details | The authenticated account page already shows entitlement state, expiry, payment history, auto-renew setting, and upgrade route. | Preserved. |
| Scheduled expiry maintenance | The established daily Bangladesh-time maintenance task expires trials/premium terms and removes stale usage records. | Preserved. |

## Secure gateway boundary

The codebase already contains a server-side SSLCommerz checkout initiation boundary. It remains deliberately unavailable because no verified SSLCommerz merchant credentials are configured. The application does not claim a checkout is live, redirect learners to a sandbox that cannot validate a real payment, or grant Premium from a callback without independent server-side validation.

Manual bKash/Nagad requests remain the active payment method. A request, transaction reference, sender number, or screenshot is not treated as payment confirmation; only a protected administrator approval activates Premium.

## Deliberate non-duplication

The brief asks to add broad premium-only locks to study planning, notebook, insights, and historical practice. MCQ GURU currently enforces limits at high-cost and abuse-sensitive server operations while preserving the established real learning workflows. Adding client-side overlays or arbitrary new blocks would duplicate access logic, create mismatches with existing entitlements, and reduce access to working study tools without a separately approved product-policy change.

This release therefore makes no functional entitlement change. The next safe payment expansion is to obtain verified merchant credentials, then add server-side validation and idempotent callback handling before enabling SSLCommerz checkout.
