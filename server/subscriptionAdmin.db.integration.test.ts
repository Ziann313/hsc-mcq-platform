import { afterEach, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { auditLogs, notifications, payments, subscriptions, users } from "../drizzle/schema";
import { getDb } from "./db";
import { ensureSubscriptionPlans, extendPremiumByAdmin, getSubscriptionStatus, grantPremiumByAdmin, revokePremiumByAdmin } from "./subscriptionDb";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

describe.skipIf(!enabled)("administrator subscription actions", () => {
  it("grants, extends, and revokes Premium with separate manual-grant payment, audit, and learner notification records", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    await ensureSubscriptionPlans();
    const stamp = Date.now();
    const adminResult = await db.insert(users).values({ openId: `mcq-guru-admin-grant-${stamp}`, name: "Subscription administrator", role: "admin" });
    const learnerResult = await db.insert(users).values({ openId: `mcq-guru-grant-learner-${stamp}`, name: "Grant learner", role: "student" });
    const adminId = Number(adminResult[0].insertId);
    const learnerId = Number(learnerResult[0].insertId);
    cleanup = async () => {
      const ownedSubscriptions = await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.userId, learnerId));
      const ids = ownedSubscriptions.map(row => row.id);
      await db.delete(notifications).where(inArray(notifications.userId, [adminId, learnerId]));
      await db.delete(auditLogs).where(eq(auditLogs.actorUserId, adminId));
      if (ids.length) await db.delete(payments).where(inArray(payments.subscriptionId, ids));
      await db.delete(subscriptions).where(eq(subscriptions.userId, learnerId));
      await db.delete(users).where(inArray(users.id, [adminId, learnerId]));
    };

    const now = new Date("2026-08-23T00:00:00.000Z");
    const granted = await grantPremiumByAdmin({ actorUserId: adminId, actorName: "Subscription administrator", userId: learnerId, durationDays: 30, amountBDT: 0, reason: "Verified school partnership", now });
    expect(granted).toBeTruthy();
    const active = await getSubscriptionStatus(learnerId, now);
    expect(active.isPremium).toBe(true);
    expect(active.premiumDaysLeft).toBe(30);
    const grantPayment = await db.select().from(payments).where(eq(payments.id, granted!.paymentId)).limit(1);
    expect(grantPayment[0]).toMatchObject({ gateway: "manual_grant", status: "success", amountBDT: "0.00" });

    const extended = await extendPremiumByAdmin({ actorUserId: adminId, userId: learnerId, additionalDays: 15, reason: "Approved programme extension", now });
    expect(extended?.subscriptionEndsAt.getTime()).toBe(new Date("2026-10-07T00:00:00.000Z").getTime());
    await expect(revokePremiumByAdmin({ actorUserId: adminId, userId: learnerId, reason: "Partnership period completed", now })).resolves.toBe(true);
    const revoked = await getSubscriptionStatus(learnerId, now);
    expect(revoked.isPremium).toBe(false);
    const events = await db.select().from(auditLogs).where(and(eq(auditLogs.actorUserId, adminId), eq(auditLogs.entityType, "subscription")));
    expect(events.map(event => event.action)).toEqual(expect.arrayContaining(["subscription.manual_grant", "subscription.manual_extend", "subscription.manual_revoke"]));
    const learnerNotifications = await db.select().from(notifications).where(eq(notifications.userId, learnerId));
    expect(learnerNotifications.filter(item => item.priority === "critical")).toHaveLength(3);
  });
});
