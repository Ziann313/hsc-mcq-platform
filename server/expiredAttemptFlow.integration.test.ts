import { describe, expect, it } from "vitest";
import { buildExpiredAttemptFinalization } from "../shared/expiredAttemptFlow";

describe("expired attempt finalization integration plan", () => {
  it("turns persisted selections into a finalized score, answer breakdown, and Mistake Vault queue", () => {
    const persistedSelections = [{ questionId: 101, selectedOptionIds: [2] }, { questionId: 102, selectedOptionIds: [3] }];
    const finalized = buildExpiredAttemptFinalization([
      { questionId: 101, correctOptionId: 2, subject: "Physics", chapter: "Motion", marks: 1, negativeMarkWeight: 0.25 },
      { questionId: 102, correctOptionId: 1, subject: "Physics", chapter: "Motion", marks: 1, negativeMarkWeight: 0.25 },
      { questionId: 103, correctOptionId: 4, subject: "Math", chapter: "Algebra", marks: 1, negativeMarkWeight: 0.25 },
    ], persistedSelections);

    expect(finalized.result).toMatchObject({ correct: 1, wrong: 1, skipped: 1, netMarks: 0.75 });
    expect(finalized.answers).toEqual([
      expect.objectContaining({ questionId: 101, isCorrect: true, awardedMarks: 1 }),
      expect.objectContaining({ questionId: 102, isCorrect: false, awardedMarks: -0.25 }),
      expect.objectContaining({ questionId: 103, isCorrect: false, awardedMarks: 0 }),
    ]);
    expect(finalized.mistakeQuestionIds).toEqual([102]);
  });
});
