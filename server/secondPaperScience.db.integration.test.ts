import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { questionOptions, questionSources, questions, sourceVersions, subjects } from "../drizzle/schema";
import { getDb } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
const secondPaperCodes = ["HSC-PHY2", "HSC-CHEM2", "HSC-BIO2"];

describe.skipIf(!enabled)("published second-paper science batches", () => {
  it("keeps bilingual original questions source-linked with four options and one answer key", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const rows = await db.select({
      questionId: questions.id,
      subjectCode: subjects.code,
      language: questions.contentLanguage,
      sourceStatus: sourceVersions.status,
      explanation: questions.explanation,
    }).from(questions)
      .innerJoin(subjects, eq(subjects.id, questions.subjectId))
      .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
      .innerJoin(sourceVersions, eq(sourceVersions.id, questionSources.sourceVersionId))
      .where(and(eq(questions.status, "published"), inArray(subjects.code, secondPaperCodes)));

    const uniqueRows = Array.from(new Map(rows.map(row => [row.questionId, row])).values());
    for (const code of secondPaperCodes) {
      expect(uniqueRows.filter(row => row.subjectCode === code && row.language === "bn")).toHaveLength(4);
      expect(uniqueRows.filter(row => row.subjectCode === code && row.language === "en").length).toBeGreaterThanOrEqual(4);
    }
    expect(rows.every(row => row.sourceStatus === "active" && Boolean(row.explanation?.trim()))).toBe(true);

    const optionRows = await db.select({ questionId: questionOptions.questionId, isCorrect: questionOptions.isCorrect })
      .from(questionOptions)
      .where(inArray(questionOptions.questionId, uniqueRows.map(row => row.questionId)));
    for (const question of uniqueRows) {
      const options = optionRows.filter(option => option.questionId === question.questionId);
      expect(options).toHaveLength(4);
      expect(options.filter(option => option.isCorrect)).toHaveLength(1);
    }
  });
});
