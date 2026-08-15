import { describe, expect, it } from "vitest";
import { calculateAttemptSummary } from "../shared/assessment";

describe("calculateAttemptSummary", () => {
  it("calculates marks, negative marks, and accuracy from a frozen answer set", () => {
    const summary = calculateAttemptSummary(
      [
        { questionId: 1, selectedOptionId: 2, correctOptionId: 2 },
        { questionId: 2, selectedOptionId: 1, correctOptionId: 3 },
        { questionId: 3, selectedOptionId: null, correctOptionId: 4 },
      ],
      1,
      0.25,
    );

    expect(summary).toEqual({
      correct: 1,
      wrong: 1,
      skipped: 1,
      score: 0.75,
      negativeMarks: 0.25,
      accuracy: 50,
    });
  });

  it("does not divide by zero when every question is skipped", () => {
    const summary = calculateAttemptSummary([
      { questionId: 1, selectedOptionId: null, correctOptionId: 2 },
    ]);

    expect(summary.accuracy).toBe(0);
    expect(summary.score).toBe(0);
  });
});
