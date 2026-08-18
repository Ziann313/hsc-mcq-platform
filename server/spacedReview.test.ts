import { describe, expect, it } from "vitest";
import { isReviewDue, nextReviewAt } from "../shared/spacedReview";

describe("spaced mistake review", () => {
  it("makes new mistakes due immediately, then increases the review interval after correct re-tests", () => {
    const base = new Date("2026-08-18T00:00:00.000Z");
    expect(nextReviewAt(base, 0)).toEqual(base);
    expect(nextReviewAt(base, 1)).toEqual(new Date("2026-08-19T00:00:00.000Z"));
    expect(nextReviewAt(base, 3)).toEqual(new Date("2026-08-25T00:00:00.000Z"));
  });

  it("does not mark a review due before its scheduled interval", () => {
    const base = new Date("2026-08-18T00:00:00.000Z");
    expect(isReviewDue(base, 2, new Date("2026-08-20T23:59:59.000Z"))).toBe(false);
    expect(isReviewDue(base, 2, new Date("2026-08-21T00:00:00.000Z"))).toBe(true);
  });
});
