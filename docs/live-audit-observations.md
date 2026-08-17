# Live Audit Observations

## Root dashboard — 2026-08-17

**URL:** https://hscmcqapp-euxpe52h.manus.space/

The live dashboard loads and exposes navigation to practice, exams, exam lab, question bank, leaderboard, cheat sheets, Mistake Vault, community doubts, bulk import, AI Tutor, image solver, official notices, question intake, admission patterns, progress, study plan, mistakes, bookmarks, settings, and the content workspace.

The visible dashboard presents a user named **Zian**, a 7-day streak, 78% accuracy, 8h 25m study time, 12 completed tests, and multiple recommended next actions. These figures render as dashboard content; the audit must determine which are backed by persisted user activity versus static presentational data.

The page uses bilingual Bangla/English controls and renders at the live production URL. The sidebar is unusually extensive for a student dashboard and includes administrator-oriented destinations; authorization and navigation behavior require dedicated inspection.

## Live exam — 2026-08-17

**URL:** https://hscmcqapp-euxpe52h.manus.space/live-exam

The live exam entry page loads and describes filtered, source-linked, server-timed attempts. However, its primary description states that an attempt can start only when approved source-linked questions are available. In the live data state, the page contains no question set or active attempt; this aligns with the prior database observation that there are no `questions` records. The high-value timed-exam engine therefore cannot yet be exercised by a real student without content publication.

## Official notices — 2026-08-17

**URL:** https://hscmcqapp-euxpe52h.manus.space/notices

The public feed settles correctly after loading and currently exposes one source-first University of Dhaka record for the 2025–26 undergraduate admission system. Its description appropriately avoids inferring deadlines, eligibility, or patterns and links to the official portal. The feed is therefore technically working but very limited: it has one institution, no notice categories or search/filtering, no expiry/freshness state, no user subscription mechanism, and no formal notice-detail workflow beyond an outbound link.

## Leaderboard and revision vault — 2026-08-17

**URLs:** https://hscmcqapp-euxpe52h.manus.space/leaderboard and https://hscmcqapp-euxpe52h.manus.space/mistake-vault

The leaderboard UI has global and weekly switches but no verified attempts or rankings. It correctly avoids fabricated rankings, but it currently offers no way to achieve meaningful engagement because the live question bank is empty.

The Mistake Vault shows zero review items, consistent with there being no student attempt history. A formula preview appears, but the page explicitly says final cheat sheets require reviewer approval and source links; no approved chapter material is currently available. The dependent revision and gamification features are correctly restrained but not operationally useful until reviewed content and student activity exist.

## Administrative routes — 2026-08-17

**URLs:** https://hscmcqapp-euxpe52h.manus.space/admin and https://hscmcqapp-euxpe52h.manus.space/governance

The review workspace currently has zero questions awaiting action. The governance hub exposes source registration, admission-notice creation, and custom student notifications, but currently depends on manually entering a student user ID to target alerts and manually entering source metadata/fingerprints. The student-facing sidebar exposes many governance destinations in this live browser session; even if server mutations are role-gated, the navigation should distinguish student from reviewer/admin journeys. There is no visible source-health dashboard, multi-student notification targeting/segmentation, scheduled delivery, or notice-ingestion workflow.

## Practice and exam selection — 2026-08-17

**URLs:** https://hscmcqapp-euxpe52h.manus.space/practice and https://hscmcqapp-euxpe52h.manus.space/exams

The practice selection UI displays a fixed Mathematics → 1st Paper → Quadratic Equation → Roots & relations path, with fixed question-count and difficulty controls. These controls are not populated from the live academic hierarchy, which has no published questions. The recommendation text claims recent student errors despite no live attempts, so the personalization currently appears presentational rather than evidence-driven.

The model-exam route presents HSC, Medical, and Engineering cards with fixed counts, durations, scoring, and pattern labels. Since the database has no live exam profiles, pattern versions, or questions, these cards do not represent configured, institution-verified examinations. They should be backed by the published pattern registry and should make unavailability explicit rather than implying ready-to-start 50/100/60-question exams.

## PWA and runtime state — 2026-08-17

The live production page exposes `/manifest.webmanifest`; its service worker is registered and controls the page. No browser-console errors appeared during the inspected navigation. This validates the basic PWA installation/caching plumbing, but not a true offline practice session: because the question bank is empty, the key offline-use case cannot yet be tested with saved question content, an answer queue, or later result synchronization.

## Code-level student-flow findings — 2026-08-17

`client/src/pages/Home.tsx` confirms that the main dashboard is currently presentational: Zian’s greeting, date, study goal, streak, accuracy, hours, test count, progress card, recommendations, active practice, and daily challenge are literal values rather than user-specific queries. The in-page practice screen uses a fixed quadratic-equation item and fixed answers/results. The model-exam screen similarly uses hard-coded HSC/Medical/Engineering cards and a fixed scalar-quantity question. The analytics, study plan, mistake notebook, bookmarks, profile, and legacy admin component in the same file also contain static sample records and non-persisted interactions.

This is more than an empty-data problem: a student can encounter convincing but non-personal performance claims and results. Real, data-backed route implementations exist for selected advanced areas, but the common home/practice/exam journeys have not yet been consolidated onto those production services.

