import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import {
  twitterAccounts,
  twitterSnapshots,
  mentions,
  hashtagAnalytics,
  competitors,
  tweets,
} from "@/lib/db/schema";
import { and, eq, desc, gte, sql, count, gt } from "drizzle-orm";
import { subHours, subDays } from "date-fns";

// In-memory alert config (in production: store in DB)
// This router surfaces insights that would normally trigger alerts

export const alertsRouter = createTRPCRouter({
  // ── Get all active alerts / notifications ─────────────────────────────────
  getAlerts: protectedProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const alerts: Array<{
        id: string;
        type: string;
        severity: "info" | "warning" | "success" | "critical";
        title: string;
        message: string;
        createdAt: Date;
        data: Record<string, unknown>;
      }> = [];

      // Get accounts to analyze
      const accounts = await db
        .select()
        .from(twitterAccounts)
        .where(
          and(
            eq(twitterAccounts.userId, ctx.userId),
            input.accountId ? eq(twitterAccounts.id, input.accountId) : undefined
          )
        );

      for (const account of accounts) {
        // 1. Follower milestone alerts
        if (account.followerCount) {
          const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
          const latestSnapshot = await db
            .select()
            .from(twitterSnapshots)
            .where(eq(twitterSnapshots.accountId, account.id))
            .orderBy(desc(twitterSnapshots.createdAt))
            .limit(2);

          if (latestSnapshot.length >= 2) {
            const prev = latestSnapshot[1]!.followerCount;
            const curr = latestSnapshot[0]!.followerCount;
            for (const milestone of milestones) {
              if (prev < milestone && curr >= milestone) {
                alerts.push({
                  id: `milestone-${account.id}-${milestone}`,
                  type: "follower_milestone",
                  severity: "success",
                  title: `🎉 ${milestone.toLocaleString()} Followers!`,
                  message: `@${account.username} just crossed ${milestone.toLocaleString()} followers. Keep the momentum going!`,
                  createdAt: latestSnapshot[0]!.createdAt,
                  data: { accountId: account.id, milestone, current: curr },
                });
              }
            }

            // Sudden follower drop
            const delta = curr - prev;
            if (prev > 0 && delta < -prev * 0.05) {
              alerts.push({
                id: `drop-${account.id}-${Date.now()}`,
                type: "follower_drop",
                severity: "warning",
                title: "⚠️ Significant Follower Drop",
                message: `@${account.username} lost ${Math.abs(delta).toLocaleString()} followers recently. Check for shadow ban or controversial content.`,
                createdAt: new Date(),
                data: { accountId: account.id, delta, current: curr },
              });
            }

            // Sudden spike
            if (delta > prev * 0.1 && delta > 50) {
              alerts.push({
                id: `spike-${account.id}-${Date.now()}`,
                type: "follower_spike",
                severity: "success",
                title: "🚀 Viral Growth Detected",
                message: `@${account.username} gained ${delta.toLocaleString()} followers in the last 24h. Something went viral!`,
                createdAt: new Date(),
                data: { accountId: account.id, delta, current: curr },
              });
            }
          }
        }

        // 2. Viral tweet detection (last 24h)
        const viralTweets = await db
          .select()
          .from(tweets)
          .where(
            and(
              eq(tweets.accountId, account.id),
              gte(tweets.publishedAt, subHours(new Date(), 24)),
              gt(tweets.retweetCount, 50)
            )
          )
          .orderBy(desc(tweets.retweetCount))
          .limit(3);

        for (const tweet of viralTweets) {
          alerts.push({
            id: `viral-tweet-${tweet.id}`,
            type: "viral_tweet",
            severity: "success",
            title: "🔥 Tweet Going Viral",
            message: `Your tweet got ${tweet.retweetCount?.toLocaleString()} RTs and ${tweet.likeCount?.toLocaleString()} likes in the last 24h!`,
            createdAt: tweet.publishedAt ?? new Date(),
            data: {
              tweetId: tweet.id,
              tweetUrl: tweet.id,
              likeCount: tweet.likeCount,
              retweetCount: tweet.retweetCount,
              impressionCount: tweet.impressionCount,
            },
          });
        }

        // 3. High-value mention alerts
        const bigMentions = await db
          .select()
          .from(mentions)
          .where(
            and(
              eq(mentions.accountId, account.id),
              gte(mentions.createdAt, subHours(new Date(), 24)),
              gt(mentions.authorFollowerCount, 10000)
            )
          )
          .orderBy(desc(mentions.authorFollowerCount))
          .limit(3);

        for (const mention of bigMentions) {
          alerts.push({
            id: `bigmention-${mention.id}`,
            type: "high_value_mention",
            severity: "info",
            title: "👀 Big Account Mentioned You",
            message: `@${mention.authorUsername} (${mention.authorFollowerCount?.toLocaleString()} followers) mentioned you. Engage now!`,
            createdAt: mention.createdAt,
            data: {
              authorHandle: mention.authorUsername,
              authorFollowerCount: mention.authorFollowerCount,
              tweetUrl: mention.publishedAt,
              sentiment: mention.sentiment,
            },
          });
        }

        // 4. Negative sentiment spike
        const negMentions = await db
          .select({ count: count() })
          .from(mentions)
          .where(
            and(
              eq(mentions.accountId, account.id),
              gte(mentions.createdAt, subHours(new Date(), 6)),
              eq(mentions.sentiment, "negative")
            )
          );

        if ((negMentions[0]?.count ?? 0) > 10) {
          alerts.push({
            id: `neg-sentiment-${account.id}`,
            type: "negative_sentiment",
            severity: "critical",
            title: "🚨 Negative Sentiment Spike",
            message: `${negMentions[0]?.count} negative mentions in the last 6 hours. You may want to respond or review your recent posts.`,
            createdAt: new Date(),
            data: { accountId: account.id, count: negMentions[0]?.count },
          });
        }
      }

      // 5. Competitor alerts
      const competitorList = await db
        .select()
        .from(competitors)
        .where(eq(competitors.userId, ctx.userId))
        .limit(10);

      for (const comp of competitorList) {
        if (comp.followerCount && comp.followerCount) {
          const compDelta = comp.followerCount - comp.followerCount;
          if (compDelta > 500) {
            alerts.push({
              id: `comp-spike-${comp.id}`,
              type: "competitor_spike",
              severity: "warning",
              title: "📊 Competitor Growing Fast",
              message: `@${comp.username} gained ${compDelta.toLocaleString()} followers recently. Check what content is working for them.`,
              createdAt: new Date(),
              data: { competitorId: comp.id, handle: comp.username, delta: compDelta },
            });
          }
        }
      }

      // Sort by severity then date
      const severityOrder = { critical: 0, warning: 1, success: 2, info: 3 };
      return alerts
        .sort((a, b) => {
          const sev = severityOrder[a.severity] - severityOrder[b.severity];
          if (sev !== 0) return sev;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, input.limit);
    }),

  // ── Alert preferences ─────────────────────────────────────────────────────
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    // Return default preferences (in production: pull from users table metadata)
    return {
      followerMilestones: true,
      followerDrop: true,
      followerSpike: true,
      viralTweet: true,
      highValueMention: true,
      negativeSentiment: true,
      competitorSpike: true,
      emailNotifications: true,
      discordWebhook: null,
      telegramChatId: null,
    };
  }),

  // ── Keyword monitor (searches recent mentions for keywords) ───────────────
  getKeywordMentions: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        keywords: z.array(z.string()),
        hours: z.number().default(24),
      })
    )
    .query(async ({ input, ctx }) => {
      const since = subHours(new Date(), input.hours);

      const results = await db
        .select()
        .from(mentions)
        .where(
          and(
            eq(mentions.accountId, input.accountId),
            gte(mentions.createdAt, since)
          )
        )
        .orderBy(desc(mentions.createdAt))
        .limit(200);

      // Filter by keywords client-side for flexibility
      const keywords = input.keywords.map((k) => k.toLowerCase());
      return results.filter((m) =>
        keywords.some((k) => m.text?.toLowerCase().includes(k))
      );
    }),

  // ── Trending hashtags in account's niche ──────────────────────────────────
  getTrendingHashtags: protectedProcedure
    .input(z.object({ accountId: z.string(), limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      const since = subDays(new Date(), 7);

      return db
        .select({
          hashtag: hashtagAnalytics.hashtag,
          totalUses: sql<number>`sum(${hashtagAnalytics.tweetCount})`,
          avgEngagement: sql<number>`avg(${hashtagAnalytics.avgEngagement})`,
          trendScore: sql<number>`sum(${hashtagAnalytics.tweetCount}) * avg(${hashtagAnalytics.avgEngagement})`,
        })
        .from(hashtagAnalytics)
        .where(
          and(
            eq(hashtagAnalytics.accountId, input.accountId),
            eq(hashtagAnalytics.period, "7d")
          )
        )
        .groupBy(hashtagAnalytics.hashtag)
        .orderBy(desc(sql`sum(${hashtagAnalytics.tweetCount}) * avg(${hashtagAnalytics.avgEngagement})`))
        .limit(input.limit);
    }),
});
