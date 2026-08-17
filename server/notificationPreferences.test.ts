import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function contextFor(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const authenticatedStudent = {
  id: 7,
  openId: "notification-test-student",
  name: "Notification Test",
  email: "notification@example.com",
  loginMethod: "manus",
  role: "student" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("learning notification preferences", () => {
  it("requires authentication before preferences can be read", async () => {
    const caller = appRouter.createCaller(contextFor(null));

    await expect(caller.learning.notificationPreferences()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("requires authentication before preferences can be changed", async () => {
    const caller = appRouter.createCaller(contextFor(null));

    await expect(caller.learning.updateNotificationPreferences({ studyEnabled: false })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects an empty preference update before it reaches persistence", async () => {
    const caller = appRouter.createCaller(contextFor(authenticatedStudent));

    await expect(caller.learning.updateNotificationPreferences({})).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
