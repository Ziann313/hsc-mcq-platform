import { scoreMcqExam, type McqSelection } from "./mcq";

export type FrozenAttemptQuestion = { questionId: number; correctOptionId: number; subject?: string; chapter?: string; difficulty?: string | null; marks?: number; negativeMarkWeight?: number };

export function buildExpiredAttemptFinalization(questions: FrozenAttemptQuestion[], selections: McqSelection[]) {
  const selectionMap = new Map(selections.map(selection => [selection.questionId, selection.selectedOptionIds]));
  const result = scoreMcqExam(questions.map(question => ({
    id: question.questionId, correctOptionIds: [question.correctOptionId], marks: question.marks ?? 1,
    negativeMarkWeight: question.negativeMarkWeight ?? 0, subject: question.subject ?? "General", chapter: question.chapter ?? "General", difficulty: question.difficulty,
  })), selections);
  const answers = questions.map(question => {
    const selectedOptionIds = selectionMap.get(question.questionId) ?? [];
    const isCorrect = selectedOptionIds.length === 1 && selectedOptionIds[0] === question.correctOptionId;
    return {
      questionId: question.questionId, selectedOptionIds, selectedOptionId: selectedOptionIds[0] ?? null, isCorrect,
      awardedMarks: isCorrect ? question.marks ?? 1 : selectedOptionIds.length ? -(question.negativeMarkWeight ?? 0) : 0,
    };
  });
  return { result, answers, mistakeQuestionIds: answers.filter(answer => answer.selectedOptionIds.length && !answer.isCorrect).map(answer => answer.questionId) };
}
