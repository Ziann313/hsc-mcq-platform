# First-Visit Experience Verification

The isolated browser session verified that `/` renders the public MCQ GURU landing page without student navigation, profile identity, streaks, scores, or other private learning information. A signed-out direct request to `/onboarding` and `/practice` safely redirects to the public landing rather than exposing an onboarding form or student-shell interface. Isolated 375 × 812 captures confirmed that both `/practice` and `/onboarding` preserve this guarded direct-entry behavior on mobile.

The pure first-visit routing tests cover the loading, guest, incomplete-onboarding, authenticated-dashboard, and refresh-state decisions. The onboarding persistence integration test verifies that academic year, session, institution, and completion timestamp are saved. An isolated 375 × 812 mobile capture confirmed that the settled public landing presents the public header, sign-in action, hero, and subject-exploration action without dashboard chrome.
