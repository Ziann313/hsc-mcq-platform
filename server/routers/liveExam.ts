import { z } from "zod";
import { closeLiveExamRoom, createLiveExamRoom, getLiveExamRoom, getLiveLeaderboard, joinLiveExamRoom, listLiveExamRooms, listManagedLiveExamRooms, reportLiveIntegrityEvent, submitLiveExamRoom } from "../liveExamDb";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const roomInput = z.object({
  title: z.string().trim().min(4).max(180), description: z.string().trim().max(1200).optional(), mode: z.enum(["scheduled", "daily_challenge"]),
  startsAt: z.date(), durationMinutes: z.number().int().min(5).max(360), questionIds: z.array(z.number().int().positive()).min(1).max(100),
  marksPerCorrect: z.number().min(0.25).max(10).default(1), negativeMarkPerWrong: z.number().min(0).max(5).default(0), maxParticipants: z.number().int().min(2).max(10000).optional(), autoSubmitAfterWarnings: z.number().int().min(2).max(10).default(3),
});

export const liveExamRouter = router({
  list: protectedProcedure.query(({ ctx }) => listLiveExamRooms(ctx.user.id)),
  detail: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).query(({ ctx, input }) => getLiveExamRoom(input.roomId, ctx.user.id)),
  leaderboard: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).query(({ ctx, input }) => getLiveLeaderboard(input.roomId, ctx.user.id)),
  join: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).mutation(({ ctx, input }) => joinLiveExamRoom(input.roomId, ctx.user.id)),
  submit: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), selections: z.array(z.object({ questionId: z.number().int().positive(), selectedOptionIds: z.array(z.number().int().positive()).max(6) })) })).mutation(({ ctx, input }) => submitLiveExamRoom(input.roomId, ctx.user.id, input.selections)),
  reportIntegrity: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), eventType: z.enum(["tab_blur", "visibility_hidden", "disconnect", "manual_flag"]), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(({ ctx, input }) => reportLiveIntegrityEvent(input.roomId, ctx.user.id, input.eventType, input.metadata)),
  create: adminProcedure.input(roomInput).mutation(({ ctx, input }) => createLiveExamRoom({ ...input, createdByUserId: ctx.user.id })),
  createDailyChallenge: adminProcedure.input(roomInput.omit({ mode: true, startsAt: true })).mutation(({ ctx, input }) => createLiveExamRoom({ ...input, createdByUserId: ctx.user.id, mode: "daily_challenge", startsAt: new Date() })),
  adminList: adminProcedure.query(() => listManagedLiveExamRooms()),
  close: adminProcedure.input(z.object({ roomId: z.number().int().positive() })).mutation(({ input }) => closeLiveExamRoom(input.roomId)),
});
