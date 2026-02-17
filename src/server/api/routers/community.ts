import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import {
  mentions,
  topFollowers,
  twitterAccounts,
  twitterSnapshots,
} from "@/lib/db/schema";
import { and, eq, desc, gte, sql, count, avg, inArray } from "drizzle-orm";
import { subDays, subHours } from "date-fns";

export const communityRouter = createTRPCRouter({
  // ── Mentions inbox ─────────────────────────────────────────────────────────
  getMentions: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
        unrespondedOnly: z.boolean().default(false),
        hours: z.number().default(48),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [
        eq(mentions.accountId, input.accountId),
        gte(mentions.createdAt, subHours(new Date(), input.hours)),
      ];

      if (input.sentiment) {
        conditions.push(eq(mentions.sentiment, input.sentiment));
      }

      const [results, total] = await Promise.all([
        db
          .select()
          .from(mentions)
          .where(and(...conditions))
          .orderBy(desc(mentions.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: count() })
          .from(mentions)
          .where(and(...conditions)),
      ]);

      return { mentions: results, total: total[0]?.count ?? 0 };
    }),

  // ── Sentiment breakdown ────────────────────────────────────────────────────
  getSentimentBreakdown: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(7),
      })
    )
    .query(async ({ input, ctx }) => {
      const since = subDays(new Date(), input.days);

      const breakdown = await db
        .select({
          sentiment: mentions.sentiment,
          count: count(),
        })
        .from(mentions)
        .where(
          and(
            eq(mentions.accountId, input.accountId),
            gte(mentions.createdAt, since)
          )
        )
        .groupBy(mentions.sentiment);

      const total = breakdown.reduce((s, r) => s + r.count, 0);

      return {
        breakdown: breakdown.map((r) => ({
          sentiment: r.sentiment ?? "neutral",
          count: r.count,
          pct: total > 0 ? Math.round((r.count / total) * 100) : 0,
        })),
        total,
        healthScore: calcHealthScore(breakdown),
      };
    }),

  // ── Top fans / community members ──────────────────────────────────────────
  getTopFans: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      return db
        .select()
        .from(topFollowers)
        .where(eq(topFollowers.accountId, input.accountId))
        .orderBy(desc(topFollowers.engagementScore))
        .limit(input.limit);
    }),

  // ── Community health metrics ───────────────────────────────────────────────
  getCommunityHealth: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      const since7d = subDays(new Date(), 7);
      const since30d = subDays(new Date(), 30);

      const [
        mentionCount7d,
        mentionCount30d,
        sentimentBreakdown,
        topFansCount,
        avgEngagement,
        latestSnapshot,
      ] = await Promise.all([
        db
          .select({ count: count() })
          .from(mentions)
          .where(and(eq(mentions.accountId, input.accountId), gte(mentions.createdAt, since7d))),
        db
          .select({ count: count() })
          .from(mentions)
          .where(and(eq(mentions.accountId, input.accountId), gte(mentions.createdAt, since30d))),
        db
          .select({ sentiment: mentions.sentiment, count: count() })
          .from(mentions)
          .where(and(eq(mentions.accountId, input.accountId), gte(mentions.createdAt, since7d)))
          .groupBy(mentions.sentiment),
        db
          .select({ count: count() })
          .from(topFollowers)
          .where(eq(topFollowers.accountId, input.accountId)),
        db
          .select({
            avgEngagement: sql<number>`avg(coalesce(${twitterSnapshots.engagementRate}, 0))`,
          })
          .from(twitterSnapshots)
          .where(
            and(
              eq(twitterSnapshots.accountId, input.accountId),
              gte(twitterSnapshots.date, since30d)
            )
          ),
        db
          .select()
          .from(twitterSnapshots)
          .where(eq(twitterSnapshots.accountId, input.accountId))
          .orderBy(desc(twitterSnapshots.date))
          .limit(1),
      ]);

      const totalMentions = mentionCount7d[0]?.count ?? 0;
      const positiveCount = sentimentBreakdown.find((s) => s.sentiment === "positive")?.count ?? 0;
      const negativeCount = sentimentBreakdown.find((s) => s.sentiment === "negative")?.count ?? 0;

      const healthScore = calcHealthScore(sentimentBreakdown);

      return {
        mentionCount7d: totalMentions,
        mentionCount30d: mentionCount30d[0]?.count ?? 0,
        positiveCount,
        negativeCount,
        neutralCount: totalMentions - positiveCount - negativeCount,
        topFansCount: topFansCount[0]?.count ?? 0,
        avgEngagementRate: avgEngagement[0]?.avgEngagement ?? 0,
        healthScore,
        healthLabel: healthScore >= 70 ? "Great" : healthScore >= 40 ? "Good" : "Needs Attention",
        latestFollowerCount: latestSnapshot[0]?.followerCount ?? 0,
        latestFollowerDelta: latestSnapshot[0]?.followerDelta ?? 0,
      };
    }),

  // ── Mention timeline chart ─────────────────────────────────────────────────
  getMentionTimeline: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(14),
      })
    )
    .query(async ({ input, ctx }) => {
      const since = subDays(new Date(), input.days);

      return db
        .select({
          date: sql<string>`date(${mentions.createdAt})`,
          positive: sql<number>`sum(case when ${mentions.sentiment} = 'positive' then 1 else 0 end)`,
          neutral: sql<number>`sum(case when ${mentions.sentiment} = 'neutral' then 1 else 0 end)`,
          negative: sql<number>`sum(case when ${mentions.sentiment} = 'negative' then 1 else 0 end)`,
          total: count(),
        })
        .from(mentions)
        .where(
          and(
            eq(mentions.accountId, input.accountId),
            gte(mentions.createdAt, since)
          )
        )
        .groupBy(sql`date(${mentions.createdAt})`)
        .orderBy(sql`date(${mentions.createdAt})`);
    }),

  // ── Top mentioned accounts in community ───────────────────────────────────
  getTopMentioners: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(30),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const since = subDays(new Date(), input.days);

      return db
        .select({
          authorHandle: mentions.authorUsername,
          authorName: mentions.authorName,
          authorFollowerCount: mentions.authorFollowerCount,
          mentionCount: count(),
          avgSentiment: sql<string>`mode() within group (order by ${mentions.sentiment})`,
        })
        .from(mentions)
        .where(
          and(
            eq(mentions.accountId, input.accountId),
            gte(mentions.createdAt, since)
          )
        )
        .groupBy(mentions.authorUsername, mentions.authorName, mentions.authorFollowerCount)
        .orderBy(desc(count()))
        .limit(input.limit);
    }),

  // ── Engagement score for a specific follower ──────────────────────────────
  getFollowerEngagement: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        twitterHandle: z.string(),
      })
    )
    .query(async ({ input }) => {
      const [follower] = await db
        .select()
        .from(topFollowers)
        .where(
          and(
            eq(topFollowers.accountId, input.accountId),
            eq(topFollowers.followerUsername, input.twitterHandle)
          )
        );

      const mentionHistory = await db
        .select()
        .from(mentions)
        .where(
          and(
            eq(mentions.accountId, input.accountId),
            eq(mentions.authorUsername, input.twitterHandle)
          )
        )
        .orderBy(desc(mentions.createdAt))
        .limit(20);

      return { follower, mentionHistory };
    }),
});

function calcHealthScore(
  breakdown: Array<{ sentiment: string | null; count: number }>
): number {
  const total = breakdown.reduce((s, r) => s + r.count, 0);
  if (total === 0) return 75; // no data → neutral good score

  const positiveCount = breakdown.find((r) => r.sentiment === "positive")?.count ?? 0;
  const negativeCount = breakdown.find((r) => r.sentiment === "negative")?.count ?? 0;

  const positiveRatio = positiveCount / total;
  const negativeRatio = negativeCount / total;

  // Score 0–100: positive brings up, negative brings down
  const score = 50 + positiveRatio * 50 - negativeRatio * 40;
  return Math.round(Math.max(0, Math.min(100, score)));
}
