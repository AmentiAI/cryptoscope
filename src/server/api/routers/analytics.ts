import { nanoid } from "nanoid";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import {
  twitterAccounts,
  twitterSnapshots,
  tweets,
  mentions,
  topFollowers,
  hashtagAnalytics,
  competitors,
} from "@/lib/db/schema";
import { and, eq, gte, desc, sql, count } from "drizzle-orm";
import { analyzeBestPostingTimes } from "@/lib/twitter/client";
import { inngest } from "@/lib/inngest/jobs";
import { subDays } from "date-fns";

export const analyticsRouter = createTRPCRouter({
  // ─── Get all connected Twitter accounts ───
  getAccounts: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(twitterAccounts)
      .where(eq(twitterAccounts.userId, ctx.userId));
  }),

  // ─── Get follower growth chart data ───
  getFollowerGrowth: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      const since = subDays(new Date(), input.days);

      return db
        .select({
          date: twitterSnapshots.date,
          followerCount: twitterSnapshots.followerCount,
          followerDelta: twitterSnapshots.followerDelta,
        })
        .from(twitterSnapshots)
        .where(
          and(
            eq(twitterSnapshots.accountId, input.accountId),
            gte(twitterSnapshots.date, since)
          )
        )
        .orderBy(twitterSnapshots.date);
    }),

  // ─── Get engagement chart data ───
  getEngagement: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      const since = subDays(new Date(), input.days);

      return db
        .select({
          date: twitterSnapshots.date,
          engagementRate: twitterSnapshots.engagementRate,
          avgLikes: twitterSnapshots.avgLikes,
          avgRetweets: twitterSnapshots.avgRetweets,
          avgReplies: twitterSnapshots.avgReplies,
          avgImpressions: twitterSnapshots.avgImpressions,
        })
        .from(twitterSnapshots)
        .where(
          and(
            eq(twitterSnapshots.accountId, input.accountId),
            gte(twitterSnapshots.date, since)
          )
        )
        .orderBy(twitterSnapshots.date);
    }),

  // ─── Get top performing tweets ───
  getTopTweets: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(30),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      const since = subDays(new Date(), input.days);

      return db
        .select()
        .from(tweets)
        .where(
          and(
            eq(tweets.accountId, input.accountId),
            gte(tweets.publishedAt, since)
          )
        )
        .orderBy(desc(tweets.engagementScore))
        .limit(input.limit);
    }),

  // ─── Get best posting times ───
  getBestPostingTimes: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      const since = subDays(new Date(), 90);

      const recentTweets = await db
        .select({
          publishedAt: tweets.publishedAt,
          engagementScore: tweets.engagementScore,
        })
        .from(tweets)
        .where(
          and(
            eq(tweets.accountId, input.accountId),
            gte(tweets.publishedAt, since)
          )
        );

      return analyzeBestPostingTimes(recentTweets);
    }),

  // ─── Get mentions + sentiment ───
  getMentions: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(7),
        sentiment: z.enum(["positive", "negative", "neutral"]).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      const since = subDays(new Date(), input.days);

      const conditions = [
        eq(mentions.accountId, input.accountId),
        gte(mentions.publishedAt, since),
      ];

      if (input.sentiment) {
        conditions.push(eq(mentions.sentiment, input.sentiment));
      }

      return db
        .select()
        .from(mentions)
        .where(and(...conditions))
        .orderBy(desc(mentions.publishedAt))
        .limit(input.limit);
    }),

  // ─── Sentiment overview ───
  getSentimentOverview: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(7),
      })
    )
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      const since = subDays(new Date(), input.days);

      const result = await db
        .select({
          sentiment: mentions.sentiment,
          count: sql<number>`count(*)`,
        })
        .from(mentions)
        .where(
          and(
            eq(mentions.accountId, input.accountId),
            gte(mentions.publishedAt, since)
          )
        )
        .groupBy(mentions.sentiment);

      return result;
    }),

  // ─── Get top followers/superfans ───
  getTopFollowers: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      return db
        .select()
        .from(topFollowers)
        .where(eq(topFollowers.accountId, input.accountId))
        .orderBy(desc(topFollowers.engagementScore))
        .limit(input.limit);
    }),

  // ─── Get hashtag performance ───
  getHashtagPerformance: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        period: z.enum(["7d", "30d", "90d"]).default("30d"),
      })
    )
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      return db
        .select()
        .from(hashtagAnalytics)
        .where(
          and(
            eq(hashtagAnalytics.accountId, input.accountId),
            eq(hashtagAnalytics.period, input.period)
          )
        )
        .orderBy(desc(hashtagAnalytics.avgEngagement))
        .limit(20);
    }),

  // ─── Dashboard summary stats ───
  getDashboardStats: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      const [account] = await db
        .select()
        .from(twitterAccounts)
        .where(eq(twitterAccounts.id, input.accountId))
        .limit(1);

      const since7d = subDays(new Date(), 7);
      const since30d = subDays(new Date(), 30);

      // Get latest snapshot
      const [latestSnapshot] = await db
        .select()
        .from(twitterSnapshots)
        .where(eq(twitterSnapshots.accountId, input.accountId))
        .orderBy(desc(twitterSnapshots.date))
        .limit(1);

      // 7-day tweet count
      const [tweetCount7d] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tweets)
        .where(
          and(
            eq(tweets.accountId, input.accountId),
            gte(tweets.publishedAt, since7d)
          )
        );

      // 7-day mention count
      const [mentionCount7d] = await db
        .select({ count: sql<number>`count(*)` })
        .from(mentions)
        .where(
          and(
            eq(mentions.accountId, input.accountId),
            gte(mentions.publishedAt, since7d)
          )
        );

      return {
        account,
        latestSnapshot,
        tweetCount7d: tweetCount7d?.count ?? 0,
        mentionCount7d: mentionCount7d?.count ?? 0,
      };
    }),

  // ─── Trigger manual sync ───
  triggerSync: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      await inngest.send({
        name: "account/sync.requested",
        data: { accountId: input.accountId },
      });

      return { success: true };
    }),

  // ─── Competitors ───────────────────────────────────────────────────────────
  getCompetitors: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);
      return db
        .select()
        .from(competitors)
        .where(
          and(eq(competitors.userId, input.accountId), eq(competitors.userId, ctx.userId))
        )
        .orderBy(desc(competitors.followerCount));
    }),

  addCompetitor: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        twitterHandle: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      // Check limit (free: 3, pro: 10, agency: unlimited)
      const existingCount = await db
        .select({ count: count() })
        .from(competitors)
        .where(and(eq(competitors.userId, input.accountId), eq(competitors.userId, ctx.userId)));

      if ((existingCount[0]?.count ?? 0) >= 20) {
        throw new Error("Competitor limit reached");
      }

      const username = input.twitterHandle.replace("@", "");
      const [comp] = await db
        .insert(competitors)
        .values({
          id: nanoid(),
          userId: ctx.userId,
          twitterId: username, // Placeholder, will be updated on sync
          username,
        })
        .onConflictDoNothing()
        .returning();

      // Try to fetch public data
      if (comp) {
        try {
          await inngest.send({
            name: "competitor/sync.requested",
            data: { competitorId: comp.id },
          });
        } catch {}
      }

      return comp;
    }),

  removeCompetitor: protectedProcedure
    .input(z.object({ competitorId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .delete(competitors)
        .where(
          and(eq(competitors.id, input.competitorId), eq(competitors.userId, ctx.userId))
        );
      return { success: true };
    }),

  refreshCompetitor: protectedProcedure
    .input(z.object({ competitorId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [comp] = await db
        .select()
        .from(competitors)
        .where(
          and(eq(competitors.id, input.competitorId), eq(competitors.userId, ctx.userId))
        );

      if (!comp) throw new Error("Competitor not found");

      await inngest.send({
        name: "competitor/sync.requested",
        data: { competitorId: comp.id },
      });

      return { success: true };
    }),

  compareWithCompetitors: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);

      const [myAccount] = await db
        .select()
        .from(twitterAccounts)
        .where(eq(twitterAccounts.id, input.accountId));

      const compList = await db
        .select()
        .from(competitors)
        .where(
          and(eq(competitors.userId, input.accountId), eq(competitors.userId, ctx.userId))
        );

      return {
        myAccount,
        competitors: compList,
      };
    }),

  // ─── Hashtag performance with days param ──────────────────────────────────
  getHashtagPerformanceDays: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      await verifyAccountOwner(input.accountId, ctx.userId);
      const since = subDays(new Date(), input.days);

      return db
        .select({
          hashtag: hashtagAnalytics.hashtag,
          useCount: sql<number>`sum(${hashtagAnalytics.tweetCount})`,
          avgEngagement: sql<number>`avg(${hashtagAnalytics.avgEngagement})`,
        })
        .from(hashtagAnalytics)
        .where(
          and(
            eq(hashtagAnalytics.accountId, input.accountId),
            eq(hashtagAnalytics.period, input.days <= 7 ? "7d" : input.days <= 30 ? "30d" : "90d")
          )
        )
        .groupBy(hashtagAnalytics.hashtag)
        .orderBy(desc(sql`avg(${hashtagAnalytics.avgEngagement})`))
        .limit(20);
    }),
});

// Helper: Verify account belongs to user
async function verifyAccountOwner(accountId: string, userId: string) {
  const [account] = await db
    .select({ id: twitterAccounts.id })
    .from(twitterAccounts)
    .where(
      and(
        eq(twitterAccounts.id, accountId),
        eq(twitterAccounts.userId, userId)
      )
    )
    .limit(1);

  if (!account) {
    throw new Error("Account not found or unauthorized");
  }
}
