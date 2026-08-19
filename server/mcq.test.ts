import { describe, expect, it } from "vitest";
import { scoreMcqExam } from "../shared/mcq";

describe("scoreMcqExam", () => {
  it("supports multi-statement option selections and per-question negative weights", () => {
    const result = scoreMcqExam([
      { id: 1, correctOptionIds: [2], marks: 1, negativeMarkWeight: 0.25, subject: "Physics", chapter: "Motion" },
      { id: 2, correctOptionIds: [3, 4], marks: 2, negativeMarkWeight: 0.5, subject: "Physics", chapter: "Motion" },
      { id: 3, correctOptionIds: [6], marks: 1, negativeMarkWeight: 0.25, subject: "Chemistry", chapter: "Bonding" },
    ], [
      { questionId: 1, selectedOptionIds: [2] },
      { questionId: 2, selectedOptionIds: [3, 4] },
      { questionId: 3, selectedOptionIds: [5] },
    ]);

    expect(result).toMatchObject({ correct: 2, wrong: 1, skipped: 0, grossMarks: 3, negativeMarks: 0.25, netMarks: 2.75, accuracy: 66.7 });
    expect(result.chapterAccuracy[0]).toMatchObject({ chapter: "Bonding", accuracy: 0 });
  });

  it("keeps skipped questions out of both accuracy and negative-mark calculations", () => {
    const result = scoreMcqExam([
      { id: 1, correctOptionIds: [1], marks: 1, negativeMarkWeight: 0.25, subject: "ICT", chapter: "Logic" },
      { id: 2, correctOptionIds: [2], marks: 1, negativeMarkWeight: 0.25, subject: "ICT", chapter: "Logic" },
    ], [{ questionId: 1, selectedOptionIds: [1] }]);
    expect(result).toMatchObject({ correct: 1, wrong: 0, skipped: 1, netMarks: 1, accuracy: 100 });
  });

  it("derives subject and difficulty breakdowns from the frozen question snapshot", () => {
    const result = scoreMcqExam([
      { id: 1, correctOptionIds: [1], marks: 1, negativeMarkWeight: 0.25, subject: "Physics", chapter: "Motion", difficulty: "easy" },
      { id: 2, correctOptionIds: [2], marks: 1, negativeMarkWeight: 0.25, subject: "Chemistry", chapter: "Bonding", difficulty: "hard" },
    ], [{ questionId: 1, selectedOptionIds: [1] }, { questionId: 2, selectedOptionIds: [1] }]);
    expect(result.subjectAccuracy).toEqual(expect.arrayContaining([{ subject: "Physics", correct: 1, attempted: 1, accuracy: 100 }, { subject: "Chemistry", correct: 0, attempted: 1, accuracy: 0 }]));
    expect(result.difficultyAccuracy).toEqual(expect.arrayContaining([{ difficulty: "easy", correct: 1, attempted: 1, accuracy: 100 }, { difficulty: "hard", correct: 0, attempted: 1, accuracy: 0 }]));
  });
});
