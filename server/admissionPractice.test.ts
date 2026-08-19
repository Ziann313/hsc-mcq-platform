import { describe, expect, it } from "vitest";
import { admissionSourceTrackForUnit, hasMinimumAdmissionPracticeCapacity } from "../shared/admissionPractice";

describe("admission practice source-track routing", () => {
  it("maps only released DU, BUET, and Medical units to their server-side question filters", () => {
    expect(admissionSourceTrackForUnit("university", "DU A Unit")).toBe("du");
    expect(admissionSourceTrackForUnit("university", "DU D Unit")).toBe("du");
    expect(admissionSourceTrackForUnit("engineering", "BUET")).toBe("buet");
    expect(admissionSourceTrackForUnit("medical", "MBBS")).toBe("medical");
    expect(admissionSourceTrackForUnit("engineering", "CKRUET")).toBeNull();
    expect(admissionSourceTrackForUnit("university", "GST A Unit")).toBeNull();
  });

  it("permits a custom paper only when its exact tagged capacity satisfies the selected length", () => {
    expect(hasMinimumAdmissionPracticeCapacity("du", 10, 10)).toBe(true);
    expect(hasMinimumAdmissionPracticeCapacity("buet", 10, 20)).toBe(false);
    expect(hasMinimumAdmissionPracticeCapacity(null, 120, 10)).toBe(false);
  });
});
