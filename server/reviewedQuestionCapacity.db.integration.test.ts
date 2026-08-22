import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { questionIntelligence, questionOptions, questionSources, questions } from "../drizzle/schema";
import { allReviewedQuestionCapacity, reviewedBilingualQuestionCapacity, reviewedQuestionCapacity } from "../shared/reviewedQuestionCapacity";
import { getDb } from "./db";
import { getPublishedQuestions } from "./mcqDb";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("reviewed HSC and admission question capacity release", () => {
  it("publishes each original practice item only after complete source, answer, and reviewer evidence is present", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    for (const definition of allReviewedQuestionCapacity) {
      const [question] = await db.select({
        id: questions.id,
        status: questions.status,
        boardStandard: questions.boardStandard,
        admissionTrack: questions.admissionTrack,
      }).from(questions).where(eq(questions.prompt, definition.prompt)).limit(1);
      expect(question).toMatchObject({
        status: "published",
        boardStandard: definition.boardStandard,
        admissionTrack: definition.admissionTrack ?? null,
      });
      if (!question) continue;

      const [intelligence] = await db.select({ verificationStatus: questionIntelligence.verificationStatus, provenance: questionIntelligence.provenance })
        .from(questionIntelligence).where(eq(questionIntelligence.questionId, question.id)).limit(1);
      expect(intelligence).toEqual({ verificationStatus: "approved", provenance: "original_source_linked" });

      const options = await db.select({ isCorrect: questionOptions.isCorrect }).from(questionOptions).where(eq(questionOptions.questionId, question.id));
      expect(options).toHaveLength(definition.options.length);
      expect(options.filter(option => option.isCorrect)).toHaveLength(1);

      const evidence = await db.select({ sourceVersionId: questionSources.sourceVersionId, pageReference: questionSources.pageReference })
        .from(questionSources).where(eq(questionSources.questionId, question.id));
      expect(evidence).toContainEqual({ sourceVersionId: definition.sourceVersionId, pageReference: definition.pageReference });
      for (const additionalReference of definition.additionalSourceReferences ?? []) {
        expect(evidence).toContainEqual(additionalReference);
      }
    }
  }, 60_000);

  it("makes original DU, BUET, and Medical question capacity available through server-side published-question selection", async () => {
    const expectations = [
      { admissionTrack: "du" as const, expected: 10 },
      { admissionTrack: "buet" as const, expected: 10 },
      { admissionTrack: "medical" as const, expected: 10 },
    ];
    for (const expectation of expectations) {
      const questionsForTrack = await getPublishedQuestions({ admissionTrack: expectation.admissionTrack, contentLanguage: "en", limit: 100 });
      const releasedPrompts = new Set(reviewedQuestionCapacity.filter(question => question.track === expectation.admissionTrack).map(question => question.prompt));
      expect(questionsForTrack.filter(question => releasedPrompts.has(question.prompt))).toHaveLength(expectation.expected);
      expect(questionsForTrack.filter(question => releasedPrompts.has(question.prompt)).every(question => question.options.filter(option => option.isCorrect).length === 1)).toBe(true);
    }
  }, 60_000);

  it("makes every released Bangla original counterpart available only through the Bangla language filter", async () => {
    const questionsForBangla = await getPublishedQuestions({ contentLanguage: "bn", limit: 100 });
    const releasedPrompts = new Set(reviewedBilingualQuestionCapacity.map(question => question.prompt));
    const selected = questionsForBangla.filter(question => releasedPrompts.has(question.prompt));
    expect(selected).toHaveLength(reviewedBilingualQuestionCapacity.length);
    expect(selected.every(question => question.contentLanguage === "bn" && question.options.filter(option => option.isCorrect).length === 1)).toBe(true);

    const englishQuestions = await getPublishedQuestions({ contentLanguage: "en", limit: 100 });
    expect(englishQuestions.some(question => releasedPrompts.has(question.prompt))).toBe(false);
  }, 60_000);
});
