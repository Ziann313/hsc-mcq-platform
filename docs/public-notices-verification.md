# Public Notices Feed Verification

**Verification date:** 2026-08-16

The live database query confirmed one published University of Dhaka record is eligible for the public `publishedAdmissionNotices` feed. The public tRPC query at `/api/trpc/learning.publishedAdmissionNotices` was then called against the running application and returned the same record, including its `id`, institution, title, session, `sourceUrl`, summary, and publication timestamps.

| Field | Verified value |
|---|---|
| Notice ID | 1 |
| Institution | University of Dhaka |
| Title | Undergraduate Admission System 2025–26 |
| Session | 2025–26 |
| Publication status | `published` |
| Canonical source | https://admission.eis.du.ac.bd/en/408b7c8ad06e4d9954fa2d948a01f508 |

The public `/notices` interface was also visually checked after this insert. Its card links back to the canonical University of Dhaka admissions portal and explicitly states that no deadline, eligibility, or pattern details are inferred from the portal-record entry.
