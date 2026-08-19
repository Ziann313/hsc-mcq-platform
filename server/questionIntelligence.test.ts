import { describe, expect, it } from "vitest";
import { duplicateRisk, validateQuestionIntelligence } from "../shared/questionIntelligence";

describe("question intelligence validation", () => {
  it("identifies exact and conservative parameterized near-duplicates", () => {
    expect(duplicateRisk("What is the value of x?", " What is the value of x? ")).toMatchObject({ kind: "exact", score: 1 });
    expect(duplicateRisk("Calculate 25 + 17 = ?", "Calculate 48 + 63 = ?")).toMatchObject({ kind: "near" });
    expect(duplicateRisk("What is refraction?", "Which organ pumps blood?")).toMatchObject({ kind: "none" });
  });

  it("requires bounded evidence scores and a traceable basis for generated questions", () => {
    expect(() => validateQuestionIntelligence({ difficultyScore: 11 })).toThrow("Difficulty score");
    expect(() => validateQuestionIntelligence({ provenance: "generated_from_curriculum", generationBasis: "brief" })).toThrow("generation basis");
    expect(() => validateQuestionIntelligence({ provenance: "generated_from_curriculum", generationBasis: "Active syllabus chapter and reviewed source version", difficultyScore: 6 })).not.toThrow();
  });
});
