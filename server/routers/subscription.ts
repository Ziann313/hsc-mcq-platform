import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createPaymentIntent, cancelSubscriptionAutoRenew, createManualPaymentRequest, extendPremiumByAdmin, getAdminSubscriptionUsers, getPaymentHistory, getPendingManualPayments, getSubscriptionPlans, getSubscriptionStatus, getUsageSummary, grantPremiumByAdmin, reviewManualPayment, revokePremiumByAdmin } from "../subscriptionDb";
import { createSslCommerzCheckout, sslCommerzConfigured } from "../sslCommerz";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { PAYMENT_PROOF_MAX_BYTES, PAYMENT_PROOF_MIME_TYPES } from "../paymentProof";

export const subscriptionRouter = router({
  plans: publicProcedure.query(() => getSubscriptionPlans()),
  status: protectedProcedure.query(({ ctx }) => getSubscriptionStatus(ctx.user.id)),
  usage: protectedProcedure.query(({ ctx }) => getUsageSummary(ctx.user.id)),
  paymentHistory: protectedProcedure.query(({ ctx }) => getPaymentHistory(ctx.user.id)),
  cancelAutoRenew: protectedProcedure.mutation(({ ctx }) => cancelSubscriptionAutoRenew(ctx.user.id)),
  requestManualPayment: protectedProcedure.input(z.object({ planId: z.number().int().positive(), method: z.enum(["bkash_manual", "nagad_manual"]), senderPhone: z.string().regex(/^01\d{9}$/), transactionReference: z.string().trim().min(4).max(100), proof: z.object({ originalFilename: z.string().trim().min(1).max(180), contentType: z.enum(PAYMENT_PROOF_MIME_TYPES), dataUrl: z.string().max(Math.ceil(PAYMENT_PROOF_MAX_BYTES * 1.4)) }).optional() })).mutation(async ({ ctx, input }) => {
    const request = await createManualPaymentRequest({ userId: ctx.user.id, ...input });
    if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "The selected subscription plan is unavailable" });
    return request;
  }),
  pendingManualPayments: adminProcedure.query(() => getPendingManualPayments()),
  reviewManualPayment: adminProcedure.input(z.object({ paymentId: z.number().int().positive(), approved: z.boolean(), reviewerNote: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const reviewed = await reviewManualPayment({ ...input, reviewerUserId: ctx.user.id });
    if (!reviewed) throw new TRPCError({ code: "NOT_FOUND", message: "A pending manual payment request was not found" });
    return { reviewed: true } as const;
  }),
  adminSubscriptionUsers: adminProcedure.input(z.object({ search: z.string().trim().max(160).optional(), status: z.enum(["trial", "active", "expired", "cancelled"]).optional(), limit: z.number().int().min(1).max(100).default(30), offset: z.number().int().min(0).default(0) })).query(({ input }) => getAdminSubscriptionUsers(input)),
  grantPremium: adminProcedure.input(z.object({ userId: z.number().int().positive(), planId: z.number().int().positive().optional(), durationDays: z.number().int().min(1).max(3650).default(30), amountBDT: z.number().min(0).max(1_000_000).default(0), reason: z.string().trim().min(5).max(500) })).mutation(async ({ ctx, input }) => {
    const granted = await grantPremiumByAdmin({ ...input, actorUserId: ctx.user.id, actorName: ctx.user.name });
    if (!granted) throw new TRPCError({ code: "NOT_FOUND", message: "The learner or selected plan was not found" });
    return granted;
  }),
  revokePremium: adminProcedure.input(z.object({ userId: z.number().int().positive(), reason: z.string().trim().min(5).max(500) })).mutation(async ({ ctx, input }) => {
    const revoked = await revokePremiumByAdmin({ ...input, actorUserId: ctx.user.id });
    if (!revoked) throw new TRPCError({ code: "NOT_FOUND", message: "No active Premium entitlement was found for this learner" });
    return { revoked: true } as const;
  }),
  extendPremium: adminProcedure.input(z.object({ userId: z.number().int().positive(), additionalDays: z.number().int().min(1).max(365).default(30), reason: z.string().trim().min(5).max(500) })).mutation(async ({ ctx, input }) => {
    const extended = await extendPremiumByAdmin({ ...input, actorUserId: ctx.user.id });
    if (!extended) throw new TRPCError({ code: "NOT_FOUND", message: "No active Premium entitlement was found for this learner" });
    return extended;
  }),
  initiateCheckout: protectedProcedure.input(z.object({ planId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    if (!sslCommerzConfigured()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Secure payment checkout is not configured yet. Please contact MCQ GURU support." });
    const intent = await createPaymentIntent(ctx.user.id, input.planId);
    if (!intent) throw new TRPCError({ code: "NOT_FOUND", message: "The selected subscription plan is unavailable" });
    const host = ctx.req.headers.host;
    if (!host) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A trusted application origin is required for checkout" });
    const callbackBaseUrl = `${ctx.req.protocol}://${host}`;
    try {
      const checkout = await createSslCommerzCheckout({ transactionId: intent.internalTransactionId, amountBDT: String(intent.plan.priceBDT), customerName: ctx.user.name || "MCQ GURU Student", customerEmail: ctx.user.email || "student@mcqguru.app", callbackBaseUrl });
      return { ...checkout, internalTransactionId: intent.internalTransactionId };
    } catch (error) {
      throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "Unable to start secure checkout" });
    }
  }),
});
