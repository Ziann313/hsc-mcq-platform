import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { attemptAnswers, dailyChallengeNotificationDeliveries, dailyChallengeSchedules, examAttempts, liveExamIntegrityEvents, liveExamParticipants, liveExamRooms, questionOptions, questionSources, questions, sourceVersions, subjects, chapters, questionStems, users } from "../drizzle/schema";
import { getDb } from "./db";
import { releaseSubscriptionUsage, reserveSubscriptionUsage } from "./subscriptionDb";
import { deliverDailyChallengeNotifications } from "./db";
import { getAttemptResult, submitFrozenAttempt } from "./mcqDb";
import { resolveLiveRoomState, shouldAutoSubmitForIntegrityWarnings } from "../shared/liveExam";

type LiveMode = "scheduled" | "daily_challenge";
type IntegrityEvent = "tab_blur" | "visibility_hidden" | "disconnect" | "manual_flag";
type LiveFrozenQuestion = { questionId: number; questionVersion: number; correctOptionId: number; prompt: string; questionType: string; stemContext: string | null; subject: string; chapter: string; options: Array<{ id: number; optionKey: string; text: string }>; marks: number; negativeMarkWeight: number };

function safeLiveFrozenQuestions(frozen: LiveFrozenQuestion[]) {
  return frozen.map(question => ({ id: question.questionId, questionId: question.questionId, prompt: question.prompt, questionType: question.questionType, stemContext: question.stemContext, subject: question.subject, chapter: question.chapter, options: question.options }));
}

async function syncRoomLifecycle(roomId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [room] = await db.select().from(liveExamRooms).where(eq(liveExamRooms.id, roomId)).limit(1);
  if (!room) return undefined;
  const next = resolveLiveRoomState({ configuredState: room.status, startsAt: room.startsAt, endsAt: room.endsAt });
  if (next !== room.status) await db.update(liveExamRooms).set({ status: next }).where(eq(liveExamRooms.id, roomId));
  return { ...room, status: next };
}

async function getSourceValidatedQuestions(questionIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const ids = Array.from(new Set(questionIds));
  if (!ids.length) throw new Error("Choose at least one published question");
  const rows = await db.select({
    id: questions.id, questionVersion: questions.currentVersion, prompt: questions.prompt, questionType: questions.questionType, negativeMarkWeight: questions.negativeMarkWeight,
    subject: subjects.nameEn, chapter: chapters.titleEn, stemContext: questionStems.contextParagraph,
  }).from(questions).innerJoin(subjects, eq(questions.subjectId, subjects.id)).leftJoin(chapters, eq(questions.chapterId, chapters.id)).leftJoin(questionStems, eq(questions.stemId, questionStems.id))
    .where(and(inArray(questions.id, ids), eq(questions.status, "published")));
  if (rows.length !== ids.length) throw new Error("Every live-exam question must already be published");
  const sourced = await db.select({ questionId: questionSources.questionId }).from(questionSources).innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
    .where(and(inArray(questionSources.questionId, ids), eq(sourceVersions.status, "active")));
  if (new Set(sourced.map(row => row.questionId)).size !== ids.length) throw new Error("Every live-exam question must have active source evidence");
  const options = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, ids));
  const ordered = ids.map(id => rows.find(row => row.id === id)).filter(Boolean) as typeof rows;
  return ordered.map(question => {
    const optionsForQuestion = options.filter(option => option.questionId === question.id);
    const correct = optionsForQuestion.find(option => option.isCorrect);
    if (!correct || optionsForQuestion.length < 2) throw new Error("A live-exam question must have two options and one correct answer");
    return { ...question, options: optionsForQuestion, correctOptionId: correct.id };
  });
}

