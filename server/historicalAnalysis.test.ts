import { describe, expect, it } from "vitest";
import { validateHistoricalDistribution, validateHistoricalRowShape } from "../shared/historicalAnalysis";

describe("historical analysis import validation", () => {
  it("accepts a bounded aggregate analysis row with an exact source reference", () => {
    expect(() => validateHistoricalRowShape({ examProfileId: 1, examYear: 2025, boardName: "Dhaka", appearanceCount: 4, importanceScore: 75, pageReference: "Section 3", questionTypeDistribution: { conceptual: 3, numerical: 1 } })).not.toThrow();
  });

  it("rejects missing evidence, invalid appearances, and malformed distributions", () => {
    expect(() => validateHistoricalRowShape({ examProfileId: 1, examYear: 2025, appearanceCount: 0, pageReference: "p. 1" })).toThrow("Appearance count");
    expect(() => validateHistoricalRowShape({ examProfileId: 1, examYear: 2025, appearanceCount: 1, pageReference: "" })).toThrow("source page");
    expect(() => validateHistoricalDistribution({ numerical: -1 }, "Difficulty distribution")).toThrow("Difficulty distribution");
  });
});
