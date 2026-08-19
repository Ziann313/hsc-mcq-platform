import { describe, expect, it } from "vitest";
import { deriveWeakConcepts } from "../shared/examIntelligence";

describe("frozen attempt concept intelligence", () => {
  it("uses only mapped, submitted frozen-answer evidence and ranks lower-accuracy concepts first", () => {
    const concepts = deriveWeakConcepts([
      { questionId: 1, conceptId: 10, concept: "Velocity", subjectId: 1, subject: "Physics", chapterId: 2, chapter: "Motion" },
      { questionId: 2, conceptId: 20, concept: "Force", subjectId: 1, subject: "Physics", chapterId: 2, chapter: "Motion" },
      { questionId: 3, conceptId: undefined, concept: null },
    ], [
      { questionId: 1, selectedOptionIds: [1], isCorrect: false },
      { questionId: 2, selectedOptionIds: [2], isCorrect: true },
      { questionId: 3, selectedOptionIds: [3], isCorrect: false },
    ]);
    expect(concepts).toEqual([{ conceptId: 10, concept: "Velocity", subjectId: 1, subject: "Physics", chapterId: 2, chapter: "Motion", attempted: 1, correct: 0, accuracy: 0, belowAttemptAverage: true }, { conceptId: 20, concept: "Force", subjectId: 1, subject: "Physics", chapterId: 2, chapter: "Motion", attempted: 1, correct: 1, accuracy: 100, belowAttemptAverage: false }]);
  });

  it("does not manufacture concept evidence from unmapped or skipped questions", () => {
    expect(deriveWeakConcepts([{ questionId: 1, conceptId: 4, concept: "Mapped" }], [{ questionId: 1, selectedOptionIds: [], isCorrect: null }])).toEqual([]);
  });
});
