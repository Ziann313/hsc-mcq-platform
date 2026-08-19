export type McqQuestionSnapshot = {
  id: number;
  correctOptionIds: number[];
  marks: number;
  negativeMarkWeight: number;
  subject: string;
  chapter: string;
  difficulty?: "easy" | "medium" | "hard" | string | null;
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
  subjectAccuracy: Array<{ subject: string; correct: number; attempted: number; accuracy: number }>;
  difficultyAccuracy: Array<{ difficulty: string; correct: number; attempted: number; accuracy: number }>;
};

const MARK_SCALE = 100;

export function roundMark(value: number) {
  return Number((Math.round((Number(value) + Number.EPSILON) * MARK_SCALE) / MARK_SCALE).toFixed(2));
}

function toMarkUnits(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * MARK_SCALE);
}

function sameSelections(left: number[], right: number[]) {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

export function scoreMcqExam(questions: McqQuestionSnapshot[], selections: McqSelection[]): McqExamResult {
  const selectionMap = new Map(selections.map(selection => [selection.questionId, selection.selectedOptionIds]));
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let grossMarkUnits = 0;
  let negativeMarkUnits = 0;
  const chapters = new Map<string, { subject: string; chapter: string; correct: number; attempted: number }>();
  const subjects = new Map<string, { subject: string; correct: number; attempted: number }>();
  const difficulties = new Map<string, { difficulty: string; correct: number; attempted: number }>();

  for (const question of questions) {
    const selected = selectionMap.get(question.id) ?? [];
    const key = `${question.subject}::${question.chapter}`;
    const chapter = chapters.get(key) ?? { subject: question.subject, chapter: question.chapter, correct: 0, attempted: 0 };
    const subject = subjects.get(question.subject) ?? { subject: question.subject, correct: 0, attempted: 0 };
    const difficultyKey = question.difficulty ?? "unclassified";
    const difficulty = difficulties.get(difficultyKey) ?? { difficulty: difficultyKey, correct: 0, attempted: 0 };
    if (selected.length === 0) {
      skipped += 1;
      chapters.set(key, chapter);
      subjects.set(question.subject, subject);
      difficulties.set(difficultyKey, difficulty);
      continue;
    }
    chapter.attempted += 1;
    subject.attempted += 1;
    difficulty.attempted += 1;
    if (sameSelections(selected, question.correctOptionIds)) {
      correct += 1;
      grossMarkUnits += toMarkUnits(question.marks);
      chapter.correct += 1;
      subject.correct += 1;
      difficulty.correct += 1;
    } else {
      wrong += 1;
      negativeMarkUnits += toMarkUnits(question.negativeMarkWeight);
    }
    chapters.set(key, chapter);
    subjects.set(question.subject, subject);
    difficulties.set(difficultyKey, difficulty);
  }

  const attempted = correct + wrong;
  return {
    correct,
    wrong,
    skipped,
    grossMarks: roundMark(grossMarkUnits / MARK_SCALE),
    negativeMarks: roundMark(negativeMarkUnits / MARK_SCALE),
    netMarks: roundMark((grossMarkUnits - negativeMarkUnits) / MARK_SCALE),
    accuracy: attempted === 0 ? 0 : Number(((correct / attempted) * 100).toFixed(1)),
    chapterAccuracy: Array.from(chapters.values()).map(item => ({
      ...item,
      accuracy: item.attempted === 0 ? 0 : Number(((item.correct / item.attempted) * 100).toFixed(1)),
    })).sort((a, b) => a.accuracy - b.accuracy),
    subjectAccuracy: Array.from(subjects.values()).map(item => ({ ...item, accuracy: item.attempted === 0 ? 0 : Number(((item.correct / item.attempted) * 100).toFixed(1)) })).sort((a, b) => a.accuracy - b.accuracy),
    difficultyAccuracy: Array.from(difficulties.values()).map(item => ({ ...item, accuracy: item.attempted === 0 ? 0 : Number(((item.correct / item.attempted) * 100).toFixed(1)) })).sort((a, b) => a.difficulty.localeCompare(b.difficulty)),
  };
}
