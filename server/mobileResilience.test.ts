import { describe, expect, it } from "vitest";
import { parseSeenAlertIds } from "../client/src/components/DailyChallengeBrowserAlert";

describe("mobile resilience helpers", () => {
  it("keeps only numeric browser-alert identifiers from valid stored data", () => {
    expect(Array.from(parseSeenAlertIds('[1,"2",3,null]'))).toEqual([1, 3]);
  });

  it("does not throw when restricted or corrupted browser storage is encountered", () => {
    expect(Array.from(parseSeenAlertIds("not-json"))).toEqual([]);
    expect(Array.from(parseSeenAlertIds(null))).toEqual([]);
  });
});
