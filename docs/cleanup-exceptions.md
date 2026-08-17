# MCQ GURU Cleanup Verification

The requested cleanup was applied after a reference audit. The following files or folders were removed because no retained application source imported them: `vite.config.ts.bak`, `client/public/__manus__/`, `server/_core/voiceTranscription.ts`, `server/_core/map.ts`, and the specified unused UI boilerplate components.

`todo.md` is intentionally retained as a project-level change history and release checklist. It is not included in the production bundle and does not affect runtime size. Retaining it is required to preserve implementation traceability and safe checkpoint verification.

The production build was rerun after cleanup. MCQ GURU now uses a generated service worker for offline shell/question caching, KaTeX for mathematical notation, and lazy-loaded rich tutor UI to keep less-frequent functionality out of the initial route path.
