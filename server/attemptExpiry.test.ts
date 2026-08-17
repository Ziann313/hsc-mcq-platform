import { describe, expect, it } from "vitest";
import { shouldFinalizeExpiredAttempt } from "../shared/attemptExpiry";

describe("shouldFinalizeExpiredAttempt", () => {
  it("finalizes an in-progress attempt when the persisted expiry time has passed", () => {
    expect(shouldFinalizeExpiredAttempt("in_progress", new Date("2026-08-17T10:00:00.000Z"), new Date("2026-08-17T10:00:01.000Z").getTime())).toBe(true);
  });

  it("does not finalize a submitted or unexpired attempt", () => {
    const now = new Date("2026-08-17T10:00:00.000Z").getTime();
    expect(shouldFinalizeExpiredAttempt("submitted", new Date("2026-08-17T09:59:00.000Z"), now)).toBe(false);
    expect(shouldFinalizeExpiredAttempt("in_progress", new Date("2026-08-17T10:01:00.000Z"), now)).toBe(false);
  });
});
