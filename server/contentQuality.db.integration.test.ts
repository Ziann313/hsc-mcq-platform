import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { academicYears, books, chapters, questionOptions, questionSources, questions, sourceVersions, subjects } from "../drizzle/schema";
import { getDb } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);

function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

describe.skipIf(!enabled)("published content quality gate", () => {
  it("keeps every published question curriculum-mapped, source-valid, answer-complete, and non-duplicated", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const published = await db.select({
      id: questions.id,
      prompt: questions.prompt,
      academicYearId: questions.academicYearId,
      subjectId: questions.subjectId,
      bookId: questions.bookId,
      chapterId: questions.chapterId,
      contentLanguage: questions.contentLanguage,
      subjectYearId: subjects.academicYearId,
      bookSubjectId: books.subjectId,
      chapterBookId: chapters.bookId,
    }).from(questions)
      .innerJoin(subjects, eq(questions.subjectId, subjects.id))
      .leftJoin(books, eq(questions.bookId, books.id))
      .leftJoin(chapters, eq(questions.chapterId, chapters.id))
      .where(eq(questions.status, "published"));

    expect(published.length).toBeGreaterThan(0);
    expect(published.every(question => Boolean(question.bookId) && Boolean(question.chapterId) && question.subjectYearId === question.academicYearId && question.bookSubjectId === question.subjectId && question.chapterBookId === question.bookId)).toBe(true);

    const questionIds = published.map(question => question.id);
    const sources = await db.select({ questionId: questionSources.questionId, status: sourceVersions.status, pageReference: questionSources.pageReference })
      .from(questionSources).innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id));
    const options = await db.select({ questionId: questionOptions.questionId, isCorrect: questionOptions.isCorrect }).from(questionOptions);

    for (const questionId of questionIds) {
      const evidence = sources.filter(source => source.questionId === questionId);
      const answers = options.filter(option => option.questionId === questionId);
      expect(evidence.some(source => source.status === "active" && source.pageReference.trim().length > 0)).toBe(true);
      expect(answers.length).toBeGreaterThanOrEqual(2);
      expect(answers.filter(option => option.isCorrect).length).toBe(1);
    }

    const seen = new Set<string>();
    for (const question of published) {
      const key = [question.academicYearId, question.subjectId, question.bookId, question.chapterId, question.contentLanguage, normalize(question.prompt)].join(":");
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }

    const activeAcademicYears = await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.status, "active"));
    expect(activeAcademicYears.length).toBeGreaterThan(0);
  });
});