export async function createLiveExamRoom(input: { createdByUserId: number; title: string; description?: string; mode: LiveMode; startsAt: Date; durationMinutes: number; questionIds: number[]; marksPerCorrect: number; negativeMarkPerWrong: number; maxParticipants?: number; autoSubmitAfterWarnings: number; dailyChallengeScheduleId?: number; challengeDate?: string; }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (input.startsAt.getTime() < Date.now() - 60_000) throw new Error("Scheduled start time cannot be in the past");
  await getSourceValidatedQuestions(input.questionIds);
  const endsAt = new Date(input.startsAt.getTime() + input.durationMinutes * 60_000);
  const result = await db.insert(liveExamRooms).values({
    createdByUserId: input.createdByUserId, title: input.title, description: input.description || null, mode: input.mode,
    status: resolveLiveRoomState({ configuredState: "scheduled", startsAt: input.startsAt, endsAt }), startsAt: input.startsAt, endsAt, dailyChallengeScheduleId: input.dailyChallengeScheduleId ?? null, challengeDate: input.challengeDate ?? null,
    durationMinutes: input.durationMinutes, questionIds: Array.from(new Set(input.questionIds)), marksPerCorrect: String(input.marksPerCorrect), negativeMarkPerWrong: String(input.negativeMarkPerWrong),
    maxParticipants: input.maxParticipants ?? null, autoSubmitAfterWarnings: input.autoSubmitAfterWarnings,
  });
  return { roomId: Number(result[0].insertId), startsAt: input.startsAt, endsAt };
}

async function finalizeIfExpired(participantId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [participant] = await db.select({ participant: liveExamParticipants, attempt: examAttempts }).from(liveExamParticipants).innerJoin(examAttempts, eq(liveExamParticipants.attemptId, examAttempts.id))
    .where(and(eq(liveExamParticipants.id, participantId), eq(liveExamParticipants.userId, userId))).limit(1);
  if (!participant || participant.participant.status !== "joined" || new Date() < participant.attempt.expiresAt) return participant?.participant;
  const stored = await db.select({ questionId: attemptAnswers.questionId, selectedOptionIds: attemptAnswers.selectedOptionIds }).from(attemptAnswers).where(eq(attemptAnswers.attemptId, participant.attempt.id));
  const result = await submitFrozenAttempt({ userId, attemptId: participant.attempt.id, selections: stored.map(answer => ({ questionId: answer.questionId, selectedOptionIds: Array.isArray(answer.selectedOptionIds) ? answer.selectedOptionIds as number[] : [] })) });
  const submittedAt = new Date();
  await db.update(liveExamParticipants).set({ status: "expired", submittedAt, finalScore: result ? String(result.netMarks) : null, timeTakenSeconds: Math.max(0, Math.round((submittedAt.getTime() - participant.participant.joinedAt.getTime()) / 1000)) }).where(eq(liveExamParticipants.id, participantId));
  return undefined;
}

export async function listLiveExamRooms(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rooms = await db.select().from(liveExamRooms).where(inArray(liveExamRooms.status, ["scheduled", "live", "closed"])).orderBy(asc(liveExamRooms.startsAt)).limit(40);
  const output = [];
  for (const room of rooms) {
    const synced = await syncRoomLifecycle(room.id);
    if (!synced) continue;
    const [counter] = await db.select({ count: sql<number>`count(*)` }).from(liveExamParticipants).where(eq(liveExamParticipants.liveExamRoomId, room.id));
    const [mine] = userId ? await db.select({ status: liveExamParticipants.status, attemptId: liveExamParticipants.attemptId }).from(liveExamParticipants).where(and(eq(liveExamParticipants.liveExamRoomId, room.id), eq(liveExamParticipants.userId, userId))).limit(1) : [];
    output.push({ ...synced, participantCount: Number(counter?.count ?? 0), myStatus: mine?.status ?? null, myAttemptId: mine?.attemptId ?? null });
  }
  return output;
}

export async function listManagedLiveExamRooms() {
  const db = await getDb();
  if (!db) return [];
  const rooms = await db.select().from(liveExamRooms).orderBy(desc(liveExamRooms.createdAt)).limit(100);
  const output = [];
  for (const room of rooms) {
    const synced = await syncRoomLifecycle(room.id);
    if (!synced) continue;
    const [counter] = await db.select({ count: sql<number>`count(*)` }).from(liveExamParticipants).where(eq(liveExamParticipants.liveExamRoomId, room.id));
    output.push({ ...synced, participantCount: Number(counter?.count ?? 0) });
  }
  return output;
}

