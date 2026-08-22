import { describe, expect, it } from "vitest";
import { createTutorRequestPolicy, tutorCacheKey } from "./tutorPolicy";

describe("approved-source tutor policy", () => {
  it("normalizes equivalent requests into one privacy-safe cache key without leaking the question text", () => {
    const first = tutorCacheKey({ question: " Explain   Ohm's law ", academicYear: "2025-26", language: "en" });
    const second = tutorCacheKey({ question: "explain ohm's law", academicYear: "2025-26", language: "en" });
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("caches approved-source responses for the configured interval and rate-limits users independently", () => {
    const policy = createTutorRequestPolicy({ cacheTtlMs: 1000, windowMs: 100, maxRequests: 2 });
    const key = "response";
    policy.set(key, { verified: true, answer: "Grounded answer", sources: [{ book: "Book", chapter: "Chapter", page: "1" }] }, 10);
    expect(policy.get(key, 100)).toMatchObject({ answer: "Grounded answer", cached: true });
    expect(policy.get(key, 1010)).toBeUndefined();

    expect(policy.consume(7, 0)).toMatchObject({ allowed: true, remaining: 1 });
    expect(policy.consume(7, 1)).toMatchObject({ allowed: true, remaining: 0 });
    expect(policy.consume(7, 2)).toMatchObject({ allowed: false, remaining: 0 });
    expect(policy.consume(8, 2)).toMatchObject({ allowed: true, remaining: 1 });
    expect(policy.consume(7, 101)).toMatchObject({ allowed: true, remaining: 1 });
  });
});
