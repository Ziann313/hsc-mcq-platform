import { z } from "zod";
import { getExamBlueprints, publishExamBlueprint, saveExamBlueprint } from "../examBlueprintDb";
import { adminProcedure, router } from "../_core/trpc";

const countDistribution = z.array(z.object({ id: z.number().int().positive(), count: z.number().int().min(1).max(200) })).max(100);
const blueprintInput = z.object({
  examMode: z.enum(["chapter_test", "combined_chapter_test", "paper_test", "full_subject_mock", "previous_year_simulation", "pattern_mock", "full_mock"]),
  academicYearId: z.number().int().positive(),
  curriculumVersion: z.string().trim().min(1).max(80),
  contentLanguage: z.enum(["bn", "en"]),
  sourceMode: z.enum(["historical_only", "approved_generated_only", "mixed", "specific_question_set"]),
  durationMinutes: z.number().int().min(1).max(360),
  totalQuestions: z.number().int().min(1).max(200),
  totalMarks: z.number().positive().max(1000),
  marksPerCorrect: z.number().positive().max(100),
  negativeMarkPerWrong: z.number().min(0).max(100),
  unansweredPolicy: z.literal("no_penalty"),
  instructions: z.string().trim().min(1).max(5000),
  subjectDistribution: countDistribution,
  chapterDistribution: countDistribution,
  difficultyDistribution: z.array(z.object({ difficulty: z.enum(["easy", "medium", "hard"]), count: z.number().int().min(1).max(200) })).max(3),
  questionTypeDistribution: z.array(z.object({ questionType: z.enum(["single_mcq", "multi_statement", "stem_subquestion"]), count: z.number().int().min(1).max(200) })).max(3),
  specificQuestionIds: z.array(z.number().int().positive()).min(1).max(200).optional(),
});

export const examsRouter = router({
  blueprints: adminProcedure.query(() => getExamBlueprints()),
  saveBlueprint: adminProcedure.input(z.object({ examPatternVersionId: z.number().int().positive(), configuration: blueprintInput })).mutation(({ ctx, input }) => saveExamBlueprint({ ...input, actorUserId: ctx.user.id })),
  publishBlueprint: adminProcedure.input(z.object({ examPatternVersionId: z.number().int().positive() })).mutation(({ ctx, input }) => publishExamBlueprint({ ...input, actorUserId: ctx.user.id })),
});