## AI Tutor — 2026-08-17

**URL:** https://hscmcqapp-euxpe52h.manus.space/tutor

The tutor route advertises source-aware responses and includes a usable prompt interface. The production database has zero `knowledge_chunks`, however, so no approved-source retrieval can currently support an academic answer. Testing its built-in prompt triggered a blank/loading browser state rather than a settled response in the inspection session; this requires a dedicated interaction/retry/error-state test before the tutor can be treated as dependable for students.

The subsequent browser state redirected to the configured external sign-in portal, confirming that Tutor interaction is protected while the dashboard itself renders a static guest-style experience. The sign-in portal offers several identity providers, including Google and email, through the platform identity service. The application needs a clearer pre-auth boundary: student dashboards should not show personal metrics/actions before a session exists, and protected tools should surface an in-app sign-in explanation rather than appearing usable until an action redirects away.

## Mobile and runtime audit — 2026-08-17

Mobile captures of the dashboard, live-exam entry, governance hub, notices, and account views show no obvious clipping and preserve the compact header, language switch, and touch-sized controls. The dashboard remains overly tall because each metric consumes a separate card, and the governance hub is exposed as a long mobile form with operationally sensitive controls rather than a role-separated workflow.

Production browser-console checks were clean during audit navigation. The sandbox development log contains historical Vite reconnect/lost-connection messages, but they do not correspond to a live production failure. The production audit should nevertheless include continuous error monitoring and an uptime check; neither is exposed in the product interface today.

## Broken navigation routes — 2026-08-17

**URLs:** https://hscmcqapp-euxpe52h.manus.space/question-bank and https://hscmcqapp-euxpe52h.manus.space/bulk-import

Both advertised sidebar destinations resolve to the generic dashboard rather than a question bank or bulk-import workspace. This is a critical routing/information-architecture defect: the UI promises student question discovery and administrator bulk import but sends users to unrelated static content. These routes must be registered to the existing intended page components (with role gating) or hidden until implemented.

## Image solver and bookmarks — 2026-08-17

**Image solver:** https://hscmcqapp-euxpe52h.manus.space/image-solver is registered and presents a well-scoped 3 MB PNG/JPG/WEBP upload UI. It correctly promises a source-evidence-first response, but the absence of any `knowledge_chunks` means the advertised verified explanation cannot currently succeed. Before release, add image-quality preflight, OCR confidence/error states, upload privacy/retention disclosure, malicious-file validation, rate limits, and a tested no-evidence response path.

**Bookmarks:** https://hscmcqapp-euxpe52h.manus.space/bookmarks is registered but shows static Mathematics/Chemistry/Physics entries and fixed counts. Its retry, add-note, and explanation controls do not demonstrate persisted action outcomes. It needs authenticated, user-owned bookmark records, functional note/retake/explanation actions, filters based on real metadata, empty/error states, and question-deletion/version behavior.

## Settings and admission-patterns — 2026-08-17

**Settings:** https://hscmcqapp-euxpe52h.manus.space/settings is only a placeholder, with a return-home button. It is missing profile/account controls, password/provider management, language/theme controls, notification preferences, target/exam preferences, data-export/deletion choices, and accessibility/reduced-motion controls.

**Admission patterns:** https://hscmcqapp-euxpe52h.manus.space/admission-patterns is a registered governance form containing a University of Dhaka draft, but it has no recorded active/published pattern versions. The route is exposed through the student sidebar and permits a manual review-submission form in the audited guest-style interface. It needs clear reviewer/admin access control, source validation, structured pattern fields (marks, timing, eligibility/status only after official confirmation), version comparison, approval history, and a separate read-only student view.

## Question intake and content workspace — 2026-08-17

**URLs:** https://hscmcqapp-euxpe52h.manus.space/question-intake and https://hscmcqapp-euxpe52h.manus.space/content-workspace

Both advertised content-governance destinations resolve to the generic static dashboard. This prevents reviewers from reaching the intended question draft/review workflow and content workspace, while making the sidebar misleading for every visitor. Register the routes, enforce server and client role checks, give unauthorized users a concise access explanation, and remove these items from the student information architecture.

## Registered importer and question-intake workflows — 2026-08-17

**Actual importer:** https://hscmcqapp-euxpe52h.manus.space/import is registered and shows a CSV/JSON policy, file picker, validation preview, and required source-version/page-reference fields. This is a sound design concept, but it is exposed to the same guest-style session that displays student navigation. With no published academic hierarchy beyond one book/subject and no active review queue, it cannot yet support real import work. Enforce role checks before rendering, provide a downloadable schema/template and row-level error report, validate size/mime/virus policy, make duplicate/conflict handling explicit, and surface a publish/review status.

**Actual question intake:** https://hscmcqapp-euxpe52h.manus.space/questions/new is registered and renders the governed draft form, with live-registry selection controls, source page reference, difficulty, prompt, explanation, and correct-option selection. All registry controls are empty in the present production data state, so no draft can be created. The sidebar's `/question-intake` label is mapped to the wrong URL. The app needs correct route mapping, reviewer/admin access gating, accessible field-level validation, autosave/draft recovery, support for advanced question types/stems, and test submissions against populated source/hierarchy data.
