import { describe, expect, it } from "vitest";
import { validateExamBlueprint, type ExamBlueprintConfiguration } from "../shared/examBlueprint";

const blueprint: ExamBlueprintConfiguration = { examMode: "pattern_mock", academicYearId: 1, curriculumVersion: "2025-26", contentLanguage: "bn", sourceMode: "mixed", durationMinutes: 30, totalQuestions: 4, totalMarks: 4, marksPerCorrect: 1, negativeMarkPerWrong: 0.25, unansweredPolicy: "no_penalty", instructions: "Read each question carefully before selecting one option.", subjectDistribution: [{ id: 10, count: 4 }], chapterDistribution: [], difficultyDistribution: [{ difficulty: "medium", count: 4 }], questionTypeDistribution: [{ questionType: "single_mcq", count: 4 }] };

describe("exam blueprint validation", () => {
  it("accepts a typed, internally consistent pattern mock blueprint", () => expect(validateExamBlueprint(blueprint)).toEqual({ valid: true, errors: [] }));
  it("rejects mismatched distributions and an unverified previous-year mode", () => {
    expect(validateExamBlueprint({ ...blueprint, chapterDistribution: [{ id: 4, count: 3 }] }).errors).toContain("Chapter distribution must sum to the configured question total.");
    expect(validateExamBlueprint({ ...blueprint, examMode: "previous_year_simulation", sourceMode: "mixed" }).errors).toContain("Authentic previous-year simulations require historical-only source mode.");
  });
});
