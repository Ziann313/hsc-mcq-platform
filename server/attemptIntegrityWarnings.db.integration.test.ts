import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { attemptAnswers, attemptIntegrityEvents, examAttempts, leaderboardScores, mistakes, questionOptions, questions, users } from "../drizzle/schema";
import { getDb } from "./db";
import { recordAttemptIntegrityEvent } from "./mcqDb";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => { await cleanup?.(); cleanup = undefined; });

describe.skipIf(!enabled)("frozen attempt integrity warnings", () => {
  it("server-finalizes an owned active attempt on the third visibility warning", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const [question] = await db.select({ id: questions.id }).from(questions).where(eq(questions.status, "published")).limit(1);
    const [option] = question ? await db.select({ id: questionOptions.id }).from(questionOptions).where(eq(questionOptions.questionId, question.id)).limit(1) : [];
    expect(question && option).toBeTruthy();
    if (!question || !option) return;
    const stamp = Date.now();
    const createdUser = await db.insert(users).values({ openId: `mcq-integrity-warning-${stamp}`, name: "Integrity warning learner", role: "student" });
    const userId = Number(createdUser[0].insertId);
    const createdAttempt = await db.insert(examAttempts).values({ userId, titleSnapshot: "Integrity warning test", examVersionSnapshot: "test", patternVersionSnapshot: "test", questionSetSnapshot: [{ questionId: question.id, correctOptionId: option.id, subject: "Test", chapter: null, marks: 1, negativeMarkWeight: 0, options: [{ id: option.id }] }], markingSchemeSnapshot: { marksPerCorrect: 1, negativeMarkPerWrong: 0 }, startedAt: new Date(stamp), expiresAt: new Date(stamp + 60_000) });
    const attemptId = Number(createdAttempt[0].insertId);
    cleanup = async () => { await db.delete(leaderboardScores).where(eq(leaderboardScores.userId, userId)); await db.delete(mistakes).where(eq(mistakes.userId, userId)); await db.delete(attemptIntegrityEvents).where(eq(attemptIntegrityEvents.attemptId, attemptId)); await db.delete(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId)); await db.delete(examAttempts).where(eq(examAttempts.id, attemptId)); await db.delete(users).where(eq(users.id, userId)); };
    await expect(recordAttemptIntegrityEvent({ userId, attemptId, eventType: "visibility_hidden" })).resolves.toMatchObject({ warningCount: 1, autoSubmitted: false });
    await expect(recordAttemptIntegrityEvent({ userId, attemptId, eventType: "visibility_hidden" })).resolves.toMatchObject({ warningCount: 2, autoSubmitted: false });
    await expect(recordAttemptIntegrityEvent({ userId, attemptId, eventType: "visibility_hidden" })).resolves.toMatchObject({ warningCount: 3, autoSubmitted: true });
    const [finished] = await db.select({ status: examAttempts.status, submittedAt: examAttempts.submittedAt }).from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
    expect(finished).toMatchObject({ status: "submitted" });
    expect(finished?.submittedAt).toBeTruthy();
  });
});
