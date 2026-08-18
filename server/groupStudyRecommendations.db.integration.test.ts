import { afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { studentProfiles, users } from "../drizzle/schema";
import { getDailyStudyGuide, getDb } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
let createdUserIds: number[] = [];

afterEach(async () => {
  const db = await getDb();
  if (!db || !createdUserIds.length) return;
  await db.delete(studentProfiles).where(inArray(studentProfiles.userId, createdUserIds));
  await db.delete(users).where(inArray(users.id, createdUserIds));
  createdUserIds = [];
});

describe.skipIf(!enabled)("group-specific Today’s Study recommendations", () => {
  it("prefers published Humanities and Business Studies chapters for learners in each respective group", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const stamp = Date.now();
    const businessUser = await db.insert(users).values({ openId: `business-guide-${stamp}`, name: "Business guide", role: "user" });
    const humanitiesUser = await db.insert(users).values({ openId: `humanities-guide-${stamp}`, name: "Humanities guide", role: "user" });
    const businessId = Number(businessUser[0].insertId);
    const humanitiesId = Number(humanitiesUser[0].insertId);
    createdUserIds = [businessId, humanitiesId];
    await db.insert(studentProfiles).values([
      { userId: businessId, preferredLanguage: "bn", academicYear: "2025-26", session: "2025-26", group: "business", targetExam: "hsc", dailyStudyMinutes: 60 },
      { userId: humanitiesId, preferredLanguage: "bn", academicYear: "2025-26", session: "2025-26", group: "humanities", targetExam: "hsc", dailyStudyMinutes: 60 },
    ]);
    const businessGuide = await getDailyStudyGuide(businessId);
    const humanitiesGuide = await getDailyStudyGuide(humanitiesId);
    expect(businessGuide.recommendedGroup).toBe("Business studies");
    expect(businessGuide.recommendedChapters.every(chapter => [60023, 60027].includes(chapter.subjectId))).toBe(true);
    expect(humanitiesGuide.recommendedGroup).toBe("Humanities");
    expect(humanitiesGuide.recommendedChapters.every(chapter => [60015, 60019].includes(chapter.subjectId))).toBe(true);
  });
});
