# Prompt 4 Learning-Enhancement Compatibility Record

**Scope.** This record reconciles `Prompt_4_MCQ_GURU_Learning_Enhancement.md` with the active MCQ GURU learning system under the project's standing audit-first, no-duplication policy. The prompt's intended student outcomes already exist through protected, source-governed workflows, so no parallel APIs, new pages, or destructive schema cleanup were introduced.

| Brief area | Existing MCQ GURU capability | Compatibility decision |
| --- | --- | --- |
| Mistake Notebook and spaced review | Server scoring automatically creates mistakes from incorrect submitted answers. The Mistake Vault calculates due review dates and starts a server-frozen spaced re-test; the scored retest resets or advances the server-owned review state. | Preserved. No client-reported `wasCorrect` mutation was added because it could falsify review outcomes. |
| Bookmarks | Owner-only add/remove/query APIs, a Save action in the frozen-attempt runner, an owner-only Notebook, and bookmark-based frozen retests are active. | Preserved. Question text and answer keys remain inside protected attempts rather than a scrapeable bookmark list. |
| Tutor memory | Owner-only conversations and messages are persisted, restored in the Tutor UI, and retained separately from the grounded-response cache and request policies. | Preserved. No second conversation model or differently named duplicate endpoints were added. |
| Adaptive study guidance | Today’s Study derives group, subject, chapter, weak-point, and continuation recommendations from published capacity and submitted attempts, with direct frozen-practice handoff. | Preserved. No static calendar or guessed exam schedule was introduced. |
| Instructions and integrity | The frozen-attempt entry requires acknowledgement before start; the runner uses the server clock, final-five-minute urgency, focus mode, context/shortcut safeguards, progressive visibility warnings, and server-side third-warning finalization. | Preserved. No client-only auto-submit or duplicate `startExam` flow was added. |
| Schema cleanup and branding | `mistakes`, `bookmarks`, `aiConversations`, and `aiMessages` are active. Concepts, question versions, profiles, and patterns are part of source governance and immutable assessment. Active app/template branding is MCQ GURU. | Preserved. No active schema was removed, and no broad find-and-replace was required. |

## Deliberate deviations

The prompt's standalone SM-2 `reviewMistake(wasCorrect)` contract is not used because correctness must remain server-observed through a frozen, scored review attempt. The existing graduated server-side intervals accomplish spaced practice without accepting an unauditable client outcome. Similarly, a persistent daily calendar is not created from an unknown exam date; the current guide adapts to the learner’s actual completed attempts, open mistakes, and source-linked availability.

## Validation record

TypeScript checking and focused coverage passed: bookmarks, Tutor conversation privacy, group-aware study recommendations, frozen-attempt policy, and third-visibility-warning integrity handling reported **7 passing tests**. Mobile review confirmed the Mistake Vault and Today’s Study pages are readable and retain the established source-governed, server-authoritative learning handoffs.
