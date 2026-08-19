export type HistoricalDistribution = Record<string, number>;

export type HistoricalAnalysisRow = {
  examProfileId: number;
  academicYearId?: number;
  boardName?: string;
  examYear?: number;
  subjectId?: number;
  bookId?: number;
  chapterId?: number;
  topicId?: number;
  conceptId?: number;
  appearanceCount: number;
  importanceScore?: number;
  questionTypeDistribution?: HistoricalDistribution;
  difficultyDistribution?: HistoricalDistribution;
  pageReference: string;
  notes?: string;
};

export function validateHistoricalDistribution(value: HistoricalDistribution | undefined, label: string) {
  if (!value) return;
  const entries = Object.entries(value);
  if (!entries.length || entries.length > 20) throw new Error(`${label} must contain between 1 and 20 categories`);
  for (const [key, count] of entries) {
    if (!key.trim() || key.length > 80 || !Number.isInteger(count) || count < 0 || count > 10_000) throw new Error(`${label} contains an invalid category or count`);
  }
}

export function validateHistoricalRowShape(row: HistoricalAnalysisRow) {
  if (!Number.isInteger(row.examProfileId) || row.examProfileId < 1) throw new Error("A valid exam profile is required");
  if (!Number.isInteger(row.appearanceCount) || row.appearanceCount < 1 || row.appearanceCount > 10_000) throw new Error("Appearance count must be an integer between 1 and 10,000");
  if (row.importanceScore !== undefined && (!Number.isInteger(row.importanceScore) || row.importanceScore < 0 || row.importanceScore > 100)) throw new Error("Importance score must be an integer between 0 and 100");
  if (row.examYear !== undefined && (!Number.isInteger(row.examYear) || row.examYear < 2000 || row.examYear > 2100)) throw new Error("Exam year must be between 2000 and 2100");
  if (!row.pageReference.trim() || row.pageReference.length > 100) throw new Error("Every historical analysis row requires a source page or section reference");
  validateHistoricalDistribution(row.questionTypeDistribution, "Question-type distribution");
  validateHistoricalDistribution(row.difficultyDistribution, "Difficulty distribution");
}
