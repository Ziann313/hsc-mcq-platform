import { describe, expect, it } from "vitest";
import { validateAdmissionPatternActivation } from "../shared/admissionPattern";

describe("admission pattern activation validation", () => {
  it("blocks source-only placeholders from becoming student-active patterns", () => {
    expect(validateAdmissionPatternActivation({}).valid).toBe(false);
  });
  it("accepts complete verified configuration values", () => {
    expect(validateAdmissionPatternActivation({ questionCount: 100, durationMinutes: 60, marksPerCorrect: 1, negativeMarkPerWrong: 0.25, session: "2025-26", examDateIso: "2026-01-10T00:00:00.000Z" })).toEqual({ valid: true, errors: [] });
  });
});
