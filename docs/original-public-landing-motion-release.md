# Original Public Landing and Motion Release

## Design intent

The public MCQ GURU landing page now uses an original **learning-signal** visual system. It was informed by the reference site's clarity of hierarchy and friendly academic pacing, but it does not reproduce its logo, artwork, copy, courses, layout, assets, or animation sequence.

| Area | Original MCQ GURU implementation |
| --- | --- |
| Hero | An asymmetric Bengali-first editorial hero combines a factual source-governance promise with a navy/teal learning-signal board. |
| Visual motif | The board uses CSS-only orbit lines, an animated progress core, review/focus/progress signals, and live released-subject capacity. |
| Motion | The route loader now has original concentric signal rings, a learning-progress core, and a short loading phrase. It does not add artificial delay. |
| Content integrity | Public capacity continues to come from `publishedContentAvailability`; content is never represented as available before review/publication. |
| Access | Existing sign-in calls and the safe `/practice` return handoff are preserved. |
| Accessibility | The page keeps visible focus behavior, semantic navigation, labeled controls, and `prefers-reduced-motion` controls for all nonessential animation. |

## Validation record

The public route was reviewed in a clean browser session and showed the new sign-in-first landing experience with live subject capacity. TypeScript checking and production build passed; the PWA static precache remains active. The full suite reported **105 passing tests and one intentional skip**, including added public-motion coverage and existing route-integrity protection.