export async function getLiveExamRoom(roomId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const room = await syncRoomLifecycle(roomId);
  if (!room) return undefined;
  const [counter] = await db.select({ count: sql<number>`count(*)` }).from(liveExamParticipants).where(eq(liveExamParticipants.liveExamRoomId, roomId));
  const [participant] = await db.select().from(liveExamParticipants).where(and(eq(liveExamParticipants.liveExamRoomId, roomId), eq(liveExamParticipants.userId, userId))).limit(1);
  if (participant) await finalizeIfExpired(participant.id, userId);
  const [current] = await db.select().from(liveExamParticipants).where(and(eq(liveExamParticipants.liveExamRoomId, roomId), eq(liveExamParticipants.userId, userId))).limit(1);
  const ranking = await getLiveLeaderboard(roomId, userId);
  return { room, participantCount: Number(counter?.count ?? 0), participant: current ?? null, leaderboard: ranking };
}

export async function getLiveExamResult(roomId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const room = await syncRoomLifecycle(roomId);
  if (!room) return undefined;
  const [existing] = await db.select().from(liveExamParticipants).where(and(eq(liveExamParticipants.liveExamRoomId, roomId), eq(liveExamParticipants.userId, userId))).limit(1);
  if (!existing?.attemptId) return undefined;
  const attemptId = existing.attemptId;
  await finalizeIfExpired(existing.id, userId);
  const [participant] = await db.select().from(liveExamParticipants).where(eq(liveExamParticipants.id, existing.id)).limit(1);
  if (!participant || participant.status === "joined") return undefined;
  const result = await getAttemptResult(userId, attemptId);
  if (!result) return undefined;
  const leaderboard = await getLiveLeaderboard(roomId, userId);
  const subjectTotals = result.answers.reduce<Record<string, { total: number; correct: number }>>((summary, answer) => {
    const subject = answer.subject || "General";
    const entry = summary[subject] ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (answer.isCorrect) entry.correct += 1;
    summary[subject] = entry;
    return summary;
  }, {});
  const subjectAccuracy = Object.entries(subjectTotals).map(([subject, counts]) => ({ subject, ...counts, accuracy: Math.round((counts.correct / counts.total) * 100) })).sort((a, b) => a.accuracy - b.accuracy || a.subject.localeCompare(b.subject));
  return { room, participant, result, leaderboard, myRank: leaderboard.find(entry => entry.isMe)?.rank ?? null, subjectAccuracy };
}

export async function getLiveExamLaunchReadiness() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [published] = await db.select({ count: sql<number>`count(*)` }).from(questions).where(eq(questions.status, "published"));
  const [sourceValidated] = await db.select({ count: sql<number>`count(distinct ${questions.id})` }).from(questions)
    .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
    .innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
    .where(and(eq(questions.status, "published"), eq(sourceVersions.status, "active")));
  const [scheduled] = await db.select({ count: sql<number>`count(*)` }).from(liveExamRooms).where(inArray(liveExamRooms.status, ["scheduled", "live"]));
  return {
    publishedQuestionCount: Number(published?.count ?? 0),
    sourceValidatedQuestionCount: Number(sourceValidated?.count ?? 0),
    activeRoomCount: Number(scheduled?.count ?? 0),
    readyForFirstRoom: Number(sourceValidated?.count ?? 0) > 0,
  };
}

export async function listDailyChallengeSchedules() {
  const db = await getDb();
  if (!db) return [];
  const schedules = await db.select().from(dailyChallengeSchedules).orderBy(desc(dailyChallengeSchedules.createdAt)).limit(30);
  return Promise.all(schedules.map(async schedule => {
    const [delivery] = await db.select({ count: sql<number>`count(*)` }).from(dailyChallengeNotificationDeliveries).where(eq(dailyChallengeNotificationDeliveries.dailyChallengeScheduleId, schedule.id));
    return { ...schedule, notificationDeliveryCount: Number(delivery?.count ?? 0) };
  }));
}

export async function createDailyChallengeSchedule(input: { createdByUserId: number; title: string; description?: string; questionIds: number[]; durationMinutes: number; marksPerCorrect: number; negativeMarkPerWrong: number; autoSubmitAfterWarnings: number; cronExpression: string; }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await getSourceValidatedQuestions(input.questionIds);
  const created = await db.insert(dailyChallengeSchedules).values({ createdByUserId: input.createdByUserId, title: input.title, description: input.description || null, questionIds: input.questionIds, durationMinutes: input.durationMinutes, marksPerCorrect: String(input.marksPerCorrect), negativeMarkPerWrong: String(input.negativeMarkPerWrong), autoSubmitAfterWarnings: input.autoSubmitAfterWarnings, cronExpression: input.cronExpression });
  return Number(created[0].insertId);
}

