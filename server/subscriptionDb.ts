import { and, desc, eq, like, lt, or, sql } from "drizzle-orm";
import { auditLogs, paymentProofs, payments, subscriptionMaintenanceSettings, subscriptionPlans, subscriptions, usageLimits, users } from "../drizzle/schema";
import { FREE_USAGE_LIMITS, PREMIUM_FEATURES, TRIAL_DURATION_DAYS, hasFullSubscriptionAccess, subscriptionDaysLeft, usagePeriodKey, type UsageLimitType } from "../shared/subscriptionPolicy";
import { createNotification, getDb } from "./db";
import { storePaymentProof, type PaymentProofInput } from "./paymentProof";

const planSeeds = [
  {
    code: "premium-monthly", name: "Premium Monthly", nameBn: "প্রিমিয়াম মাসিক",
    description: "Unlimited MCQ GURU access for 30 days.", descriptionBn: "৩০ দিনের জন্য MCQ GURU-র সব ফিচারে আনলিমিটেড অ্যাক্সেস।",
    priceBDT: "199.00", durationDays: 30, features: [...PREMIUM_FEATURES],
  },
  {
    code: "premium-yearly", name: "Premium Yearly", nameBn: "প্রিমিয়াম বাৎসরিক",
    description: "Unlimited MCQ GURU access for 365 days.", descriptionBn: "৩৬৫ দিনের জন্য MCQ GURU-র সব ফিচারে আনলিমিটেড অ্যাক্সেস।",
    priceBDT: "999.00", durationDays: 365, features: [...PREMIUM_FEATURES],
  },
] as const;

export type EntitlementStatus = Awaited<ReturnType<typeof getSubscriptionStatus>>;

export async function ensureSubscriptionPlans() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (const plan of planSeeds) {
    const features = [...plan.features] as string[];
    await db.insert(subscriptionPlans).values({ ...plan, features, isActive: true }).onDuplicateKeyUpdate({
      set: { name: plan.name, nameBn: plan.nameBn, description: plan.description, descriptionBn: plan.descriptionBn, priceBDT: plan.priceBDT, durationDays: plan.durationDays, features, isActive: true },
    });
  }
}

export async function ensureSubscriptionForUser(userId: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = (await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1))[0];
  if (existing) return existing;
  const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000);
  try {
    await db.insert(subscriptions).values({ userId, planType: "free", status: "trial", trialStartedAt: now, trialEndsAt, autoRenew: false });
  } catch {
    // Concurrent onboarding or first access may have created the same unique user row.
  }
  const created = (await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1))[0];
  if (!created) throw new Error("Unable to create subscription entitlement");
  return created;
}

async function reconcileSubscription(userId: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  let subscription = await ensureSubscriptionForUser(userId, now);
  if (subscription.status === "trial" && subscription.trialEndsAt <= now) {
    await db.update(subscriptions).set({ status: "expired", planType: "free", planId: null, autoRenew: false }).where(eq(subscriptions.id, subscription.id));
  } else if (subscription.planType === "premium" && subscription.status === "active" && subscription.subscriptionEndsAt && subscription.subscriptionEndsAt <= now) {
    await db.update(subscriptions).set({ status: "expired", planType: "free", planId: null, autoRenew: false }).where(eq(subscriptions.id, subscription.id));
  }
  subscription = (await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1))[0]!;
  return subscription;
}

