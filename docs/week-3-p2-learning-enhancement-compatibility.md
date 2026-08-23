# Week 3 P2 Learning-Enhancement Compatibility Record

**Scope.** This record reconciles `Prompt_Week3_P2_Learning_Enhancement.md` with MCQ GURU’s active learning system. The requested outcomes already exist through server-owned spaced review, owner-only bookmarks, persisted Tutor conversations, adaptive study guidance, acknowledgement-gated frozen attempts, and progressive integrity handling. No duplicate APIs, schema migration, or weaker client-observed grading flow was added.

| Requested P2 outcome | Verified active implementation | Compatibility decision |
| --- | --- | --- |
| Mistake review and repetition | Wrong submitted answers populate the Mistake Vault. The server owns review intervals, reset/advance decisions, and frozen follow-up practice. | Preserved. No client-reported `wasCorrect` or parallel SM-2 mutation was added. |
| Bookmarks | Students can save/remove active published questions; owner-only bookmark metadata supports a frozen bookmarked-practice handoff. | Preserved. Lists do not expose question prompts, options, explanations, or answer keys outside a protected attempt. |
| Tutor memory | Owner-only conversation/message persistence, saved-conversation navigation, and bounded historical context already exist. | Preserved. New conversations remain isolated by owner and conversation ID. |
| Study plan | Today’s Study and Study Plan derive focused chapter recommendations, weak/continuation paths, group filters, and source-linked capacity from real learning data. | Preserved. No guessed date schedule or duplicate plan storage was added. |
| Instructions and anti-cheat | Frozen-attempt entry requires acknowledgement. The runner uses visibility warnings, server-side third-warning finalization, focus mode, context-menu/shortcut restrictions, and expiry handling. | Preserved. No client-only auto-submit mutation was added. |

## Deliberate deviations

The attachment’s exact client-driven SM-2 contract would let the client assert correctness independently of an immutable scored attempt. MCQ GURU retains server-observed review results instead. Bookmark listings intentionally remain metadata-only; a generic question-and-options browser would undermine the platform’s answer-key and scraping boundaries.

## Validation record

TypeScript and focused bookmark, group-study recommendation, live-exam policy, and third-warning integrity coverage passed with **6 tests**. Mobile review confirmed the Mistake Vault, bookmarks, and adaptive Study Plan render real owner-scoped learning states and retain protected practice handoffs.
