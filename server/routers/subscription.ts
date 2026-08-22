import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createPaymentIntent, cancelSubscriptionAutoRenew, createManualPaymentRequest, getPaymentHistory, getPendingManualPayments, getSubscriptionPlans, getSubscriptionStatus, getUsageSummary, reviewManualPayment } from "../subscriptionDb";
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
