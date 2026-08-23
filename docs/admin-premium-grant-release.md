# Administrator Premium Grant Release

## Scope

This release implements the one confirmed capability missing from the updated freemium brief: a protected administrator can grant, extend, or revoke a learner’s Premium entitlement without creating a new page or weakening the existing bKash/Nagad payment reconciliation flow.

## Delivered workflow

The existing administrator-only `/admin/payments` reconciliation workspace now contains a compact **Administrative Entitlement** section. An administrator searches by at least two characters of the learner’s name or email, selects one returned learner, enters a required reason, and can grant a selected plan for a bounded custom number of days, extend an active Premium term, or revoke an active Premium term.

| Action | Server-side effect | Permanent evidence |
| --- | --- | --- |
| Grant Premium | Activates Premium, sets a non-renewing expiry, and records the selected plan and optional amount. Existing active access is extended from its current end date; inactive access starts a fresh term. | A successful `manual_grant` payment row, `subscription.manual_grant` audit event, and critical learner notification. |
| Extend Premium | Adds 1–365 days only to an active Premium entitlement and turns off auto-renew. | `subscription.manual_extend` audit event and critical learner notification. |
| Revoke Premium | Immediately changes an active Premium entitlement to free/expired and turns off auto-renew. | `subscription.manual_revoke` audit event and critical learner notification. |

## Boundaries retained

Manual grants are not a substitute for payment verification. They do not approve, reject, or alter pending bKash/Nagad requests, which remain in the reconciliation queue and must be independently reviewed. The new `manual_grant` payment gateway value separates administrator-issued access from learner-submitted manual payment channels.

All action procedures remain administrator-only, require a 5–500 character reason, validate duration/amount ranges on the server, derive every entitlement date on the server, and use owner-scoped student notifications. No client can assign Premium to itself, and no active SSLCommerz flow has been enabled without verified merchant credentials and callback validation.

## Verification

The additive migration expands only the `payments.gateway` enum. Database-backed coverage verifies grant, extension, revocation, manual-grant payment origin, audit events, and three learner notifications. The full regression suite, migration integrity check, production build, and desktop/mobile administrator workspace review completed successfully.
