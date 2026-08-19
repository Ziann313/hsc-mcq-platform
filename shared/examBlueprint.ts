export type ExamSourceMode = "historical_only" | "approved_generated_only" | "mixed" | "specific_question_set";
export type ExamMode = "chapter_test" | "combined_chapter_test" | "paper_test" | "full_subject_mock" | "previous_year_simulation" | "pattern_mock" | "full_mock";

export type CountDistribution = Array<{ id: number; count: number }>;
export type ExamBlueprintConfiguration = {
  examMode: ExamMode;
  academicYearId: number;
  curriculumVersion: string;
  contentLanguage: "bn" | "en";
  sourceMode: ExamSourceMode;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  marksPerCorrect: number;
  negativeMarkPerWrong: number;
  unansweredPolicy: "no_penalty";
  instructions: string;
  subjectDistribution: CountDistribution;
  chapterDistribution: CountDistribution;
  difficultyDistribution: Array<{ difficulty: "easy" | "medium" | "hard"; count: number }>;
  questionTypeDistribution: Array<{ questionType: "single_mcq" | "multi_statement" | "stem_subquestion"; count: number }>;
  specificQuestionIds?: number[];
};

export type BlueprintValidation = { valid: boolean; errors: string[] };
const countTotal = (items: Array<{ count: number }>) => items.reduce((sum, item) => sum + item.count, 0);

export function validateExamBlueprint(value: ExamBlueprintConfiguration): BlueprintValidation {
  const errors: string[] = [];
  if (!Number.isInteger(value.academicYearId) || value.academicYearId < 1) errors.push("A valid academic year is required.");
  if (!value.curriculumVersion.trim() || value.curriculumVersion.length > 80) errors.push("A curriculum version is required.");
  if (!Number.isInteger(value.durationMinutes) || value.durationMinutes < 1 || value.durationMinutes > 360) errors.push("Duration must be between 1 and 360 minutes.");
  if (!Number.isInteger(value.totalQuestions) || value.totalQuestions < 1 || value.totalQuestions > 200) errors.push("Question total must be between 1 and 200.");
  if (!Number.isFinite(value.totalMarks) || value.totalMarks <= 0) errors.push("Total marks must be greater than zero.");
  if (!Number.isFinite(value.marksPerCorrect) || value.marksPerCorrect <= 0) errors.push("Marks per correct answer must be greater than zero.");
  if (!Number.isFinite(value.negativeMarkPerWrong) || value.negativeMarkPerWrong < 0 || value.negativeMarkPerWrong > value.marksPerCorrect) errors.push("Negative marking must be between zero and marks per correct answer.");
  if (Math.abs(value.totalMarks - value.totalQuestions * value.marksPerCorrect) > 0.001) errors.push("Total marks must equal question total × marks per correct answer.");
  if (!value.instructions.trim()) errors.push("Student instructions are required.");
  const validateCounts = (label: string, distribution: Array<{ count: number }>) => {
    if (distribution.some(item => !Number.isInteger(item.count) || item.count < 1)) errors.push(`${label} contains an invalid count.`);
    if (distribution.length && countTotal(distribution) !== value.totalQuestions) errors.push(`${label} must sum to the configured question total.`);
  };
  validateCounts("Subject distribution", value.subjectDistribution);
  validateCounts("Chapter distribution", value.chapterDistribution);
  validateCounts("Difficulty distribution", value.difficultyDistribution);
  validateCounts("Question-type distribution", value.questionTypeDistribution);
  if (value.sourceMode === "specific_question_set" && (!value.specificQuestionIds?.length || value.specificQuestionIds.length !== value.totalQuestions || new Set(value.specificQuestionIds).size !== value.specificQuestionIds.length)) errors.push("A specific question set must contain exactly the configured number of unique questions.");
  if (value.examMode === "previous_year_simulation" && value.sourceMode !== "historical_only") errors.push("Authentic previous-year simulations require historical-only source mode.");
  return { valid: errors.length === 0, errors };
}