export async function attachDailyChallengeTask(scheduleId: number, taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(dailyChallengeSchedules).set({ scheduleCronTaskUid: taskUid }).where(eq(dailyChallengeSchedules.id, scheduleId));
}

export async function setDailyChallengeScheduleEnabled(scheduleId: number, isEnabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [schedule] = await db.select().from(dailyChallengeSchedules).where(eq(dailyChallengeSchedules.id, scheduleId)).limit(1);
  if (!schedule) throw new Error("Daily challenge schedule not found");
  await db.update(dailyChallengeSchedules).set({ isEnabled }).where(eq(dailyChallengeSchedules.id, scheduleId));
  return schedule;
}

function challengeDateInDhaka(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function runScheduledDailyChallenge(taskUid: string, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [schedule] = await db.select().from(dailyChallengeSchedules).where(eq(dailyChallengeSchedules.scheduleCronTaskUid, taskUid)).limit(1);
  if (!schedule || !schedule.isEnabled) return { ok: true, skipped: "orphan_or_paused" as const };
  const challengeDate = challengeDateInDhaka(now);
  const [existing] = await db.select({ id: liveExamRooms.id }).from(liveExamRooms).where(and(eq(liveExamRooms.dailyChallengeScheduleId, schedule.id), eq(liveExamRooms.challengeDate, challengeDate))).limit(1);
  if (existing) return { ok: true, skipped: "already_created" as const, roomId: existing.id };
  const room = await createLiveExamRoom({ createdByUserId: schedule.createdByUserId, title: schedule.title, description: schedule.description ?? undefined, mode: "daily_challenge", startsAt: now, durationMinutes: schedule.durationMinutes, questionIds: Array.isArray(schedule.questionIds) ? schedule.questionIds.map(Number) : [], marksPerCorrect: Number(schedule.marksPerCorrect), negativeMarkPerWrong: Number(schedule.negativeMarkPerWrong), autoSubmitAfterWarnings: schedule.autoSubmitAfterWarnings, dailyChallengeScheduleId: schedule.id, challengeDate });
  const notification = await deliverDailyChallengeNotifications({ scheduleId: schedule.id, roomId: room.roomId, challengeDate, title: schedule.title, durationMinutes: schedule.durationMinutes });
  return { ok: true, roomId: room.roomId, challengeDate, notification };
}

export async function joinLiveExamRoom(roomId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const room = await syncRoomLifecycle(roomId);
  if (!room) throw new Error("Live exam room not found");
  if (room.status !== "live") throw new Error(room.status === "scheduled" ? "This live exam has not started yet" : "This live exam is closed");
  const [existing] = await db.select().from(liveExamParticipants).where(and(eq(liveExamParticipants.liveExamRoomId, roomId), eq(liveExamParticipants.userId, userId))).limit(1);
  if (existing?.attemptId) return getLiveAttempt(room, existing);
  const [counter] = await db.select({ count: sql<number>`count(*)` }).from(liveExamParticipants).where(eq(liveExamParticipants.liveExamRoomId, roomId));
  if (room.maxParticipants && Number(counter?.count ?? 0) >= room.maxParticipants) throw new Error("This live exam room is full");
  const questionIds = Array.isArray(room.questionIds) ? room.questionIds.map(Number) : [];
  const questionSet = await getSourceValidatedQuestions(questionIds);
  const frozen = questionSet.map(question => ({ questionId: question.id, questionVersion: question.questionVersion, correctOptionId: question.correctOptionId, prompt: question.prompt, questionType: question.questionType, stemContext: question.stemContext ?? null, subject: question.subject, chapter: question.chapter ?? "General", options: question.options.map(({ isCorrect: _isCorrect, ...option }) => ({ id: option.id, optionKey: option.optionKey, text: option.text })), marks: Number(room.marksPerCorrect), negativeMarkWeight: Number(room.negativeMarkPerWrong) })) satisfies LiveFrozenQuestion[];
  const activeSessionKey = `live-room:${room.id}:${userId}`;
  const usage = await reserveSubscriptionUsage(userId, "exams", 1);
  if (!usage.allowed) throw new Error("Free access includes one full exam per week. Upgrade to Premium for unlimited exams.");
  let attemptId: number;
  try {
    const created = await db.insert(examAttempts).values({ userId, titleSnapshot: room.title, examVersionSnapshot: `live-room-${room.id}`, patternVersionSnapshot: room.mode, questionSetSnapshot: frozen, markingSchemeSnapshot: { marksPerCorrect: Number(room.marksPerCorrect), negativeMarkPerWrong: Number(room.negativeMarkPerWrong), liveExamRoomId: room.id }, startedAt: room.startsAt, expiresAt: room.endsAt, activeSessionKey });
    attemptId = Number(created[0].insertId);
  } catch {
    const [racedParticipant] = await db.select().from(liveExamParticipants).where(and(eq(liveExamParticipants.liveExamRoomId, roomId), eq(liveExamParticipants.userId, userId))).limit(1);
    if (racedParticipant?.attemptId) {
      if (!usage.unlimited) await releaseSubscriptionUsage(userId, "exams", 1, usage.periodKey);
      return getLiveAttempt(room, racedParticipant);
    }
    if (!usage.unlimited) await releaseSubscriptionUsage(userId, "exams", 1, usage.periodKey);
    throw new Error("A live-exam join is already being initialized; please retry");
  }
  const participantResult = await db.insert(liveExamParticipants).values({ liveExamRoomId: roomId, userId, attemptId });
  const participant = { id: Number(participantResult[0].insertId), liveExamRoomId: roomId, userId, attemptId, joinedAt: new Date(), submittedAt: null, finalScore: null, timeTakenSeconds: null, warningCount: 0, status: "joined" as const };
  return { participant, attemptId, expiresAt: room.endsAt, selections: [], questions: safeLiveFrozenQuestions(frozen) };
}

async function getLiveAttempt(room: typeof liveExamRooms.$inferSelect, participant: typeof liveExamParticipants.$inferSelect) {
  const db = await getDb();
  const [attempt] = db && participant.attemptId ? await db.select({ questionSetSnapshot: examAttempts.questionSetSnapshot, expiresAt: examAttempts.expiresAt }).from(examAttempts).where(eq(examAttempts.id, participant.attemptId)).limit(1) : [];
  const frozen = attempt?.questionSetSnapshot as LiveFrozenQuestion[] | undefined;
  if (!Array.isArray(frozen) || !frozen.length || frozen.some(question => !question.prompt || !Array.isArray(question.options) || !question.options.length)) throw new Error("This live attempt has no immutable rendering snapshot");
  const saved = db && participant.attemptId ? await db.select({ questionId: attemptAnswers.questionId, selectedOptionIds: attemptAnswers.selectedOptionIds }).from(attemptAnswers).where(eq(attemptAnswers.attemptId, participant.attemptId)) : [];
  const selections = saved.map(answer => ({ questionId: answer.questionId, selectedOptionIds: Array.isArray(answer.selectedOptionIds) ? answer.selectedOptionIds as number[] : [] }));
  return { participant, attemptId: participant.attemptId!, expiresAt: attempt.expiresAt, selections, questions: safeLiveFrozenQuestions(frozen) };
}

export async function closeLiveExamRoom(roomId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const room = await syncRoomLifecycle(roomId);
  if (!room) throw new Error("Live exam room not found");
  if (room.status === "closed" || room.status === "archived") return { closed: false, finalizedCount: 0 };
  const participants = await db.select().from(liveExamParticipants).where(and(eq(liveExamParticipants.liveExamRoomId, roomId), eq(liveExamParticipants.status, "joined")));
  let finalizedCount = 0;
  for (const participant of participants) {
    if (!participant.attemptId) continue;
    const stored = await db.select({ questionId: attemptAnswers.questionId, selectedOptionIds: attemptAnswers.selectedOptionIds }).from(attemptAnswers).where(eq(attemptAnswers.attemptId, participant.attemptId));
    const result = await submitFrozenAttempt({ userId: participant.userId, attemptId: participant.attemptId, selections: stored.map(answer => ({ questionId: answer.questionId, selectedOptionIds: Array.isArray(answer.selectedOptionIds) ? answer.selectedOptionIds as number[] : [] })) });
    const submittedAt = new Date();
    await db.update(liveExamParticipants).set({ status: "submitted", submittedAt, finalScore: result ? String(result.netMarks) : null, timeTakenSeconds: Math.max(0, Math.round((submittedAt.getTime() - participant.joinedAt.getTime()) / 1000)) }).where(eq(liveExamParticipants.id, participant.id));
    finalizedCount += 1;
  }
  await db.update(liveExamRooms).set({ status: "closed" }).where(eq(liveExamRooms.id, roomId));
  return { closed: true, finalizedCount };
}

export async function submitLiveExamRoom(roomId: number, userId: number, selections: Array<{ questionId: number; selectedOptionIds: number[] }>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [participant] = await db.select().from(liveExamParticipants).where(and(eq(liveExamParticipants.liveExamRoomId, roomId), eq(liveExamParticipants.userId, userId))).limit(1);
  if (!participant?.attemptId || participant.status !== "joined") throw new Error("No active live-exam participation found");
  const result = await submitFrozenAttempt({ userId, attemptId: participant.attemptId, selections });
  if (!result) throw new Error("This live exam is no longer accepting answers");
  const submittedAt = new Date();
  const [attempt] = await db.select({ status: examAttempts.status }).from(examAttempts).where(eq(examAttempts.id, participant.attemptId)).limit(1);
  await db.update(liveExamParticipants).set({ status: attempt?.status === "expired" ? "expired" : "submitted", submittedAt, finalScore: String(result.netMarks), timeTakenSeconds: Math.max(0, Math.round((submittedAt.getTime() - participant.joinedAt.getTime()) / 1000)) }).where(eq(liveExamParticipants.id, participant.id));
  return { ...result, attemptId: participant.attemptId };
}

export async function getLiveLeaderboard(roomId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ participantId: liveExamParticipants.id, userId: liveExamParticipants.userId, name: users.name, finalScore: liveExamParticipants.finalScore, timeTakenSeconds: liveExamParticipants.timeTakenSeconds, status: liveExamParticipants.status, submittedAt: liveExamParticipants.submittedAt }).from(liveExamParticipants).innerJoin(users, eq(liveExamParticipants.userId, users.id)).where(and(eq(liveExamParticipants.liveExamRoomId, roomId), inArray(liveExamParticipants.status, ["submitted", "expired"]))).orderBy(desc(liveExamParticipants.finalScore), asc(liveExamParticipants.timeTakenSeconds), asc(liveExamParticipants.submittedAt)).limit(100);
  return rows.map((row, index) => ({ ...row, rank: index + 1, isMe: row.userId === userId }));
}

