# MCQ GURU Freemium Subscription Release

## Released Access Model

MCQ GURU now creates a **30-day full-access trial** for each learner through a server-side subscription record. When a trial or paid entitlement has ended, the student remains on the free plan rather than losing access completely. The free plan permits 20 practice questions per Bangladesh calendar day, one full exam per Bangladesh calendar week, five Tutor questions per day, and two Image Solver requests per week. Premium subscriptions remove these limits and expose the detailed learning features already governed by the platform.

All access decisions are resolved on the server. The browser receives descriptive status and usage data, but cannot change subscription status, remaining usage, or payment outcome.

## Manual bKash and Nagad Payment Flow

The Premium page presents clear bKash and Nagad logo options and the user-authorized receiver number **01956953111**. A learner chooses a plan, sends the exact listed amount, and submits their sender number and transaction ID. That submission creates only a **pending review record**. It does not enable Premium.

An administrator must independently verify the payment in the relevant payment channel and explicitly approve the request in the protected admin queue. Approval records the reviewed payment, applies the plan duration to the learner's entitlement, and activates Premium. Rejection records a failed manual request without changing access. The interface expressly tells students never to submit PINs, OTPs, or passwords.

## Payment Boundary

An SSLCommerz hosted-checkout module is prepared but intentionally inactive because no merchant credentials were supplied. It follows the provider's documented server-created session, callback, IPN, and transaction-validation model; live activation requires valid merchant credentials and server-side validation before any entitlement changes.[1]

## Scheduled Maintenance

The deployed application includes a cron-only subscription-maintenance endpoint. Its idempotent task resolves expired trials and Premium terms to the free plan and clears old usage-window rows. The final project-level schedule is created only after the release is live so it runs against the deployed endpoint.

## Validation

The release has database-backed coverage proving that a manual payment request remains pending until human approval, after which a Premium entitlement is created. It also covers Bangladesh calendar usage keys, trial/premium access policy, live-exam cleanup with subscription foreign keys, full regression testing, production build, migration integrity, and mobile payment rendering.

## References

[1] [SSLCommerz, *Integrate API Documentation*](https://developer.sslcommerz.com/doc/v4/)
