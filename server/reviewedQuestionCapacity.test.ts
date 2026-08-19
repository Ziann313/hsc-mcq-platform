import { describe, expect, it } from "vitest";
import { reviewedQuestionCapacity, validateReviewedQuestionCapacity } from "../shared/reviewedQuestionCapacity";

describe("reviewed HSC and admission capacity definitions", () => {
  it("keeps original, source-linked batches answer-safe and correctly classified", () => {
    const counts = validateReviewedQuestionCapacity();
    expect(reviewedQuestionCapacity).toHaveLength(42);
    expect(counts).toEqual({ hsc: 12, du: 10, buet: 10, medical: 10 });
    expect(reviewedQuestionCapacity.every(question => question.options.filter(option => option.isCorrect).length === 1)).toBe(true);
    expect(reviewedQuestionCapacity.filter(question => question.track !== "hsc").every(question => question.additionalSourceReferences?.length === 1)).toBe(true);
  });
});
