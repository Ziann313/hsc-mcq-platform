import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(role: "user" | "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "review-test-user",
      name: "Review Test",
      email: "review@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("learning.reviewQuestion", () => {
  it("rejects review calls from non-admin users before any database change", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.learning.reviewQuestion({ questionId: 1, status: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks non-admin users from sending a custom student notification", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.learning.sendCustomNotification({
      userId: 2,
      type: "system",
      priority: "normal",
      title: "Platform update",
      body: "A new update is available.",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks non-admin users from entering review-ready source-linked questions", async () => {
    const caller = appRouter.createCaller(contextFor("user"));
    await expect(caller.learning.createReviewQuestion({
      academicYearId: 1,
      subjectId: 1,
      sourceVersionId: 1,
      pageReference: "p. 1",
      difficulty: "easy",
      prompt: "What is the requested answer to this source-linked question?",
      options: [{ text: "A", isCorrect: true }, { text: "B", isCorrect: false }],
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
