import { describe, expect, it } from "vitest";
import { resolveLiveRoomState, shouldAutoSubmitForIntegrityWarnings } from "../shared/liveExam";

describe("live exam policy", () => {
  const startsAt = new Date("2026-08-18T10:00:00.000Z");
  const endsAt = new Date("2026-08-18T10:30:00.000Z");

  it("derives scheduled, live, and closed state from the shared server clock", () => {
    expect(resolveLiveRoomState({ configuredState: "scheduled", startsAt, endsAt, now: new Date("2026-08-18T09:59:59.000Z") })).toBe("scheduled");
    expect(resolveLiveRoomState({ configuredState: "scheduled", startsAt, endsAt, now: new Date("2026-08-18T10:00:00.000Z") })).toBe("live");
    expect(resolveLiveRoomState({ configuredState: "live", startsAt, endsAt, now: new Date("2026-08-18T10:30:00.000Z") })).toBe("closed");
  });

  it("keeps draft and archived rooms out of the live lifecycle", () => {
    expect(resolveLiveRoomState({ configuredState: "draft", startsAt, endsAt, now: new Date("2026-08-18T10:15:00.000Z") })).toBe("draft");
    expect(resolveLiveRoomState({ configuredState: "archived", startsAt, endsAt, now: new Date("2026-08-18T10:15:00.000Z") })).toBe("archived");
    expect(resolveLiveRoomState({ configuredState: "closed", startsAt, endsAt, now: new Date("2026-08-18T10:15:00.000Z") })).toBe("closed");
  });

  it("auto-submits only once the configured integrity-warning threshold is reached", () => {
    expect(shouldAutoSubmitForIntegrityWarnings(2, 3)).toBe(false);
    expect(shouldAutoSubmitForIntegrityWarnings(3, 3)).toBe(true);
  });
});
