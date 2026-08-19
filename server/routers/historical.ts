import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getHistoricalImportBatches, getHistoricalImportOptions, getVerifiedHistoricalAnalysis, importHistoricalAnalysis, reviewHistoricalImportBatch } from "../historicalAnalysisDb";
import { adminProcedure, publicProcedure, router } from "../_core/trpc";

const distribution = z.record(z.string().min(1).max(80), z.number().int().min(0).max(10_000)).optional();
const historicalRow = z.object({
  examProfileId: z.number().int().positive(),
  academicYearId: z.number().int().positive().optional(),
  boardName: z.string().trim().min(2).max(100).optional(),
  examYear: z.number().int().min(2000).max(2100),
  subjectId: z.number().int().positive().optional(),
  bookId: z.number().int().positive().optional(),
  chapterId: z.number().int().positive().optional(),
  topicId: z.number().int().positive().optional(),
  conceptId: z.number().int().positive().optional(),
  appearanceCount: z.number().int().min(1).max(10_000),
  importanceScore: z.number().int().min(0).max(100).optional(),
  questionTypeDistribution: distribution,
  difficultyDistribution: distribution,
  pageReference: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(3000).optional(),
});

export const historicalRouter = router({
  verifiedAnalysis: publicProcedure.input(z.object({
    examProfileId: z.number().int().positive().optional(),
    subjectId: z.number().int().positive().optional(),
    chapterId: z.number().int().positive().optional(),
    boardName: z.string().trim().min(2).max(100).optional(),
    examYear: z.number().int().min(2000).max(2100).optional(),
  }).optional()).query(({ input }) => getVerifiedHistoricalAnalysis(input ?? {})),

  importOptions: adminProcedure.query(() => getHistoricalImportOptions()),
  importBatches: adminProcedure.query(() => getHistoricalImportBatches()),

  importAnalysis: adminProcedure.input(z.object({
    sourceVersionId: z.number().int().positive(),
    fileName: z.string().trim().min(1).max(260),
    fileType: z.enum(["json", "csv"]),
    rows: z.array(historicalRow).min(1).max(500),
  })).mutation(async ({ ctx, input }) => importHistoricalAnalysis({ ...input, userId: ctx.user.id })),

  reviewImportBatch: adminProcedure.input(z.object({ batchId: z.number().int().positive(), status: z.enum(["verified", "rejected", "archived"]) })).mutation(async ({ ctx, input }) => {
    const changed = await reviewHistoricalImportBatch({ ...input, actorUserId: ctx.user.id });
    if (!changed) throw new TRPCError({ code: "CONFLICT", message: "This historical import batch is no longer awaiting review" });
    return { success: true } as const;
  }),
});
