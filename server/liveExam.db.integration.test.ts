import { eq, inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { academicYears, attemptAnswers, books, chapters, dailyChallengeNotificationDeliveries, dailyChallengeSchedules, examAttempts, leaderboardScores, liveExamIntegrityEvents, liveExamParticipants, liveExamRooms, notifications, questionOptions, questionSources, questions, sourceVersions, sources, studentNotificationPreferences, subjects, users } from "../drizzle/schema";
import { attachDailyChallengeTask, closeLiveExamRoom, createDailyChallengeSchedule, createLiveExamRoom, getLiveExamLaunchReadiness, getLiveExamResult, getLiveLeaderboard, joinLiveExamRoom, runScheduledDailyChallenge } from "./liveExamDb";
import { getDailyStudyGuide, getDb, getExamReadinessSummary, saveNotificationPreferences } from "./db";
import { getPublishedChapterAvailability, saveAttemptSelection, startFilteredAttempt } from "./mcqDb";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => { await cleanup?.(); cleanup = undefined; });

describe.skipIf(!enabled)("live-exam database integration", () => {
  it("restores saved answers on resume, ranks a submitted room, and finalizes an admin-closed room", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const stamp = Date.now();
    const [year] = await db.select({ id: academicYears.id }).from(academicYears).limit(1);
    const [subject] = await db.select({ id: subjects.id }).from(subjects).limit(1);
    expect(year && subject).toBeTruthy();
    if (!year || !subject) return;

    let adminId = 0; let studentId = 0; let roomId = 0; let attemptId = 0; let targetedAttemptId = 0; let questionId = 0; let sourceId = 0; let sourceVersionId = 0; let scheduleId = 0; let bookId = 0; let chapterId = 0;
    cleanup = async () => {
      if (roomId) await db.delete(liveExamIntegrityEvents).where(eq(liveExamIntegrityEvents.liveExamRoomId, roomId));
      if (roomId) await db.delete(liveExamParticipants).where(eq(liveExamParticipants.liveExamRoomId, roomId));
      if (attemptId) { await db.delete(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId)); await db.delete(examAttempts).where(eq(examAttempts.id, attemptId)); }
      if (targetedAttemptId) await db.delete(examAttempts).where(eq(examAttempts.id, targetedAttemptId));
      if (studentId) await db.delete(dailyChallengeNotificationDeliveries).where(eq(dailyChallengeNotificationDeliveries.userId, studentId));
      if (studentId) await db.delete(notifications).where(eq(notifications.userId, studentId));
      if (scheduleId) await db.delete(dailyChallengeNotificationDeliveries).where(eq(dailyChallengeNotificationDeliveries.dailyChallengeScheduleId, scheduleId));
      if (scheduleId) await db.delete(liveExamRooms).where(eq(liveExamRooms.dailyChallengeScheduleId, scheduleId));
      if (roomId) await db.delete(liveExamRooms).where(eq(liveExamRooms.id, roomId));
      if (scheduleId) await db.delete(dailyChallengeSchedules).where(eq(dailyChallengeSchedules.id, scheduleId));
      if (questionId) { await db.delete(questionSources).where(eq(questionSources.questionId, questionId)); await db.delete(questionOptions).where(eq(questionOptions.questionId, questionId)); await db.delete(questions).where(eq(questions.id, questionId)); }
      if (chapterId) await db.delete(chapters).where(eq(chapters.id, chapterId));
      if (bookId) await db.delete(books).where(eq(books.id, bookId));
      if (sourceVersionId) await db.delete(sourceVersions).where(eq(sourceVersions.id, sourceVersionId));
      if (sourceId) await db.delete(sources).where(eq(sources.id, sourceId));
      if (adminId || studentId) await db.delete(leaderboardScores).where(inArray(leaderboardScores.userId, [adminId, studentId].filter(Boolean)));
      if (studentId) await db.delete(studentNotificationPreferences).where(eq(studentNotificationPreferences.userId, studentId));
      if (adminId) await db.delete(users).where(eq(users.id, adminId));
      if (studentId) await db.delete(users).where(eq(users.id, studentId));
    };

    const adminResult = await db.insert(users).values({ openId: `live-admin-${stamp}`, name: "Live admin", role: "admin" });
    const studentResult = await db.insert(users).values({ openId: `live-student-${stamp}`, name: "Live student", role: "student" });
    adminId = Number(adminResult[0].insertId); studentId = Number(studentResult[0].insertId);
    const sourceResult = await db.insert(sources).values({ organization: "Integration source", title: "Live exam evidence", sourceUrl: `https://example.test/live/${stamp}`, sourceType: "official_syllabus" });
    sourceId = Number(sourceResult[0].insertId);
    const versionResult = await db.insert(sourceVersions).values({ sourceId, versionLabel: "test", contentHash: `live-${stamp}`, status: "active" });
    sourceVersionId = Number(versionResult[0].insertId);
    const bookResult = await db.insert(books).values({ subjectId: subject.id, titleEn: `Integration book ${stamp}`, titleBn: `ইন্টিগ্রেশন বই ${stamp}`, edition: "test" });
    bookId = Number(bookResult[0].insertId);
    const chapterResult = await db.insert(chapters).values({ bookId, chapterNo: "1", titleEn: `Integration chapter ${stamp}`, titleBn: `ইন্টিগ্রেশন অধ্যায় ${stamp}` });
    chapterId = Number(chapterResult[0].insertId);
    const questionResult = await db.insert(questions).values({ academicYearId: year.id, subjectId: subject.id, bookId, chapterId, prompt: "Live integration question", contentLanguage: "en", difficulty: "easy", status: "published", negativeMarkWeight: "0.25" });
    questionId = Number(questionResult[0].insertId);
    await db.insert(questionSources).values({ questionId, sourceVersionId, pageReference: "1" });
    expect(await getPublishedChapterAvailability(subject.id, "en")).toEqual(expect.arrayContaining([expect.objectContaining({ subjectId: subject.id, chapterId, questionCount: 1 })]));
    expect(await getPublishedChapterAvailability(subject.id, "bn")).not.toEqual(expect.arrayContaining([expect.objectContaining({ chapterId })]));
    await db.insert(questionOptions).values([{ questionId, optionKey: "A", text: "Correct", isCorrect: true }, { questionId, optionKey: "B", text: "Incorrect", isCorrect: false }]);
    const [correct] = await db.select({ id: questionOptions.id }).from(questionOptions).where(eq(questionOptions.questionId, questionId)).limit(1);
    expect(correct?.id).toBeTruthy();
    if (!correct) return;
    expect(await startFilteredAttempt({ userId: studentId, filters: { subjectId: subject.id, chapterId, contentLanguage: "bn", limit: 10 }, durationMinutes: 15, marksPerCorrect: 1 })).toBeUndefined();
    const chapterAttempt = await startFilteredAttempt({ userId: studentId, filters: { subjectId: subject.id, chapterId, contentLanguage: "en", limit: 10 }, durationMinutes: 15, marksPerCorrect: 1 });
    targetedAttemptId = chapterAttempt?.attemptId ?? 0;
    expect(chapterAttempt?.questions).toEqual([expect.objectContaining({ id: questionId })]);
    const recoveredChapterAttempt = await startFilteredAttempt({ userId: studentId, filters: { subjectId: subject.id, chapterId, contentLanguage: "en", limit: 10 }, durationMinutes: 15, marksPerCorrect: 1 });
    expect(recoveredChapterAttempt?.attemptId).toBe(chapterAttempt?.attemptId);

    const room = await createLiveExamRoom({ createdByUserId: adminId, title: "Live integration room", mode: "daily_challenge", startsAt: new Date(Date.now() - 1_000), durationMinutes: 5, questionIds: [questionId], marksPerCorrect: 1, negativeMarkPerWrong: 0.25, autoSubmitAfterWarnings: 3 });
    roomId = room.roomId;
    const joined = await joinLiveExamRoom(roomId, studentId);
    attemptId = joined.attemptId;
    expect(joined.questions[0]?.options[0]).not.toHaveProperty("isCorrect");
    await db.update(questions).set({ prompt: "Live question changed after the attempt began" }).where(eq(questions.id, questionId));
    await db.update(questionOptions).set({ text: "Changed option text" }).where(eq(questionOptions.id, correct.id));
    expect(await saveAttemptSelection({ userId: studentId, attemptId, questionId, selectedOptionIds: [correct.id] })).toBe(true);
    const resumed = await joinLiveExamRoom(roomId, studentId);
    expect(resumed.selections).toEqual([{ questionId, selectedOptionIds: [correct.id] }]);
    expect(resumed.questions[0]).toMatchObject({ prompt: "Live integration question" });
    expect(resumed.questions[0]?.options.find(option => option.id === correct.id)?.text).toBe("Correct");
    expect(resumed.questions[0]?.options[0]).not.toHaveProperty("isCorrect");

    const closed = await closeLiveExamRoom(roomId);
    expect(closed).toMatchObject({ closed: true, finalizedCount: 1 });
    const [finalizedAttempt] = await db.select({ activeSessionKey: examAttempts.activeSessionKey }).from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
    expect(finalizedAttempt?.activeSessionKey).toBeNull();
    const leaderboard = await getLiveLeaderboard(roomId, studentId);
    expect(leaderboard).toEqual([expect.objectContaining({ userId: studentId, rank: 1, isMe: true })]);
    expect(Number(leaderboard[0].finalScore)).toBe(1);
    const review = await getLiveExamResult(roomId, studentId);
    expect(review).toMatchObject({ myRank: 1, participant: expect.objectContaining({ status: "submitted" }) });
    expect(review?.result.answers).toEqual([expect.objectContaining({ questionId, isCorrect: true, awardedMarks: "1.00" })]);
    expect(review?.subjectAccuracy).toEqual([expect.objectContaining({ total: 1, correct: 1, accuracy: 100 })]);
    const readiness = await getExamReadinessSummary(studentId);
    expect(readiness).toMatchObject({ totalAnswered: 1, overallAccuracy: 100, subjectAccuracy: [expect.objectContaining({ total: 1, correct: 1, accuracy: 100 })] });
    const dailyGuide = await getDailyStudyGuide(studentId);
    const guideChapters = dailyGuide.groups.flatMap(group => group.subjects.flatMap(guideSubject => guideSubject.chapters));
    expect(guideChapters).toEqual(expect.arrayContaining([expect.objectContaining({ subjectId: subject.id, chapterId, questionCount: 1, answered: 1, correct: 1, accuracy: 100, estimatedMinutes: 5 })]));
    const launchReadiness = await getLiveExamLaunchReadiness();
    expect(launchReadiness).toMatchObject({ readyForFirstRoom: true });
    expect(launchReadiness.sourceValidatedQuestionCount).toBeGreaterThanOrEqual(1);
    scheduleId = await createDailyChallengeSchedule({ createdByUserId: adminId, title: "Daily integration challenge", questionIds: [questionId], durationMinutes: 10, marksPerCorrect: 1, negativeMarkPerWrong: 0.25, autoSubmitAfterWarnings: 3, cronExpression: "0 0 12 * * *" });
    await attachDailyChallengeTask(scheduleId, `daily-test-${stamp}`);
    await saveNotificationPreferences(studentId, { dailyChallengeEnabled: true });
    const generated = await runScheduledDailyChallenge(`daily-test-${stamp}`, new Date());
    expect(generated).toMatchObject({ ok: true, challengeDate: expect.any(String) });
    const duplicate = await runScheduledDailyChallenge(`daily-test-${stamp}`, new Date());
    expect(duplicate).toMatchObject({ ok: true, skipped: "already_created", roomId: generated.roomId });
    const deliveries = await db.select().from(dailyChallengeNotificationDeliveries).where(eq(dailyChallengeNotificationDeliveries.userId, studentId));
    expect(deliveries).toEqual([expect.objectContaining({ dailyChallengeScheduleId: scheduleId, liveExamRoomId: generated.roomId })]);
    const [challengeNotice] = await db.select().from(notifications).where(eq(notifications.id, deliveries[0].notificationId!));
    expect(challengeNotice).toMatchObject({ type: "study", actionUrl: `/live-exams/${generated.roomId}` });
  });
});
