export type AttemptAnswer = {
  questionId: number;
  selectedOptionId?: number | null;
  correctOptionId: number;
  subject?: string;
  chapter?: string;
  topic?: string;
};

export type AttemptSummary = {
  correct: number;
  wrong: number;
  skipped: number;
  score: number;
  negativeMarks: number;
  accuracy: number;
};

/**
 * Grades a frozen question snapshot. Callers should pass the question/answer set
 * captured at attempt start rather than reading mutable current question records.
 */
export function calculateAttemptSummary(
  answers: AttemptAnswer[],
  marksPerCorrect = 1,
  negativeMarkPerWrong = 0,
): AttemptSummary {
  const correct = answers.filter(
    answer => answer.selectedOptionId !== null && answer.selectedOptionId !== undefined && answer.selectedOptionId === answer.correctOptionId,
  ).length;
  const wrong = answers.filter(
    answer => answer.selectedOptionId !== null && answer.selectedOptionId !== undefined && answer.selectedOptionId !== answer.correctOptionId,
  ).length;
  const skipped = answers.length - correct - wrong;
  const negativeMarks = Number((wrong * negativeMarkPerWrong).toFixed(2));
  const score = Number((correct * marksPerCorrect - negativeMarks).toFixed(2));
  const attempted = correct + wrong;
  const accuracy = attempted === 0 ? 0 : Number(((correct / attempted) * 100).toFixed(1));

  return { correct, wrong, skipped, score, negativeMarks, accuracy };
}
