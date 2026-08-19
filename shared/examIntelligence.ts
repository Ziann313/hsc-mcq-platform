export type FrozenConceptQuestion = { questionId: number; subjectId?: number; chapterId?: number | null; conceptId?: number | null; subject?: string; chapter?: string; concept?: string | null };
export type PersistedConceptAnswer = { questionId: number; selectedOptionIds: number[]; isCorrect: boolean | null };
export type WeakConcept = { conceptId: number; concept: string; subjectId: number | null; subject: string; chapterId: number | null; chapter: string; attempted: number; correct: number; accuracy: number; belowAttemptAverage: boolean };

export function deriveWeakConcepts(questions: FrozenConceptQuestion[], answers: PersistedConceptAnswer[]): WeakConcept[] {
  const answersByQuestion = new Map(answers.map(answer => [answer.questionId, answer]));
  const groups = new Map<number, WeakConcept>();
  for (const question of questions) {
    const answer = answersByQuestion.get(question.questionId);
    if (!question.conceptId || !question.concept || !answer || !answer.selectedOptionIds.length || answer.isCorrect === null) continue;
    const current = groups.get(question.conceptId) ?? { conceptId: question.conceptId, concept: question.concept, subjectId: question.subjectId ?? null, subject: question.subject ?? "General", chapterId: question.chapterId ?? null, chapter: question.chapter ?? "General", attempted: 0, correct: 0, accuracy: 0, belowAttemptAverage: false };
    current.attempted += 1;
    if (answer.isCorrect) current.correct += 1;
    groups.set(question.conceptId, current);
  }
  const concepts = Array.from(groups.values()).map(item => ({ ...item, accuracy: Number(((item.correct / item.attempted) * 100).toFixed(1)) }));
  const overallAccuracy = concepts.reduce((total, item) => total + item.correct, 0) / concepts.reduce((total, item) => total + item.attempted, 0) * 100;
  return concepts.map(item => ({ ...item, belowAttemptAverage: Number.isFinite(overallAccuracy) && item.accuracy < overallAccuracy })).sort((left, right) => left.accuracy - right.accuracy || right.attempted - left.attempted || left.concept.localeCompare(right.concept));
}
