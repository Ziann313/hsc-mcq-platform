import { describe, expect, it } from "vitest";
import { getUpcomingAdmissionCountdown } from "../shared/admissionCountdown";

describe("verified admission countdown", () => {
  const now = new Date("2026-08-19T00:00:00.000Z");
  it("selects the nearest valid future date and derives the remaining clock", () => {
    const countdown = getUpcomingAdmissionCountdown([
      { id: 1, institution: "BUET", title: "Admission", examType: "engineering", unit: "BUET", configuration: { examDateIso: "2026-08-22T02:30:00.000Z" } },
      { id: 2, institution: "DU", title: "Admission", examType: "university", unit: "DU A", configuration: { examDateIso: "2026-08-20T01:15:00.000Z" } },
    ], now);
    expect(countdown?.institution).toBe("DU");
    expect(countdown?.days).toBe(1);
    expect(countdown?.hours).toBe(1);
    expect(countdown?.minutes).toBe(15);
  });

  it("returns no countdown when records have no valid future official date", () => {
    expect(getUpcomingAdmissionCountdown([
      { id: 1, institution: "DU", title: "Admission", examType: "university", unit: "DU A", configuration: { examDateIso: "2026-08-18T00:00:00.000Z" } },
      { id: 2, institution: "Medical", title: "MBBS", examType: "medical", unit: "MBBS", configuration: {} },
    ], now)).toBeNull();
  });
});
