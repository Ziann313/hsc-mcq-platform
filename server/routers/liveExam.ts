import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "../../shared/const";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { attachDailyChallengeTask, closeLiveExamRoom, createDailyChallengeSchedule, createLiveExamRoom, getLiveExamLaunchReadiness, getLiveExamResult, getLiveExamRoom, getLiveLeaderboard, joinLiveExamRoom, listDailyChallengeSchedules, listLiveExamRooms, listManagedLiveExamRooms, reportLiveIntegrityEvent, setDailyChallengeScheduleEnabled, submitLiveExamRoom } from "../liveExamDb";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const roomInput = z.object({
  title: z.string().trim().min(4).max(180), description: z.string().trim().max(1200).optional(), mode: z.enum(["scheduled", "daily_challenge"]),
  startsAt: z.date(), durationMinutes: z.number().int().min(5).max(360), questionIds: z.array(z.number().int().positive()).min(1).max(100),
  marksPerCorrect: z.number().min(0.25).max(10).default(1), negativeMarkPerWrong: z.number().min(0).max(5).default(0), maxParticipants: z.number().int().min(2).max(10000).optional(), autoSubmitAfterWarnings: z.number().int().min(2).max(10).default(3),
});
const dailyChallengeScheduleInput = roomInput.omit({ mode: true, startsAt: true, maxParticipants: true }).extend({ dailyTimeDhaka: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid Bangladesh time") });
const dailyChallengeCron = (time: string) => { const [hour, minute] = time.split(":").map(Number); return `0 ${minute} ${(hour - 6 + 24) % 24} * * *`; };

export const liveExamRouter = router({
  list: protectedProcedure.query(({ ctx }) => listLiveExamRooms(ctx.user.id)),
  detail: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).query(({ ctx, input }) => getLiveExamRoom(input.roomId, ctx.user.id)),
  result: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const result = await getLiveExamResult(input.roomId, ctx.user.id);
    if (!result) throw new Error("Submitted live-exam result not found");
    return result;
  }),
  leaderboard: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).query(({ ctx, input }) => getLiveLeaderboard(input.roomId, ctx.user.id)),
  join: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).mutation(({ ctx, input }) => joinLiveExamRoom(input.roomId, ctx.user.id)),
  submit: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), selections: z.array(z.object({ questionId: z.number().int().positive(), selectedOptionIds: z.array(z.number().int().positive()).max(6) })) })).mutation(({ ctx, input }) => submitLiveExamRoom(input.roomId, ctx.user.id, input.selections)),
  reportIntegrity: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), eventType: z.enum(["tab_blur", "visibility_hidden", "disconnect", "manual_flag"]), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(({ ctx, input }) => reportLiveIntegrityEvent(input.roomId, ctx.user.id, input.eventType, input.metadata)),
  create: adminProcedure.input(roomInput).mutation(({ ctx, input }) => createLiveExamRoom({ ...input, createdByUserId: ctx.user.id })),
  createDailyChallenge: adminProcedure.input(roomInput.omit({ mode: true, startsAt: true })).mutation(({ ctx, input }) => createLiveExamRoom({ ...input, createdByUserId: ctx.user.id, mode: "daily_challenge", startsAt: new Date() })),
  dailyChallengeSchedules: adminProcedure.query(() => listDailyChallengeSchedules()),
  createDailyChallengeSchedule: adminProcedure.input(dailyChallengeScheduleInput).mutation(async ({ ctx, input }) => {
    const cronExpression = dailyChallengeCron(input.dailyTimeDhaka);
    const scheduleId = await createDailyChallengeSchedule({ ...input, createdByUserId: ctx.user.id, cronExpression });
    const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    try {
      const job = await createHeartbeatJob({ name: `daily-challenge-${scheduleId}`, cron: cronExpression, path: "/api/scheduled/daily-challenge", payload: {}, description: `MCQ GURU daily challenge: ${input.title}` }, sessionToken);
      await attachDailyChallengeTask(scheduleId, job.taskUid);
      return { scheduleId, taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt ?? null };
    } catch (error) {
      await setDailyChallengeScheduleEnabled(scheduleId, false);
      throw error;
    }
  }),
  setDailyChallengeScheduleEnabled: adminProcedure.input(z.object({ scheduleId: z.number().int().positive(), isEnabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    const schedule = await setDailyChallengeScheduleEnabled(input.scheduleId, input.isEnabled);
    const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    if (schedule.scheduleCronTaskUid) await updateHeartbeatJob(schedule.scheduleCronTaskUid, { enable: input.isEnabled }, sessionToken);
    return { scheduleId: schedule.id, isEnabled: input.isEnabled };
  }),
  adminList: adminProcedure.query(() => listManagedLiveExamRooms()),
  launchReadiness: adminProcedure.query(() => getLiveExamLaunchReadiness()),
  close: adminProcedure.input(z.object({ roomId: z.number().int().positive() })).mutation(({ input }) => closeLiveExamRoom(input.roomId)),
});
