import { describe, expect, it } from "vitest";
import { FREE_USAGE_LIMITS, TRIAL_DURATION_DAYS, bangladeshDayKey, bangladeshWeekKey, hasFullSubscriptionAccess, subscriptionDaysLeft, usagePeriodKey } from "../shared/subscriptionPolicy";

describe("subscription policy", () => {
  const instant = new Date("2026-08-22T18:30:00.000Z");

  it("uses Bangladesh calendar dates and Monday-starting weekly windows for free usage", () => {
    expect(bangladeshDayKey(instant)).toBe("2026-08-23");
    expect(bangladeshWeekKey(instant)).toBe("week:2026-08-17");
    expect(usagePeriodKey("practice_questions", instant)).toBe("2026-08-23");
    expect(usagePeriodKey("exams", instant)).toBe("week:2026-08-17");
  });

  it("keeps trials and active premium subscriptions unrestricted but never relies on a free plan status alone", () => {
    expect(hasFullSubscriptionAccess({ planType: "free", status: "trial" })).toBe(true);
    expect(hasFullSubscriptionAccess({ planType: "premium", status: "active" })).toBe(true);
    expect(hasFullSubscriptionAccess({ planType: "free", status: "active" })).toBe(false);
    expect(hasFullSubscriptionAccess({ planType: "premium", status: "expired" })).toBe(false);
  });

  it("exposes the configured free-tier limits and never reports negative remaining trial time", () => {
    expect(TRIAL_DURATION_DAYS).toBe(30);
    expect(FREE_USAGE_LIMITS.practice_questions).toEqual({ limit: 20, window: "day" });
    expect(FREE_USAGE_LIMITS.exams).toEqual({ limit: 1, window: "week" });
    expect(FREE_USAGE_LIMITS.tutor_questions).toEqual({ limit: 5, window: "day" });
    expect(FREE_USAGE_LIMITS.image_solves).toEqual({ limit: 2, window: "week" });
    expect(subscriptionDaysLeft(new Date("2026-08-22T17:30:00.000Z"), instant)).toBe(0);
  });
});