export async function getSubscriptionStatus(userId: number, now = new Date()) {
  const subscription = await reconcileSubscription(userId, now);
  const fullAccess = hasFullSubscriptionAccess(subscription);
  const activeEnd = subscription.status === "trial" ? subscription.trialEndsAt : subscription.subscriptionEndsAt;
  return {
    subscriptionId: subscription.id,
    planType: subscription.planType,
    status: subscription.status,
    trialEndsAt: subscription.trialEndsAt,
    subscriptionEndsAt: subscription.subscriptionEndsAt,
    autoRenew: subscription.autoRenew,
    isTrial: subscription.status === "trial",
    isPremium: subscription.planType === "premium" && subscription.status === "active",
    isFree: !fullAccess,
    hasFullAccess: fullAccess,
    trialDaysLeft: subscription.status === "trial" ? subscriptionDaysLeft(subscription.trialEndsAt, now) : 0,
    premiumDaysLeft: subscription.planType === "premium" && subscription.status === "active" ? subscriptionDaysLeft(subscription.subscriptionEndsAt, now) : 0,
    activeEndsAt: activeEnd,
    features: fullAccess ? [...PREMIUM_FEATURES] : ["practice_limited", "exam_limited", "tutor_limited", "image_solver_limited", "basic_study_plan", "basic_notebook", "basic_insights", "profile"],
  };
}

export async function getSubscriptionPlans() {
  await ensureSubscriptionPlans();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.priceBDT);
}

export async function getUsageSummary(userId: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const entries = await Promise.all((Object.keys(FREE_USAGE_LIMITS) as UsageLimitType[]).map(async limitType => {
    const periodKey = usagePeriodKey(limitType, now);
    const row = (await db.select().from(usageLimits).where(and(eq(usageLimits.userId, userId), eq(usageLimits.limitType, limitType), eq(usageLimits.periodKey, periodKey))).limit(1))[0];
    return [limitType, { used: row?.usedCount ?? 0, limit: FREE_USAGE_LIMITS[limitType].limit, periodKey }] as const;
  }));
  return Object.fromEntries(entries);
}

export async function reserveSubscriptionUsage(userId: number, limitType: UsageLimitType, amount: number, now = new Date()) {
  if (!Number.isInteger(amount) || amount < 1) throw new Error("Usage reservation amount must be a positive integer");
  const entitlement = await getSubscriptionStatus(userId, now);
  if (entitlement.hasFullAccess) return { allowed: true as const, unlimited: true as const, used: 0, limit: null, periodKey: usagePeriodKey(limitType, now) };
  const limit = FREE_USAGE_LIMITS[limitType].limit;
  const periodKey = usagePeriodKey(limitType, now);
  if (amount > limit) return { allowed: false as const, unlimited: false as const, used: 0, limit, periodKey };
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const tryUpdate = async () => db.update(usageLimits).set({ usedCount: sql`${usageLimits.usedCount} + ${amount}` }).where(and(eq(usageLimits.userId, userId), eq(usageLimits.limitType, limitType), eq(usageLimits.periodKey, periodKey), sql`${usageLimits.usedCount} + ${amount} <= ${limit}`));
  let result = await tryUpdate();
  if (!result[0]?.affectedRows) {
    const existing = (await db.select().from(usageLimits).where(and(eq(usageLimits.userId, userId), eq(usageLimits.limitType, limitType), eq(usageLimits.periodKey, periodKey))).limit(1))[0];
    if (!existing) {
      try { await db.insert(usageLimits).values({ userId, limitType, periodKey, usedCount: amount }); }
      catch { result = await tryUpdate(); }
    }
  }
  const row = (await db.select().from(usageLimits).where(and(eq(usageLimits.userId, userId), eq(usageLimits.limitType, limitType), eq(usageLimits.periodKey, periodKey))).limit(1))[0];
  const allowed = Boolean(row && row.usedCount <= limit);
  return { allowed, unlimited: false as const, used: row?.usedCount ?? 0, limit, periodKey };
}

export async function releaseSubscriptionUsage(userId: number, limitType: UsageLimitType, amount: number, periodKey: string) {
  const db = await getDb();
  if (!db || amount < 1) return;
  await db.update(usageLimits).set({ usedCount: sql`GREATEST(${usageLimits.usedCount} - ${amount}, 0)` }).where(and(eq(usageLimits.userId, userId), eq(usageLimits.limitType, limitType), eq(usageLimits.periodKey, periodKey)));
}

export async function requirePremiumFeature(userId: number) {
  const entitlement = await getSubscriptionStatus(userId);
  return entitlement.hasFullAccess;
}

