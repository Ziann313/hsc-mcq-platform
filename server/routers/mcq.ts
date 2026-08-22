import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createReviewQuestion } from "../db";
import { addQuestionComment, getActiveFrozenAttempt, getAttemptExamIntelligence, getAttemptResult, getExamHistory, getLeaderboard, getMistakeVault, getPublishedChapterAvailability, getPublishedCheatSheets, getPublishedQuestionCapacity, getPublishedQuestions, getQuestionComments, recordAttemptIntegrityEvent, recordImportBatch, saveAttemptSelection, setAttemptMarkForReview, setAttemptQuestionPosition, startFilteredAttempt, submitFrozenAttempt } from "../mcqDb";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { questionIntelligenceInput } from "../questionIntelligenceInput";
import { releaseSubscriptionUsage, reserveSubscriptionUsage } from "../subscriptionDb";

const importedQuestion = z.object({
  academicYearId: z.number().int().positive(), subjectId: z.number().int().positive(), bookId: z.number().int().positive(), chapterId: z.number().int().positive(), topicId: z.number().int().positive().optional(), conceptId: z.number().int().positive().optional(), contentLanguage: z.enum(["bn", "en"]),
  prompt: z.string().min(10).max(5000), explanation: z.string().max(5000).optional(), difficulty: z.enum(["easy", "medium", "hard"]), boardStandard: z.enum(["board_standard", "varsity_admission_standard"]).optional(), admissionTrack: z.enum(["du", "buet", "medical"]).optional(),
  sourceVersionId: z.number().int().positive(), pageReference: z.string().min(1).max(100), additionalSourceReferences: z.array(z.object({ sourceVersionId: z.number().int().positive(), pageReference: z.string().min(1).max(100) })).max(4).optional(), intelligence: questionIntelligenceInput,
  options: z.array(z.object({ text: z.string().min(1).max(1000), isCorrect: z.boolean() })).min(2).max(6).refine(items => items.filter(item => item.isCorrect).length === 1, "Exactly one correct option is required"),
});
const questionFilterInput = z.object({
  subjectId: z.number().int().positive().optional(), chapterId: z.number().int().positive().optional(), chapterIds: z.array(z.number().int().positive()).min(1).max(30).optional(), topicIds: z.array(z.number().int().positive()).min(1).max(50).optional(), conceptIds: z.array(z.number().int().positive()).min(1).max(50).optional(), examProfileId: z.number().int().positive().optional(), sourceMode: z.enum(["historical_only", "generated_only", "mixed", "verified_only"]).optional(), boardExamYear: z.number().int().min(2000).max(2100).optional(), boardName: z.string().max(100).optional(), collegePaper: z.string().max(180).optional(), boardStandard: z.enum(["board_standard", "varsity_admission_standard"]).optional(), admissionTrack: z.enum(["du", "buet", "medical"]).optional(), questionType: z.enum(["single_mcq", "multi_statement", "stem_subquestion"]).optional(), contentLanguage: z.enum(["bn", "en"]).optional(), limit: z.number().int().min(1).max(100).default(20),
});

