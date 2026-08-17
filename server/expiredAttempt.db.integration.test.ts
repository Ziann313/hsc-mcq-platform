import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { academicYears, attemptAnswers, examAttempts, leaderboardScores, mistakes, questionOptions, questions, subjects, users } from "../drizzle/schema";
import { getDb } from "./db";
import { getAttemptResult, saveAttemptSelection } from "./mcqDb";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => { await cleanup?.(); cleanup = undefined; });

describe.skipIf(!enabled)("expired attempt database integration", () => {
  it("saves an answer, finalizes after persisted expiry, and returns the stored result breakdown", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const stamp = Date.now();
    const [year] = await db.select({ id: academicYears.id }).from(academicYears).limit(1);
    const [subject] = await db.select({ id: subjects.id }).from(subjects).limit(1);
    expect(year && subject).toBeTruthy();
    if (!year || !subject) return;
    const userResult = await db.insert(users).values({ openId: `mcq-guru-expiry-test-${stamp}`, name: "MCQ GURU integration test", role: "student" });
    const userId = Number(userResult[0].insertId);
    let questionId = 0; let attemptId = 0;
    cleanup = async () => {
      if (userId) {
        await db.delete(leaderboardScores).where(eq(leaderboardScores.userId, userId));
        await db.delete(mistakes).where(eq(mistakes.userId, userId));
      }
      if (attemptId) { await db.delete(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId)); await db.delete(examAttempts).where(eq(examAttempts.id, attemptId)); }
      if (questionId) { await db.delete(questionOptions).where(eq(questionOptions.questionId, questionId)); await db.delete(questions).where(eq(questions.id, questionId)); }
      if (userId) await db.delete(users).where(eq(users.id, userId));
    };
    const questionResult = await db.insert(questions).values({ academicYearId: year.id, subjectId: subject.id, prompt: "Integration verification: choose the correct option.", difficulty: "easy", status: "published", negativeMarkWeight: "0.25" });
    questionId = Number(questionResult[0].insertId);
    await db.insert(questionOptions).values([{ questionId, optionKey: "A", text: "Correct", isCorrect: true }, { questionId, optionKey: "B", text: "Incorrect", isCorrect: false }]);
    const options = await db.select({ id: questionOptions.id, isCorrect: questionOptions.isCorrect }).from(questionOptions).where(eq(questionOptions.questionId, questionId));
    const correctOptionId = options.find(option => option.isCorrect)?.id;
    const wrongOptionId = options.find(option => !option.isCorrect)?.id;
    expect(correctOptionId && wrongOptionId).toBeTruthy();
    if (!correctOptionId || !wrongOptionId) return;
    const attemptResult = await db.insert(examAttempts).values({
      userId, titleSnapshot: "Integration expiry check", examVersionSnapshot: "test", patternVersionSnapshot: "test",
      questionSetSnapshot: [{ questionId, correctOptionId, subject: "Integration", chapter: "Expiry", marks: 1, negativeMarkWeight: 0.25 }],
      markingSchemeSnapshot: { marksPerCorrect: 1, negativeMarkPerWrong: 0.25 }, startedAt: new Date(stamp - 120_000), expiresAt: new Date(stamp + 60_000),
    });
    attemptId = Number(attemptResult[0].insertId);
    await expect(saveAttemptSelection({ userId, attemptId, questionId, selectedOptionIds: [wrongOptionId] })).resolves.toBe(true);
    await db.update(examAttempts).set({ expiresAt: new Date(stamp - 1_000) }).where(eq(examAttempts.id, attemptId));
    const finalized = await getAttemptResult(userId, attemptId);
    expect(finalized?.attempt.status).toBe("expired");
    expect(finalized?.attempt.score).toBe("-0.25");
    expect(finalized?.answers).toEqual([expect.objectContaining({ questionId, isCorrect: false, awardedMarks: "-0.25" })]);
    const [savedLeaderboard] = await db.select().from(leaderboardScores).where(eq(leaderboardScores.userId, userId)).limit(1);
    expect(savedLeaderboard?.netMarks).toBe("-0.25");
    const [savedMistake] = await db.select().from(mistakes).where(eq(mistakes.userId, userId)).limit(1);
    expect(savedMistake?.questionId).toBe(questionId);
  });
});
