import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { studentProfiles, users } from "../drizzle/schema";
import { getDb, getStudentProfile, saveStudentProfile } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => { await cleanup?.(); cleanup = undefined; });

describe.skipIf(!enabled)("onboarding profile persistence", () => {
  it("saves the learner-entered academic year, session, and institution", async () => {
    const db = await getDb();
    if (!db) return;
    const stamp = Date.now();
    const created = await db.insert(users).values({ openId: `onboarding-profile-test-${stamp}`, name: "Onboarding Test", role: "user" });
    const userId = Number(created[0].insertId);
    cleanup = async () => {
      await db.delete(studentProfiles).where(eq(studentProfiles.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    };
    await saveStudentProfile(userId, {
      language: "bn",
      academicYear: "HSC 2028",
      session: "2027–28",
      group: "science",
      targetExam: "hsc",
      institution: "Example College",
      dailyStudyMinutes: 120,
    });
    await expect(getStudentProfile(userId)).resolves.toMatchObject({
      academicYear: "HSC 2028",
      session: "2027–28",
      institution: "Example College",
      onboardingCompletedAt: expect.any(Date),
    });
  });
});
