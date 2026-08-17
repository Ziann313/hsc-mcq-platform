export type McqQuestionSnapshot = {
  id: number;
  correctOptionIds: number[];
  marks: number;
  negativeMarkWeight: number;
  subject: string;
  chapter: string;
};

export type McqSelection = {
  questionId: number;
  selectedOptionIds: number[];
};

export type McqExamResult = {
  correct: number;
  wrong: number;
  skipped: number;
  grossMarks: number;
  negativeMarks: number;
  netMarks: number;
  accuracy: number;
  chapterAccuracy: Array<{ subject: string; chapter: string; correct: number; attempted: number; accuracy: number }>;
};

function sameSelections(left: number[], right: number[]) {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

export function scoreMcqExam(questions: McqQuestionSnapshot[], selections: McqSelection[]): McqExamResult {
  const selectionMap = new Map(selections.map(selection => [selection.questionId, selection.selectedOptionIds]));
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let grossMarks = 0;
  let negativeMarks = 0;
  const chapters = new Map<string, { subject: string; chapter: string; correct: number; attempted: number }>();

  for (const question of questions) {
    const selected = selectionMap.get(question.id) ?? [];
    const key = `${question.subject}::${question.chapter}`;
    const chapter = chapters.get(key) ?? { subject: question.subject, chapter: question.chapter, correct: 0, attempted: 0 };
    if (selected.length === 0) {
      skipped += 1;
      chapters.set(key, chapter);
      continue;
    }
    chapter.attempted += 1;
    if (sameSelections(selected, question.correctOptionIds)) {
      correct += 1;
      grossMarks += question.marks;
      chapter.correct += 1;
    } else {
      wrong += 1;
      negativeMarks += question.negativeMarkWeight;
    }
    chapters.set(key, chapter);
  }

  const attempted = correct + wrong;
  return {
    correct,
    wrong,
    skipped,
    grossMarks: Number(grossMarks.toFixed(2)),
    negativeMarks: Number(negativeMarks.toFixed(2)),
    netMarks: Number((grossMarks - negativeMarks).toFixed(2)),
    accuracy: attempted === 0 ? 0 : Number(((correct / attempted) * 100).toFixed(1)),
    chapterAccuracy: Array.from(chapters.values()).map(item => ({
      ...item,
      accuracy: item.attempted === 0 ? 0 : Number(((item.correct / item.attempted) * 100).toFixed(1)),
    })).sort((a, b) => a.accuracy - b.accuracy),
  };
}
