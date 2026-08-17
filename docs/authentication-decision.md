# Authentication Decision

MCQ GURU currently uses the project’s configured secure platform sign-in as its production authentication path. It is the only sign-in method displayed to students in the account experience.

Google OAuth is intentionally **disabled** rather than shown as a broken option. The configured Google client is rejected by Google with `invalid_client`; enabling it would create an unreliable sign-in path. When a valid Google OAuth 2.0 Web application client is available, set `GOOGLE_OAUTH_ENABLED=true`, register the exact callback URI, and run `server/google-oauth-credentials.test.ts` before exposing a Google button.

This design preserves secure account access and real-profile data now, while treating Google as an additive integration rather than a prerequisite for student learning.
