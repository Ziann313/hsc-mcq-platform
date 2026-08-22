import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { academicGroups, questions, subjects } from "../drizzle/schema";
import { getDb } from "./db";
import { getPublishedQuestionCapacity, getPublishedQuestions } from "./mcqDb";

const enabled = Boolean(process.env.DATABASE_URL);
const groups = ["science", "humanities", "business-studies"] as const;

describe.skipIf(!enabled)("HSC group-filtered preparation", () => {
  it("keeps published Bangla capacity and server-selected questions within the selected academic group", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    for (const groupSlug of groups) {
      const capacity = await getPublishedQuestionCapacity({ groupSlug, contentLanguage: "bn" });
      expect(capacity.total).toBeGreaterThan(0);

      const selected = await getPublishedQuestions({ groupSlug, contentLanguage: "bn", limit: 100 });
      expect(selected).not.toHaveLength(0);
      const selectedIds = selected.map(question => question.id);
      const rows = await db.select({ groupSlug: academicGroups.slug })
        .from(questions)
        .innerJoin(subjects, eq(questions.subjectId, subjects.id))
        .innerJoin(academicGroups, eq(subjects.groupId, academicGroups.id))
        .where(inArray(questions.id, selectedIds));
      expect(rows).toHaveLength(selected.length);
      expect(rows.every(row => row.groupSlug === groupSlug)).toBe(true);
    }
  }, 60_000);
});
