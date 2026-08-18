import { describe, expect, it } from "vitest";
import { resolveFirstVisitState } from "../client/src/lib/firstVisitFlow";

describe("first-visit authentication flow", () => {
  it("keeps the app in a loading state while authentication is unresolved", () => {
    expect(resolveFirstVisitState({ authLoading: true, authenticated: false, profileLoading: false, onboardingCompleted: false })).toBe("loading");
  });

  it("sends visitors without a session to the public landing page", () => {
    expect(resolveFirstVisitState({ authLoading: false, authenticated: false, profileLoading: false, onboardingCompleted: false })).toBe("public");
  });

  it("routes a signed-in learner with no completed profile to onboarding", () => {
    expect(resolveFirstVisitState({ authLoading: false, authenticated: true, profileLoading: false, onboardingCompleted: false })).toBe("onboarding");
  });

  it("routes a signed-in learner with a completed profile to the dashboard", () => {
    expect(resolveFirstVisitState({ authLoading: false, authenticated: true, profileLoading: false, onboardingCompleted: true })).toBe("dashboard");
  });

  it("keeps a completed signed-in learner on the dashboard after a refresh-state check", () => {
    const refreshState = { authLoading: false, authenticated: true, profileLoading: false, onboardingCompleted: true };
    expect(resolveFirstVisitState(refreshState)).toBe("dashboard");
    expect(resolveFirstVisitState({ ...refreshState })).toBe("dashboard");
  });

  it("moves the route decision from onboarding to dashboard once the completion marker is present", () => {
    const base = { authLoading: false, authenticated: true, profileLoading: false };
    expect(resolveFirstVisitState({ ...base, onboardingCompleted: false })).toBe("onboarding");
    expect(resolveFirstVisitState({ ...base, onboardingCompleted: true })).toBe("dashboard");
  });
});