export async function cancelSubscriptionAutoRenew(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const subscription = await ensureSubscriptionForUser(userId);
  await db.update(subscriptions).set({ autoRenew: false }).where(eq(subscriptions.id, subscription.id));
  return getSubscriptionStatus(userId);
}

export async function getPaymentHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select({ id: payments.id, internalTransactionId: payments.internalTransactionId, gatewayTransactionId: payments.gatewayTransactionId, amountBDT: payments.amountBDT, currency: payments.currency, status: payments.status, paidAt: payments.paidAt, createdAt: payments.createdAt, planName: subscriptionPlans.name, planNameBn: subscriptionPlans.nameBn }).from(payments)
    .innerJoin(subscriptionPlans, eq(payments.planId, subscriptionPlans.id)).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
}

export async function createPaymentIntent(userId: number, planId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const plan = (await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.id, planId), eq(subscriptionPlans.isActive, true))).limit(1))[0];
  if (!plan) return undefined;
  const subscription = await ensureSubscriptionForUser(userId);
  const internalTransactionId = `mcqg_${crypto.randomUUID().replace(/-/g, "").slice(0, 28)}`;
  const result = await db.insert(payments).values({ userId, subscriptionId: subscription.id, planId: plan.id, internalTransactionId, amountBDT: plan.priceBDT, currency: "BDT", gateway: "sslcommerz", status: "pending" });
  return { paymentId: Number(result[0].insertId), internalTransactionId, plan, subscriptionId: subscription.id };
}

