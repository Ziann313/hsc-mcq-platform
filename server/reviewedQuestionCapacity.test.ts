import { describe, expect, it } from "vitest";
import { allReviewedQuestionCapacity, reviewedBilingualQuestionCapacity, reviewedQuestionCapacity, validateReviewedQuestionCapacity } from "../shared/reviewedQuestionCapacity";

describe("reviewed HSC and admission capacity definitions", () => {
  it("keeps original, source-linked batches answer-safe and correctly classified", () => {
    const counts = validateReviewedQuestionCapacity();
    expect(reviewedQuestionCapacity).toHaveLength(42);
    expect(reviewedBilingualQuestionCapacity).toHaveLength(12);
    expect(counts).toEqual({ hsc: 24, du: 10, buet: 10, medical: 10 });
    expect(allReviewedQuestionCapacity.every(question => question.options.filter(option => option.isCorrect).length === 1)).toBe(true);
    expect(allReviewedQuestionCapacity.filter(question => question.track !== "hsc").every(question => question.additionalSourceReferences?.length === 1)).toBe(true);
    expect(reviewedBilingualQuestionCapacity.every(question => question.contentLanguage === "bn" && question.intelligence.generationBasis.includes("not copied"))).toBe(true);
  });
});