export const mcqRouter = router({
  publishedQuestionCapacity: publicProcedure.input(questionFilterInput.omit({ limit: true }).optional()).query(({ input }) => getPublishedQuestionCapacity(input ?? {})),
  publishedQuestions: adminProcedure.input(questionFilterInput).query(async ({ input }) => {
    const published = await getPublishedQuestions(input);
    return published.map(question => ({
      ...question,
      options: question.options.map(({ isCorrect: _isCorrect, ...option }) => option),
    }));
  }),
  publishedChapterAvailability: publicProcedure.input(z.object({ subjectId: z.number().int().positive().optional(), contentLanguage: z.enum(["bn", "en"]).optional() }).optional()).query(({ input }) => getPublishedChapterAvailability(input?.subjectId, input?.contentLanguage)),
  startFilteredAttempt: protectedProcedure.input(z.object({ filters: questionFilterInput, durationMinutes: z.number().int().min(1).max(240), mistakeRetest: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const usageType = input.filters.examProfileId || input.durationMinutes >= 45 ? "exams" : "practice_questions";
    const usageAmount = usageType === "exams" ? 1 : input.filters.limit;
    const usage = await reserveSubscriptionUsage(ctx.user.id, usageType, usageAmount);
    if (!usage.allowed) throw new TRPCError({ code: "FORBIDDEN", message: usageType === "exams" ? "Free access includes one full exam per week. Upgrade to Premium for unlimited exams." : `Free practice is limited to ${usage.limit} questions per day. Upgrade to Premium for unlimited practice.` });
    const attempt = await startFilteredAttempt({ userId: ctx.user.id, ...input });
    if (!attempt) await releaseSubscriptionUsage(ctx.user.id, usageType, usageAmount, usage.periodKey);
    if (!attempt) throw new TRPCError({ code: "NOT_FOUND", message: "No approved published questions match this filter" });
    const actualCount = attempt.questions.length;
    if (!usage.unlimited && usageType === "practice_questions" && actualCount < input.filters.limit) await releaseSubscriptionUsage(ctx.user.id, usageType, input.filters.limit - actualCount, usage.periodKey);
    return attempt;
  }),
  saveAttemptSelection: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), questionId: z.number().int().positive(), selectedOptionIds: z.array(z.number().int().positive()).max(6).refine(ids => new Set(ids).size === ids.length, "Duplicate options are not allowed") })).mutation(async ({ ctx, input }) => {
    const saved = await saveAttemptSelection({ ...input, userId: ctx.user.id });
    if (!saved) throw new TRPCError({ code: "CONFLICT", message: "This attempt is no longer accepting answers" });
    return { saved: true } as const;
  }),
  activeAttempt: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const attempt = await getActiveFrozenAttempt(ctx.user.id, input.attemptId);
    if (!attempt) throw new TRPCError({ code: "NOT_FOUND", message: "No recoverable active attempt was found" });
    return attempt;
  }),
  setAttemptMarkForReview: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), questionId: z.number().int().positive(), markedForReview: z.boolean() })).mutation(async ({ ctx, input }) => {
    const saved = await setAttemptMarkForReview({ ...input, userId: ctx.user.id });
    if (!saved) throw new TRPCError({ code: "CONFLICT", message: "This attempt is no longer accepting review changes" });
    return { saved: true } as const;
  }),
  setAttemptQuestionPosition: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), currentQuestionIndex: z.number().int().min(0).max(199) })).mutation(async ({ ctx, input }) => {
    const saved = await setAttemptQuestionPosition({ ...input, userId: ctx.user.id });
    if (!saved) throw new TRPCError({ code: "CONFLICT", message: "This attempt is no longer accepting navigation updates" });
    return { saved: true } as const;
  }),
  reportAttemptIntegrity: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), eventType: z.enum(["tab_blur", "visibility_hidden", "fullscreen_exit"]), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
    const saved = await recordAttemptIntegrityEvent({ ...input, userId: ctx.user.id });
    if (!saved) throw new TRPCError({ code: "CONFLICT", message: "This attempt is no longer accepting integrity events" });
    return { saved: true } as const;
  }),
  submitFrozenAttempt: protectedProcedure.input(z.object({ attemptId: z.number().int().positive(), selections: z.array(z.object({ questionId: z.number().int().positive(), selectedOptionIds: z.array(z.number().int().positive()).max(6).refine(ids => new Set(ids).size === ids.length, "Duplicate options are not allowed") })) })).mutation(async ({ ctx, input }) => {
    const result = await submitFrozenAttempt({ ...input, userId: ctx.user.id });
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Active attempt not found" });
    return result;
  }),
  attemptResult: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const result = await getAttemptResult(ctx.user.id, input.attemptId);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Submitted attempt not found" });
    return result;
  }),
  attemptIntelligence: protectedProcedure.input(z.object({ attemptId: z.number().int().positive() })).query(({ ctx, input }) => getAttemptExamIntelligence(ctx.user.id, input.attemptId)),
  examHistory: protectedProcedure.query(({ ctx }) => getExamHistory(ctx.user.id)),
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