export async function reportLiveIntegrityEvent(roomId: number, userId: number, eventType: IntegrityEvent, metadata?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const room = await syncRoomLifecycle(roomId);
  const [participant] = await db.select().from(liveExamParticipants).where(and(eq(liveExamParticipants.liveExamRoomId, roomId), eq(liveExamParticipants.userId, userId))).limit(1);
  if (!room || !participant || participant.status !== "joined") return { warningCount: participant?.warningCount ?? 0, autoSubmitted: false };
  const warningCount = participant.warningCount + 1;
  await db.insert(liveExamIntegrityEvents).values({ liveExamRoomId: roomId, participantId: participant.id, eventType, metadata: metadata ?? null });
  await db.update(liveExamParticipants).set({ warningCount }).where(eq(liveExamParticipants.id, participant.id));
  if (!shouldAutoSubmitForIntegrityWarnings(warningCount, room.autoSubmitAfterWarnings)) return { warningCount, autoSubmitted: false };
  const stored = participant.attemptId ? await db.select({ questionId: attemptAnswers.questionId, selectedOptionIds: attemptAnswers.selectedOptionIds }).from(attemptAnswers).where(eq(attemptAnswers.attemptId, participant.attemptId)) : [];
  await submitLiveExamRoom(roomId, userId, stored.map(answer => ({ questionId: answer.questionId, selectedOptionIds: Array.isArray(answer.selectedOptionIds) ? answer.selectedOptionIds as number[] : [] })));
  return { warningCount, autoSubmitted: true };
}
