import { describe, expect, it } from "vitest";
import { getPublishedChapterAvailability, getPublishedQuestions } from "./mcqDb";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("Humanities and Business Studies content release", () => {
  it("returns the reviewed Bangla Civics, Sociology, Accounting, and Business Organization chapter batches with active evidence and complete options", async () => {
    const civics = await getPublishedQuestions({ subjectId: 60015, contentLanguage: "bn", limit: 10 });
    const sociology = await getPublishedQuestions({ subjectId: 60019, contentLanguage: "bn", limit: 10 });
    const accounting = await getPublishedQuestions({ subjectId: 60023, contentLanguage: "bn", limit: 10 });
    const businessOrganization = await getPublishedQuestions({ subjectId: 60027, contentLanguage: "bn", limit: 10 });
    expect(civics).toHaveLength(4);
    expect(sociology).toHaveLength(4);
    expect(accounting).toHaveLength(4);
    expect(businessOrganization).toHaveLength(4);
    for (const question of [...civics, ...sociology, ...accounting, ...businessOrganization]) {
      expect(question.options).toHaveLength(4);
      expect(question.options.filter(option => option.isCorrect)).toHaveLength(1);
      expect(question.explanation).toBeTruthy();
    }
    expect(await getPublishedChapterAvailability(60015, "bn")).toEqual(expect.arrayContaining([expect.objectContaining({ chapterId: 390001, questionCount: 4 })]));
    expect(await getPublishedChapterAvailability(60019, "bn")).toEqual(expect.arrayContaining([expect.objectContaining({ chapterId: 450001, questionCount: 4 })]));
    expect(await getPublishedChapterAvailability(60023, "bn")).toEqual(expect.arrayContaining([expect.objectContaining({ chapterId: 390002, questionCount: 4 })]));
    expect(await getPublishedChapterAvailability(60027, "bn")).toEqual(expect.arrayContaining([expect.objectContaining({ chapterId: 450002, questionCount: 4 })]));
  });
});
