import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAiGenerationJob, getAiGenerationJobs, reviewAiGenerationJob, runAiGenerationJob, submitVerifiedAiJobForHumanReview } from "../aiGenerationDb";
import { getHistoricalImportOptions } from "../historicalAnalysisDb";
import { adminProcedure, router } from "../_core/trpc";

const jobInput = z.object({
  academicYearId: z.number().int().positive(),
  examProfileId: z.number().int().positive().optional(),
  subjectId: z.number().int().positive(),
  bookId: z.number().int().positive(),
  chapterId: z.number().int().positive(),
  topicId: z.number().int().positive().optional(),
  conceptId: z.number().int().positive().optional(),
  contentLanguage: z.enum(["bn", "en"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  requestInstructions: z.string().trim().min(12).max(2000),
  sourceReferences: z.array(z.object({ sourceVersionId: z.number().int().positive(), pageReference: z.string().trim().min(1).max(100) })).min(1).max(5),
});

export const aiGenerationRouter = router({
  options: adminProcedure.query(() => getHistoricalImportOptions()),
  jobs: adminProcedure.query(() => getAiGenerationJobs()),
  createJob: adminProcedure.input(jobInput).mutation(async ({ ctx, input }) => ({ jobId: await createAiGenerationJob({ ...input, requestedByUserId: ctx.user.id }) })),
  runJob: adminProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const result = await runAiGenerationJob({ ...input, actorUserId: ctx.user.id });
    if (result.outcome === "not_ready") throw new TRPCError({ code: "CONFLICT", message: "Only a newly created draft job can run the generation pipeline" });
    return result;
  }),
  sendToHumanReview: adminProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const result = await submitVerifiedAiJobForHumanReview({ ...input, actorUserId: ctx.user.id });
    if (result.outcome !== "submitted") throw new TRPCError({ code: "PRECONDITION_FAILED", message: result.outcome === "no_source" ? "This job has no authorised source evidence" : "Independent answer verification must succeed before human review" });
    return result;
  }),
  reviewJob: adminProcedure.input(z.object({ jobId: z.number().int().positive(), status: z.enum(["rejected", "archived"]) })).mutation(async ({ ctx, input }) => {
    const changed = await reviewAiGenerationJob({ ...input, actorUserId: ctx.user.id });
    if (!changed) throw new TRPCError({ code: "CONFLICT", message: "This generation job cannot be changed in its current state" });
    return { success: true } as const;
  }),
});
