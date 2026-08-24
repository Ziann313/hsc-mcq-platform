# Vercel Deployment Record

**Scope.** This record covers the user-authorized Vercel upload attempt for the current MCQ GURU release. It preserves the working managed deployment and the existing Express, tRPC, database, OAuth, PWA, source-governance, and immutable-assessment contracts.

| Area | Verified status | Decision |
| --- | --- | --- |
| Source publication | Local `main` was pushed to the public GitHub repository: [Ziann313/hsc-mcq-platform](https://github.com/Ziann313/hsc-mcq-platform). | Complete. |
| Vercel adapter | `createApp()` is shared by the managed Node entrypoint and `api/index.ts`; `vercel.json` requests Node 22, a pnpm build, bundled `dist/public/**`, and an SPA rewrite. | Preserved. |
| Git project import | The Vercel integration reported a project creation result but could not verify the Git link; subsequent project lookup/listing returned no accessible project. | Blocked by Vercel-side project/repository authorization. |
| Direct upload | A deployable 227-file source package was prepared without generated output, documentation, tests, migration snapshots, or secrets. Vercel rejected both production and preview deployment calls with HTTP 403: the connected role cannot create deployments. | Blocked by Vercel-side deployment permission. |
| Managed hosting | The current MCQ GURU managed deployment remains unchanged. | Preserved. |

## Required Vercel configuration after deployment permission is granted

No existing secret value was copied from managed hosting. A Vercel project must receive its own environment-variable values through an authorised configuration surface. The application requires `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, and `OWNER_NAME`. Features that use the built-in service proxies also require `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, and `VITE_FRONTEND_FORGE_API_KEY`.

The database must be reachable from Vercel serverless functions, use the provider-required TLS/connection settings, and tolerate serverless connection patterns. Manus OAuth must be configured to allow the stable Vercel callback origin in the form `https://<deployment-domain>/api/oauth/callback`. The existing nonce-bound state and secure cookie flow must remain intact; a Vercel URL alone does not make database-backed or OAuth-protected flows operational.

> A successful source upload is distinct from a fully configured production service. No Vercel build, public URL, OAuth login, tRPC call, or database operation could be verified because Vercel rejected deployment creation before build execution.

## Validation record

Before the external upload attempt, the Vercel adapter passed TypeScript validation, `server/vercelDeployment.test.ts`, related route/public-motion tests, and a production Vite/PWA build. The current source commit was then pushed to GitHub. The Vercel provider returned HTTP 403 for both production and preview deployment attempts; no secrets, callback allow-list changes, database changes, or managed-hosting changes were made.

## Recovery path

An owner or team administrator must grant a role that can create deployments for the `Vasco` Vercel team and authorise the GitHub repository integration. After that, link `Ziann313/hsc-mcq-platform`, configure the listed variables in Vercel, register the stable Vercel OAuth callback origin, then run and inspect a deployment. Until those provider-side prerequisites are met, the managed MCQ GURU deployment is the supported live service.
