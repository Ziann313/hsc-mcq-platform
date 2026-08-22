import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const anonymousContext = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: {},
} as unknown as TrpcContext;

const studentContext = {
  user: { id: 1, openId: "question-bank-student", email: null, name: "Question bank student", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} },
  res: {},
} as unknown as TrpcContext;

describe("question-bank access boundary", () => {
  it("rejects anonymous requests for full published-question payloads", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.mcq.publishedQuestions({ limit: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps full prompts, explanations, and options out of student browsing while exposing safe aggregate capacity", async () => {
    const studentCaller = appRouter.createCaller(studentContext);
    await expect(studentCaller.mcq.publishedQuestions({ limit: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const publicCaller = appRouter.createCaller(anonymousContext);
    const capacity = await publicCaller.mcq.publishedQuestionCapacity();
    expect(capacity).toMatchObject({ total: expect.any(Number), subjects: expect.any(Array), chapters: expect.any(Array) });
    expect(JSON.stringify(capacity)).not.toMatch(/prompt|explanation|option|isCorrect/i);
  });
});
