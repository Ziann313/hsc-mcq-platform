export type FirstVisitState = "loading" | "public" | "onboarding" | "dashboard";

export function resolveFirstVisitState(input: {
  authLoading: boolean;
  authenticated: boolean;
  profileLoading: boolean;
  onboardingCompleted: boolean;
}): FirstVisitState {
  if (input.authLoading || (input.authenticated && input.profileLoading)) return "loading";
  if (!input.authenticated) return "public";
  return input.onboardingCompleted ? "dashboard" : "onboarding";
}
