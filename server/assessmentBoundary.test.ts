import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAdministratorContext(): TrpcContext {
  return {
    user: { id: 1, openId: "assessment-boundary-admin", email: null, name: "Assessment boundary", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("assessment API boundary", () => {
  it("does not expose answer keys through administrator published-question browsing", async () => {
    const caller = appRouter.createCaller(createAdministratorContext());
    const questions = await caller.mcq.publishedQuestions({ limit: 1 });
    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]?.options[0]).not.toHaveProperty("isCorrect");
  });

  it("does not retain the legacy client-defined startExam route", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(Object.keys(caller.learning)).not.toContain("startExam");
  });
});
