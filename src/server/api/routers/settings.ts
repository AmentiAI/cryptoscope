import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import { users, twitterAccounts, syncJobs } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { inngest } from "@/lib/inngest/jobs";
import { nanoid } from "nanoid";

export const settingsRouter = createTRPCRouter({
  // ── User profile ──────────────────────────────────────────────────────────
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.userId));
    return user ?? null;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().max(255).optional(),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [updated] = await db
        .update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.id, ctx.userId))
        .returning();
      return updated;
    }),

  // ── Twitter accounts ──────────────────────────────────────────────────────
  getConnectedAccounts: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        id: twitterAccounts.id,
        username: twitterAccounts.username,
        name: twitterAccounts.displayName,
        profileImageUrl: twitterAccounts.avatarUrl,
        followerCount: twitterAccounts.followerCount,
        followingCount: twitterAccounts.followingCount,
        tweetCount: twitterAccounts.tweetCount,
        verified: twitterAccounts.isActive,
        lastSyncedAt: twitterAccounts.lastSyncedAt,
        createdAt: twitterAccounts.createdAt,
      })
      .from(twitterAccounts)
      .where(eq(twitterAccounts.userId, ctx.userId));
  }),

  disconnectTwitter: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .delete(twitterAccounts)
        .where(
          and(
            eq(twitterAccounts.id, input.accountId),
            eq(twitterAccounts.userId, ctx.userId)
          )
        );
      return { success: true };
    }),

  triggerSync: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [account] = await db
        .select()
        .from(twitterAccounts)
        .where(
          and(
            eq(twitterAccounts.id, input.accountId),
            eq(twitterAccounts.userId, ctx.userId)
          )
        );

      if (!account) throw new Error("Account not found");

      const jobId = nanoid();
      await db.insert(syncJobs).values({
        id: jobId,
        accountId: input.accountId,
        jobType: "full_sync",
        status: "pending",
      });

      try {
        await inngest.send({
          name: "twitter/sync.account",
          data: { accountId: input.accountId, userId: ctx.userId, jobId },
        });
      } catch {}

      return { jobId };
    }),

  getSyncHistory: protectedProcedure
    .input(z.object({ accountId: z.string().optional(), limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      const conditions = input.accountId
        ? [eq(syncJobs.accountId, input.accountId)]
        : [];

      return db
        .select()
        .from(syncJobs)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(syncJobs.createdAt))
        .limit(input.limit);
    }),

  // ── Notification preferences (stored as simple key-value in memory for now) ──
  getNotificationPrefs: protectedProcedure.query(async ({ ctx }) => {
    // In production: add a preferences table or JSONB column
    return {
      emailOnFollowerMilestone: true,
      emailOnViralTweet: true,
      emailOnNegativeSentiment: true,
      emailOnCompetitorSpike: false,
      emailWeeklyReport: true,
      emailMonthlyReport: true,
      discordWebhookUrl: null as string | null,
      telegramChatId: null as string | null,
    };
  }),

  updateNotificationPrefs: protectedProcedure
    .input(
      z.object({
        emailOnFollowerMilestone: z.boolean().optional(),
        emailOnViralTweet: z.boolean().optional(),
        emailOnNegativeSentiment: z.boolean().optional(),
        emailOnCompetitorSpike: z.boolean().optional(),
        emailWeeklyReport: z.boolean().optional(),
        emailMonthlyReport: z.boolean().optional(),
        discordWebhookUrl: z.string().url().optional().nullable(),
        telegramChatId: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: persist to DB when preferences table is added
      return { success: true };
    }),

  // ── API key management ────────────────────────────────────────────────────
  getApiKey: protectedProcedure.query(async ({ ctx }) => {
    // API keys would be stored in a dedicated api_keys table in production
    // For now return null — user can generate one
    return { apiKey: null as string | null, createdAt: null as string | null };
  }),

  regenerateApiKey: protectedProcedure.mutation(async ({ ctx }) => {
    const apiKey = `cs_live_${generateRandomString(32)}`;
    // TODO: persist to api_keys table
    return { apiKey };
  }),

  revokeApiKey: protectedProcedure.mutation(async ({ ctx }) => {
    // TODO: delete from api_keys table
    return { success: true };
  }),
});

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
