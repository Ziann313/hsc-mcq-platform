import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: { id: 1, openId: "admission-readiness-test", name: "Test learner", email: null, loginMethod: null, role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admission readiness contracts", () => {
  it("exposes active source-reviewed tracks separately from the student readiness summary", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.learning.activeAdmissionTracks()).resolves.toEqual(expect.any(Array));
    await expect(caller.learning.admissionReadiness()).resolves.toEqual(expect.objectContaining({ activeTracks: expect.any(Array), progress: expect.objectContaining({ completedAttempts: expect.any(Number) }) }));
  });
});