export async function createManualPaymentRequest(input: { userId: number; planId: number; method: "bkash_manual" | "nagad_manual"; senderPhone: string; transactionReference: string; proof?: PaymentProofInput }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const plan = (await db.select().from(subscriptionPlans).where(and(eq(subscriptionPlans.id, input.planId), eq(subscriptionPlans.isActive, true))).limit(1))[0];
  if (!plan) return undefined;
  const subscription = await ensureSubscriptionForUser(input.userId);
  const internalTransactionId = `mcqg_manual_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const result = await db.insert(payments).values({
    userId: input.userId,
    subscriptionId: subscription.id,
    planId: plan.id,
    internalTransactionId,
    amountBDT: plan.priceBDT,
    currency: "BDT",
    gateway: input.method,
    status: "pending",
    gatewayPayload: { senderPhone: input.senderPhone, transactionReference: input.transactionReference, submittedAt: new Date().toISOString() },
  });
  const paymentId = Number(result[0].insertId);
  if (input.proof) {
    try {
      const stored = await storePaymentProof(input.userId, input.proof);
      await db.insert(paymentProofs).values({ paymentId, submittedByUserId: input.userId, storageKey: stored.storageKey, contentType: stored.contentType, originalFilename: stored.originalFilename, byteSize: stored.byteSize });
    } catch (error) {
      await db.delete(payments).where(eq(payments.id, paymentId));
      throw error;
    }
  }
  return { paymentId, internalTransactionId, amountBDT: plan.priceBDT, planName: plan.name, planNameBn: plan.nameBn, proofUploaded: Boolean(input.proof) };
}

export async function getPendingManualPayments() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const pending = await db.select({ id: payments.id, userId: payments.userId, gateway: payments.gateway, internalTransactionId: payments.internalTransactionId, amountBDT: payments.amountBDT, createdAt: payments.createdAt, payload: payments.gatewayPayload, planName: subscriptionPlans.name, planNameBn: subscriptionPlans.nameBn, learnerName: users.name, learnerEmail: users.email, proofId: paymentProofs.id, proofStorageKey: paymentProofs.storageKey, proofContentType: paymentProofs.contentType, proofOriginalFilename: paymentProofs.originalFilename, proofByteSize: paymentProofs.byteSize })
    .from(payments).innerJoin(subscriptionPlans, eq(payments.planId, subscriptionPlans.id)).innerJoin(users, eq(payments.userId, users.id)).leftJoin(paymentProofs, eq(paymentProofs.paymentId, payments.id))
    .where(and(eq(payments.status, "pending"), sql`${payments.gateway} IN ('bkash_manual', 'nagad_manual')`)).orderBy(desc(payments.createdAt));
  return pending.map(({ proofStorageKey, ...payment }) => ({ ...payment, proofUrl: proofStorageKey ? `/manus-storage/${proofStorageKey}` : null }));
}

export async function reviewManualPayment(input: { paymentId: number; approved: boolean; reviewerNote?: string; reviewerUserId?: number; now?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = input.now ?? new Date();
  const row = (await db.select({ payment: payments, plan: subscriptionPlans }).from(payments).innerJoin(subscriptionPlans, eq(payments.planId, subscriptionPlans.id)).where(and(eq(payments.id, input.paymentId), eq(payments.status, "pending"), sql`${payments.gateway} IN ('bkash_manual', 'nagad_manual')`)).limit(1))[0];
  if (!row) return false;
  const priorPayload = row.payment.gatewayPayload && typeof row.payment.gatewayPayload === "object" && !Array.isArray(row.payment.gatewayPayload) ? row.payment.gatewayPayload as Record<string, unknown> : {};
  if (!input.approved) {
    const rejected = await db.update(payments).set({ status: "failed", gatewayPayload: { ...priorPayload, reviewerNote: input.reviewerNote ?? null, reviewedAt: now.toISOString() } }).where(and(eq(payments.id, input.paymentId), eq(payments.status, "pending")));
    if (!rejected[0]?.affectedRows) return false;
    if (input.reviewerUserId) await db.insert(auditLogs).values({ actorUserId: input.reviewerUserId, action: "payment.manual_rejected", entityType: "payment", entityId: String(input.paymentId), metadata: { reviewerNote: input.reviewerNote ?? null } });
    await createNotification({ userId: row.payment.userId, actorUserId: input.reviewerUserId, type: "account", priority: "critical", title: "Manual payment request needs attention", body: "Your bKash/Nagad payment request could not be verified. Review the transaction ID and contact support if you believe this is incorrect.", actionUrl: "/profile" });
    return true;
  }
  const subscription = await ensureSubscriptionForUser(row.payment.userId, now);
  const currentEnd = subscription.subscriptionEndsAt && subscription.subscriptionEndsAt > now ? subscription.subscriptionEndsAt : now;
  const nextEnd = new Date(currentEnd.getTime() + row.plan.durationDays * 86_400_000);
  const updated = await db.update(payments).set({ status: "success", paidAt: now, gatewayPayload: { ...priorPayload, reviewerNote: input.reviewerNote ?? null, reviewedAt: now.toISOString() } }).where(and(eq(payments.id, input.paymentId), eq(payments.status, "pending")));
  if (!updated[0]?.affectedRows) return false;
  await db.update(subscriptions).set({ planId: row.plan.id, planType: "premium", status: "active", subscriptionStartedAt: subscription.subscriptionStartedAt ?? now, subscriptionEndsAt: nextEnd, autoRenew: false }).where(eq(subscriptions.id, subscription.id));
  if (input.reviewerUserId) await db.insert(auditLogs).values({ actorUserId: input.reviewerUserId, action: "payment.manual_approved", entityType: "payment", entityId: String(input.paymentId), metadata: { planCode: row.plan.code, reviewerNote: input.reviewerNote ?? null, subscriptionEndsAt: nextEnd.toISOString() } });
  await createNotification({ userId: row.payment.userId, actorUserId: input.reviewerUserId, type: "account", priority: "critical", title: "Premium payment approved", body: `Your manual bKash/Nagad payment has been verified. MCQ GURU Premium is active until ${nextEnd.toLocaleDateString("en-GB")}.`, actionUrl: "/profile" });
  return true;
}

type AdminSubscriptionSearch = { search?: string; status?: "trial" | "active" | "expired" | "cancelled"; limit: number; offset: number };

export async function getAdminSubscriptionUsers(input: AdminSubscriptionSearch) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const search = input.search?.trim();
  const conditions = search ? [or(like(users.name, `%${search}%`), like(users.email, `%${search}%`))] : [];
  if (input.status) conditions.push(eq(subscriptions.status, input.status));
  const rows = await db.select({ userId: users.id, userName: users.name, userEmail: users.email, subscriptionId: subscriptions.id, planId: subscriptions.planId, planType: subscriptions.planType, status: subscriptions.status, trialEndsAt: subscriptions.trialEndsAt, subscriptionEndsAt: subscriptions.subscriptionEndsAt, updatedAt: subscriptions.updatedAt, planName: subscriptionPlans.name, planNameBn: subscriptionPlans.nameBn })
    .from(users)
    .leftJoin(subscriptions, eq(subscriptions.userId, users.id))
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(subscriptions.updatedAt), desc(users.createdAt))
    .limit(input.limit)
    .offset(input.offset);
  return rows.map(row => ({ ...row, planType: row.planType ?? "free", status: row.status ?? "uninitialized" as const }));
}

async function getGrantPlan(planId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const where = planId ? and(eq(subscriptionPlans.id, planId), eq(subscriptionPlans.isActive, true)) : and(eq(subscriptionPlans.code, "premium-monthly"), eq(subscriptionPlans.isActive, true));
  return (await db.select().from(subscriptionPlans).where(where).limit(1))[0];
}

export async function grantPremiumByAdmin(input: { actorUserId: number; actorName?: string | null; userId: number; planId?: number; durationDays: number; amountBDT: number; reason: string; now?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = input.now ?? new Date();
  const learner = (await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, input.userId)).limit(1))[0];
  const plan = await getGrantPlan(input.planId);
  if (!learner || !plan) return undefined;
  const subscription = await ensureSubscriptionForUser(input.userId, now);
  const base = subscription.planType === "premium" && subscription.status === "active" && subscription.subscriptionEndsAt && subscription.subscriptionEndsAt > now ? subscription.subscriptionEndsAt : now;
  const subscriptionEndsAt = new Date(base.getTime() + input.durationDays * 86_400_000);
  const subscriptionStartedAt = subscription.planType === "premium" && subscription.status === "active" ? subscription.subscriptionStartedAt ?? now : now;
  await db.update(subscriptions).set({ planId: plan.id, planType: "premium", status: "active", subscriptionStartedAt, subscriptionEndsAt, autoRenew: false }).where(eq(subscriptions.id, subscription.id));
  const transactionId = `mcqg_grant_${crypto.randomUUID().replace(/-/g, "").slice(0, 22)}`;
  const payment = await db.insert(payments).values({ userId: input.userId, subscriptionId: subscription.id, planId: plan.id, internalTransactionId: transactionId, amountBDT: input.amountBDT.toFixed(2), currency: "BDT", gateway: "manual_grant", status: "success", paidAt: now, gatewayPayload: { reason: input.reason, grantedByUserId: input.actorUserId, grantedByName: input.actorName ?? null, durationDays: input.durationDays, baseEndsAt: base.toISOString() } });
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, action: "subscription.manual_grant", entityType: "subscription", entityId: String(subscription.id), metadata: { targetUserId: input.userId, planCode: plan.code, durationDays: input.durationDays, amountBDT: input.amountBDT, reason: input.reason, transactionId } });
  await createNotification({ userId: input.userId, actorUserId: input.actorUserId, type: "account", priority: "critical", title: "Premium access granted", body: `MCQ GURU Premium has been granted until ${subscriptionEndsAt.toLocaleDateString("en-GB")}.`, actionUrl: "/profile" });
  return { subscriptionId: subscription.id, paymentId: Number(payment[0].insertId), subscriptionEndsAt, learnerName: learner.name, planId: plan.id };
}

export async function revokePremiumByAdmin(input: { actorUserId: number; userId: number; reason: string; now?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = input.now ?? new Date();
  const subscription = (await db.select().from(subscriptions).where(eq(subscriptions.userId, input.userId)).limit(1))[0];
  if (!subscription || subscription.planType !== "premium" || subscription.status !== "active") return false;
  const changed = await db.update(subscriptions).set({ planId: null, planType: "free", status: "expired", subscriptionEndsAt: now, autoRenew: false }).where(and(eq(subscriptions.id, subscription.id), eq(subscriptions.planType, "premium"), eq(subscriptions.status, "active")));
  if (!changed[0]?.affectedRows) return false;
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, action: "subscription.manual_revoke", entityType: "subscription", entityId: String(subscription.id), metadata: { targetUserId: input.userId, previousEndsAt: subscription.subscriptionEndsAt?.toISOString() ?? null, reason: input.reason } });
  await createNotification({ userId: input.userId, actorUserId: input.actorUserId, type: "account", priority: "critical", title: "Premium access updated", body: "Your MCQ GURU Premium access has been ended by an administrator. Review your account or contact support if you need help.", actionUrl: "/profile" });
  return true;
}

export async function extendPremiumByAdmin(input: { actorUserId: number; userId: number; additionalDays: number; reason: string; now?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const now = input.now ?? new Date();
  const subscription = (await db.select().from(subscriptions).where(eq(subscriptions.userId, input.userId)).limit(1))[0];
  if (!subscription || subscription.planType !== "premium" || subscription.status !== "active") return undefined;
  const base = subscription.subscriptionEndsAt && subscription.subscriptionEndsAt > now ? subscription.subscriptionEndsAt : now;
  const subscriptionEndsAt = new Date(base.getTime() + input.additionalDays * 86_400_000);
  const changed = await db.update(subscriptions).set({ subscriptionEndsAt, autoRenew: false }).where(and(eq(subscriptions.id, subscription.id), eq(subscriptions.planType, "premium"), eq(subscriptions.status, "active")));
  if (!changed[0]?.affectedRows) return undefined;
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, action: "subscription.manual_extend", entityType: "subscription", entityId: String(subscription.id), metadata: { targetUserId: input.userId, additionalDays: input.additionalDays, priorEndsAt: base.toISOString(), reason: input.reason } });
  await createNotification({ userId: input.userId, actorUserId: input.actorUserId, type: "account", priority: "critical", title: "Premium access extended", body: `Your MCQ GURU Premium access has been extended until ${subscriptionEndsAt.toLocaleDateString("en-GB")}.`, actionUrl: "/profile" });
  return { subscriptionEndsAt };
}

export async function runSubscriptionMaintenance(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const expiredTrials = await db.update(subscriptions).set({ status: "expired", planType: "free", planId: null, autoRenew: false }).where(and(eq(subscriptions.status, "trial"), lt(subscriptions.trialEndsAt, now)));
  const expiredPremium = await db.update(subscriptions).set({ status: "expired", planType: "free", planId: null, autoRenew: false }).where(and(eq(subscriptions.status, "active"), eq(subscriptions.planType, "premium"), lt(subscriptions.subscriptionEndsAt, now)));
  const cutoff = new Date(now.getTime() - 40 * 86_400_000);
  const cleanedUsage = await db.delete(usageLimits).where(lt(usageLimits.createdAt, cutoff));
  return { expiredTrials: expiredTrials[0]?.affectedRows ?? 0, expiredPremium: expiredPremium[0]?.affectedRows ?? 0, cleanedUsage: cleanedUsage[0]?.affectedRows ?? 0 };
}

export async function setSubscriptionMaintenanceTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = (await db.select().from(subscriptionMaintenanceSettings).limit(1))[0];
  if (existing) await db.update(subscriptionMaintenanceSettings).set({ scheduleCronTaskUid: taskUid }).where(eq(subscriptionMaintenanceSettings.id, existing.id));
  else await db.insert(subscriptionMaintenanceSettings).values({ scheduleCronTaskUid: taskUid });
}

export async function isSubscriptionMaintenanceTask(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = (await db.select().from(subscriptionMaintenanceSettings).where(eq(subscriptionMaintenanceSettings.scheduleCronTaskUid, taskUid)).limit(1))[0];
  return Boolean(row);
}
