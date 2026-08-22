import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { payments, subscriptions, usageLimits, users } from "../drizzle/schema";
import { createManualPaymentRequest, ensureSubscriptionForUser, getSubscriptionPlans, getSubscriptionStatus, reviewManualPayment } from "./subscriptionDb";
import { getDb } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => { await cleanup?.(); cleanup = undefined; });

describe.skipIf(!enabled)("subscription database integration", () => {
  it("creates a trial without granting Premium, then grants Premium only after an approved manual payment review", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const stamp = Date.now();
    let userId = 0;
    cleanup = async () => {
      if (userId) await db.delete(payments).where(eq(payments.userId, userId));
      if (userId) await db.delete(usageLimits).where(eq(usageLimits.userId, userId));
      if (userId) await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
      if (userId) await db.delete(users).where(eq(users.id, userId));
    };

    const user = await db.insert(users).values({ openId: `subscription-test-${stamp}`, name: "Subscription Test", role: "student" });
    userId = Number(user[0].insertId);
    const beforeReview = await ensureSubscriptionForUser(userId, new Date("2026-08-01T00:00:00.000Z"));
    expect(beforeReview.status).toBe("trial");
    expect((await getSubscriptionStatus(userId, new Date("2026-08-02T00:00:00.000Z"))).hasFullAccess).toBe(true);

    const monthlyPlan = (await getSubscriptionPlans()).find(plan => plan.code === "premium-monthly");
    expect(monthlyPlan).toBeTruthy();
    if (!monthlyPlan) return;
    const request = await createManualPaymentRequest({ userId, planId: monthlyPlan.id, method: "bkash_manual", senderPhone: "01956953111", transactionReference: `TEST-${stamp}` });
    expect(request).toBeTruthy();
    if (!request) return;
    const [pending] = await db.select().from(payments).where(eq(payments.id, request.paymentId)).limit(1);
    expect(pending?.status).toBe("pending");
    expect(pending?.gateway).toBe("bkash_manual");

    expect(await reviewManualPayment({ paymentId: request.paymentId, approved: true, reviewerNote: "Integration approval", now: new Date("2026-08-02T00:00:00.000Z") })).toBe(true);
    const entitlement = await getSubscriptionStatus(userId, new Date("2026-08-03T00:00:00.000Z"));
    expect(entitlement.isPremium).toBe(true);
    const [confirmed] = await db.select().from(payments).where(eq(payments.id, request.paymentId)).limit(1);
    expect(confirmed?.status).toBe("success");
    expect(confirmed?.paidAt).toBeTruthy();
  });
});
