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
});
