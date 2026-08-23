# Prompt 5 Content, Monetization, Performance, and Compliance Compatibility Record

**Scope.** This record reconciles `Prompt_5_MCQ_GURU_Content_Monetization_Performance_Compliance.md` with the active MCQ GURU architecture under the standing audit-first, no-duplication policy. One confirmed compliance gap and one shared accessibility gap were implemented: a concise public refund-policy route and keyboard skip-navigation/accessibility labels in the shared application shell.

| Brief area | Active platform position | Compatibility decision |
| --- | --- | --- |
| Previous-year questions and board filters | Previous-year access is limited to authorised, reviewer-verified aggregate analysis. Student questions are source-governed original or authorised content delivered only through frozen attempts. | Preserved. No copying, bulk seeding, or broad PYQ browsing endpoint was added. |
| HSC and admission preparation | Protected compatibility paths already lead to group-safe HSC setup, source-tagged admission practice, official-notice records, and versioned pattern availability. | Preserved. No duplicate pages, invented eligibility calculator, or unsourced cut-off table was added. |
| Formula rendering | KaTeX and a trusted curriculum-formula component are already installed. The current content contract does not broadly parse arbitrary question, learner, or Tutor text as LaTeX. | Preserved. No second math library or unreviewed HTML/LLM-to-KaTeX path was added. |
| Written practice, grade prediction, and peer comparison | The immutable engine provides real result, weak-concept, progress, and leaderboard data; it does not claim official written-paper grading or predictive admission outcomes. | Preserved. No misleading written-answer, grade-prediction, or cross-pattern percentile feature was added. |
| Payments and subscription | Trial, server-enforced free limits, Premium access, manual bKash/Nagad proof review, administrator reconciliation, and a credential-gated SSLCommerz boundary already exist. | Preserved. No duplicate plans, insecure checkout, or activation without verified payment callback/review was added. |
| PWA, cache, and scheduling | Service-worker registration, manifest, static-asset precaching, route lazy loading, query caching, error boundaries, skeletons, pooled database access, and compliant scheduled handlers already exist. | Preserved. No authenticated answer caching, offline submission queue, `node-cron`, or duplicate scheduler was added. |
| Legal and accessibility surfaces | Terms and privacy routes exist; the shared shell lacked a public refund route and keyboard skip target. | Implemented `/refund`, a main-content skip link, and accessible names for menu, language, notification, and close controls. |
| Destructive cleanup | Concepts, versioning, profiles, patterns, and practice records support source governance, immutable assessment, and learning recommendations. | Preserved. No active table or framework dependency was removed on an assumption that it was unused. |

## Refund-policy boundary

The new public policy accurately reflects the live payment model: a manual bKash/Nagad request or screenshot remains pending until an authorised reviewer verifies the record; it is not itself a payment confirmation. Refunds and disputes are directed to support with the payment reference for case review. The policy intentionally does not promise a fixed refund window or outcome without a reviewed payment and applicable consumer-protection context.

## Deliberate exclusions

No account-deletion workflow, date-of-birth gate, automatic email campaign, or scheduled study reminder was introduced from this prompt alone. These functions require a fuller privacy/retention policy, verified transactional-email configuration, and a carefully specified consent/eligibility model. The existing subscription-maintenance schedule remains the appropriate platform-managed route for entitlement expiry rather than adding in-process timers.

## Validation record

TypeScript checking, route/shell regression coverage, and the production build passed. The build retained service-worker precaching and existing code splitting. Mobile checks confirmed the new `/refund` page and the authenticated shared shell render correctly.
