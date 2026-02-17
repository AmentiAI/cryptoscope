// ─────────────────────────────────────────────
// tRPC billing router — Stripe + Crypto payments
// ─────────────────────────────────────────────

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import { subscriptions, cryptoPayments, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  createStripeCheckout,
  createBillingPortal,
  createCryptoInvoice,
  getEstimatedPrice,
  PLANS,
} from "@/lib/payments";

export const billingRouter = createTRPCRouter({
  // ─── Get current subscription ────────────

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.userId))
      .orderBy(desc(subscriptions.currentPeriodEnd))
      .limit(1);

    return sub ?? null;
  }),

  // ─── Get payment history ─────────────────

  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    const payments = await db
      .select()
      .from(cryptoPayments)
      .where(eq(cryptoPayments.userId, ctx.userId))
      .orderBy(desc(cryptoPayments.createdAt))
      .limit(20);

    return payments;
  }),

  // ─── Get plan pricing (with estimates) ───

  getPricing: protectedProcedure
    .input(
      z.object({
        currency: z.enum(["BTC", "SOL"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const pricing: Record<
        string,
        {
          usdMonthly: number;
          usdAnnual: number;
          cryptoMonthly?: { amount: number; rate: number };
          cryptoAnnual?: { amount: number; rate: number };
        }
      > = {};

      for (const [plan, config] of Object.entries(PLANS)) {
        const entry: (typeof pricing)[string] = {
          usdMonthly: config.priceUsd.monthly / 100,
          usdAnnual: config.priceUsd.annual / 100,
        };

        if (input.currency) {
          const monthlyEst = await getEstimatedPrice(
            config.priceUsd.monthly / 100,
            input.currency
          );
          const annualEst = await getEstimatedPrice(
            config.priceUsd.annual / 100,
            input.currency
          );
          entry.cryptoMonthly = monthlyEst;
          entry.cryptoAnnual = annualEst;
        }

        pricing[plan] = entry;
      }

      return pricing;
    }),

  // ─── Create Stripe checkout ───────────────

  createStripeCheckout: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["pro", "agency"]),
        billingPeriod: z.enum(["monthly", "annual"]).default("monthly"),
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await createStripeCheckout({
        userId: ctx.userId,
        email: ctx.user.emailAddresses[0]?.emailAddress ?? "",
        plan: input.plan,
        billingPeriod: input.billingPeriod,
        returnUrl: input.returnUrl,
      });

      return { url: session.url };
    }),

  // ─── Create Stripe billing portal ────────

  createBillingPortal: protectedProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const session = await createBillingPortal(ctx.userId, input.returnUrl);
      return { url: session.url };
    }),

  // ─── Create crypto invoice (BTC or SOL) ──

  createCryptoInvoice: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["pro", "agency"]),
        billingPeriod: z.enum(["monthly", "annual"]).default("monthly"),
        currency: z.enum(["bitcoin", "solana"]),
        returnUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already has an active subscription
      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.userId))
        .orderBy(desc(subscriptions.currentPeriodEnd))
        .limit(1);

      if (existingSub?.status === "active") {
        const now = new Date();
        if (existingSub.currentPeriodEnd > now) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `You already have an active ${existingSub.plan} subscription until ${existingSub.currentPeriodEnd.toLocaleDateString()}. Cancel it first or wait until expiry.`,
          });
        }
      }

      const invoice = await createCryptoInvoice({
        userId: ctx.userId,
        email: ctx.user.emailAddresses[0]?.emailAddress ?? "",
        plan: input.plan,
        billingPeriod: input.billingPeriod,
        currency: input.currency,
        returnUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
      });

      return invoice;
    }),

  // ─── Check pending crypto payment status ─

  getCryptoPaymentStatus: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [payment] = await db
        .select()
        .from(cryptoPayments)
        .where(eq(cryptoPayments.nowpaymentsInvoiceId, input.invoiceId))
        .limit(1);

      if (!payment || payment.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        status: payment.status,
        plan: payment.plan,
        currency: payment.currency,
        cryptoAmount: payment.cryptoAmount,
        periodEnd: payment.periodEnd,
        confirmedAt: payment.confirmedAt,
      };
    }),

  // ─── Aliases used by billing page UI ─────

  /** Unified checkout: Stripe card */
  createCheckout: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["pro", "agency"]),
        billingPeriod: z.enum(["monthly", "annual"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.cryptoscope.ai";
      const session = await createStripeCheckout({
        userId: ctx.userId,
        email: (ctx.user as any).emailAddresses?.[0]?.emailAddress ?? "",
        plan: input.plan,
        billingPeriod: input.billingPeriod,
        returnUrl: `${baseUrl}/dashboard/billing?success=1`,
      });
      return { url: session.url };
    }),

  /** Unified checkout: crypto (BTC or SOL) */
  createCryptoPayment: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["pro", "agency"]),
        billingPeriod: z.enum(["monthly", "annual"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.cryptoscope.ai";
      const invoice = await createCryptoInvoice({
        userId: ctx.userId,
        email: (ctx.user as any).emailAddresses?.[0]?.emailAddress ?? "",
        plan: input.plan,
        billingPeriod: input.billingPeriod,
        currency: "bitcoin",
        returnUrl: `${baseUrl}/dashboard/billing?success=1`,
        cancelUrl: `${baseUrl}/dashboard/billing`,
      });
      return { invoiceUrl: invoice.statusUrl };
    }),

  /** Open Stripe billing portal */
  openPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.cryptoscope.ai";
    const session = await createBillingPortal(ctx.userId, `${baseUrl}/dashboard/billing`);
    return { url: session.url };
  }),

  /** Stripe invoice history */
  getInvoices: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stripe = (await import("stripe")).default;
      const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY ?? "");

      const [user] = await db
        .select({ stripeCustomerId: users.stripeCustomerId })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);

      if (!user?.stripeCustomerId) return [];

      const invoices = await stripeClient.invoices.list({
        customer: user.stripeCustomerId,
        limit: 20,
      });

      return invoices.data;
    } catch {
      return [];
    }
  }),

  /** Crypto payment history */
  getCryptoPayments: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(cryptoPayments)
      .where(eq(cryptoPayments.userId, ctx.userId))
      .orderBy(desc(cryptoPayments.createdAt))
      .limit(20);
  }),
});
