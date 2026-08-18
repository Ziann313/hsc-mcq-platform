import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { scoreMcqExam } from "../../shared/mcq";
import { createReviewQuestion } from "../db";
import { addQuestionComment, getAttemptResult, getLeaderboard, getMistakeVault, getPublishedChapterAvailability, getPublishedCheatSheets, getPublishedQuestions, getQuestionComments, recordImportBatch, saveAttemptSelection, startFilteredAttempt, submitFrozenAttempt } from "../mcqDb";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";

const importedQuestion = z.object({
  academicYearId: z.number().int().positive(), subjectId: z.number().int().positive(), bookId: z.number().int().positive().optional(),
  prompt: z.string().min(10).max(5000), explanation: z.string().max(5000).optional(), difficulty: z.enum(["easy", "medium", "hard"]),
  sourceVersionId: z.number().int().positive(), pageReference: z.string().min(1).max(100),
  options: z.array(z.object({ text: z.string().min(1).max(1000), isCorrect: z.boolean() })).min(2).max(6).refine(items => items.filter(item => item.isCorrect).length === 1, "Exactly one correct option is required"),
});
const questionFilterInput = z.object({
  subjectId: z.number().int().positive().optional(), chapterId: z.number().int().positive().optional(), boardExamYear: z.number().int().min(2000).max(2100).optional(), boardName: z.string().max(100).optional(), collegePaper: z.string().max(180).optional(), boardStandard: z.enum(["board_standard", "varsity_admission_standard"]).optional(), questionType: z.enum(["single_mcq", "multi_statement", "stem_subquestion"]).optional(), contentLanguage: z.enum(["bn", "en"]).optional(), limit: z.number().int().min(1).max(100).default(20),
});

export const mcqRouter = router({
  publishedQuestions: publicProcedure.input(questionFilterInput).query(({ input }) => getPublishedQuestions(input)),
  publishedChapterAvailability: publicProcedure.input(z.object({ subjectId: z.number().int().positive().optional(), contentLanguage: z.enum(["bn", "en"]).optional() }).optional()).query(({ input }) => getPublishedChapterAvailability(input?.subjectId, input?.contentLanguage)),
  startFilteredAttempt: protectedProcedure.input(z.object({ filters: questionFilterInput, durationMinutes: z.number().int().min(1).max(240), marksPerCorrect: z.number().min(0.25).max(10) })).mutation(async ({ ctx, input }) => {
    const attempt = await startFilteredAttempt({ userId: ctx.user.id, ...input });
    if (!attempt) throw new TRPCError({ code: "NOT_FOUND", message: "No approved published questions match this filter" });
    return attempt;
  }),
  scorePreview: protectedProcedure.input(z.object({ questions: z.array(z.object({ id: z.number().int().positive(), correctOptionIds: z.array(z.number().int().positive()).min(1), marks: z.number().positive(), negativeMarkWeight: z.number().min(0), subject: z.string(), chapter: z.string() })).min(1), selections: z.array(z.object({ questionId: z.number().int().positive(), selectedOptionIds: z.array(z.number().int().positive()) })) })).mutation(({ input }) => scoreMcqExam(input.questions, input.selections)),
  saveAttemptSelection: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), questionId: z.number().int().positive(), selectedOptionIds: z.array(z.number().int().positive()).max(6) })).mutation(async ({ ctx, input }) => {
    const saved = await saveAttemptSelection({ ...input, userId: ctx.user.id });
    if (!saved) throw new TRPCError({ code: "CONFLICT", message: "This attempt is no longer accepting answers" });
    return { saved: true } as const;
  }),
  submitFrozenAttempt: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), selections: z.array(z.object({ questionId: z.number().int().positive(), selectedOptionIds: z.array(z.number().int().positive()) })) })).mutation(async ({ ctx, input }) => {
    const result = await submitFrozenAttempt({ ...input, userId: ctx.user.id });
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Active attempt not found" });
    return result;
  }),
  attemptResult: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const result = await getAttemptResult(ctx.user.id, input.attemptId);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Submitted attempt not found" });
    return result;
  }),
  leaderboard: publicProcedure.input(z.object({ period: z.enum(["global", "weekly"]), periodKey: z.string().min(4).max(30) })).query(({ input }) => getLeaderboard(input.period, input.periodKey)),
  cheatSheets: publicProcedure.query(() => getPublishedCheatSheets()),
  mistakeVault: protectedProcedure.query(({ ctx }) => getMistakeVault(ctx.user.id)),
  comments: publicProcedure.input(z.object({ questionId: z.number().int().positive() })).query(({ input }) => getQuestionComments(input.questionId)),
  addComment: protectedProcedure.input(z.object({ questionId: z.number().int().positive(), parentCommentId: z.number().int().positive().optional(), content: z.string().trim().min(2).max(1500) })).mutation(async ({ ctx, input }) => {
    const commentId = await addQuestionComment({ ...input, userId: ctx.user.id });
    if (!commentId) throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
    return { commentId };
  }),
  importReviewQuestions: adminProcedure.input(z.object({ fileName: z.string().min(1).max(260), fileType: z.enum(["json", "csv"]), rows: z.array(importedQuestion).min(1).max(500) })).mutation(async ({ ctx, input }) => {
    const accepted: number[] = []; const rejected: Array<{ row: number; message: string }> = [];
    for (let index = 0; index < input.rows.length; index += 1) {
      try { accepted.push(await createReviewQuestion({ ...input.rows[index]!, actorUserId: ctx.user.id })); }
      catch (error) { rejected.push({ row: index + 1, message: error instanceof Error ? error.message : "Unable to import row" }); }
    }
    const batchId = await recordImportBatch({ userId: ctx.user.id, fileName: input.fileName, fileType: input.fileType, totalRows: input.rows.length, acceptedRows: accepted.length, rejectedRows: rejected.length, validationReport: { rejected } });
    return { batchId, acceptedQuestionIds: accepted, rejected };
  }),
});
