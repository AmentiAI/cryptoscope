/**
 * Inngest background jobs for Twitter sync and alerts
 */

import { inngest } from "./client";
import { db } from "@/lib/db";
import {
  twitterAccounts,
  twitterSnapshots,
  tweets,
  mentions,
  users,
  syncJobs,
} from "@/lib/db/schema";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import { subDays, subHours } from "date-fns";
import { nanoid } from "nanoid";
import {
  sendFollowerMilestoneEmail,
  sendViralTweetEmail,
  sendNegativeSentimentAlertEmail,
  sendWeeklyReportEmail,
} from "@/lib/email";

// ─────────────────────────────────────────────────────────────────────────────
// Twitter Account Sync
// ─────────────────────────────────────────────────────────────────────────────

export const syncTwitterAccount = inngest.createFunction(
  { id: "sync-twitter-account", retries: 2 },
  { event: "twitter/sync.account" },
  async ({ event, step }) => {
    const { accountId, userId, jobId } = event.data;

    // Mark job as running
    if (jobId) {
      await step.run("mark-job-running", async () => {
        await db
          .update(syncJobs)
          .set({ status: "running", startedAt: new Date() })
          .where(eq(syncJobs.id, jobId));
      });
    }

    // Get account with tokens
    const account = await step.run("get-account", async () => {
      const [acc] = await db
        .select()
        .from(twitterAccounts)
        .where(eq(twitterAccounts.id, accountId));
      return acc;
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // In production: Use Twitter API to fetch data
    // For now, simulate with placeholder data
    const twitterData = await step.run("fetch-twitter-data", async () => {
      // TODO: Implement actual Twitter API calls
      // This would use account.accessToken to call:
      // - GET /2/users/:id (profile data)
      // - GET /2/users/:id/tweets (recent tweets)
      // - GET /2/users/:id/mentions (mentions)
      
      return {
        followerCount: account.followerCount ?? 0,
        followingCount: account.followingCount ?? 0,
        tweetCount: account.tweetCount ?? 0,
        recentTweets: [] as any[],
        recentMentions: [] as any[],
      };
    });

    // Create daily snapshot
    await step.run("create-snapshot", async () => {
      const [prevSnapshot] = await db
        .select()
        .from(twitterSnapshots)
        .where(eq(twitterSnapshots.accountId, accountId))
        .orderBy(desc(twitterSnapshots.date))
        .limit(1);

      const followerDelta = prevSnapshot
        ? twitterData.followerCount - prevSnapshot.followerCount
        : 0;

      await db.insert(twitterSnapshots).values({
        id: nanoid(),
        accountId,
        date: new Date(),
        followerCount: twitterData.followerCount,
        followingCount: twitterData.followingCount,
        tweetCount: twitterData.tweetCount,
        followerDelta,
        engagementRate: 0, // TODO: Calculate from tweet data
        avgLikes: 0,
        avgRetweets: 0,
        avgReplies: 0,
        avgImpressions: 0,
      });
    });

    // Update account lastSyncedAt
    await step.run("update-account", async () => {
      await db
        .update(twitterAccounts)
        .set({
          followerCount: twitterData.followerCount,
          followingCount: twitterData.followingCount,
          tweetCount: twitterData.tweetCount,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(twitterAccounts.id, accountId));
    });

    // Mark job as completed
    if (jobId) {
      await step.run("mark-job-completed", async () => {
        await db
          .update(syncJobs)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(syncJobs.id, jobId));
      });
    }

    return { success: true, accountId };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Check Alerts
// ─────────────────────────────────────────────────────────────────────────────

export const checkAlerts = inngest.createFunction(
  { id: "check-alerts" },
  { cron: "*/30 * * * *" }, // Every 30 minutes
  async ({ step }) => {
    // Get all active accounts
    const accounts = await step.run("get-accounts", async () => {
      return db.select().from(twitterAccounts).where(eq(twitterAccounts.isActive, true));
    });

    for (const account of accounts) {
      // Check follower milestones
      await step.run(`check-milestones-${account.id}`, async () => {
        const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
        
        const [latest, previous] = await db
          .select()
          .from(twitterSnapshots)
          .where(eq(twitterSnapshots.accountId, account.id))
          .orderBy(desc(twitterSnapshots.date))
          .limit(2);

        if (latest && previous) {
          for (const milestone of milestones) {
            if (previous.followerCount < milestone && latest.followerCount >= milestone) {
              // Get user email
              const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, account.userId));

              if (user?.email) {
                await sendFollowerMilestoneEmail(
                  user.email,
                  account.username,
                  milestone
                );
              }
            }
          }
        }
      });

      // Check for viral tweets
      await step.run(`check-viral-${account.id}`, async () => {
        const since = subHours(new Date(), 24);
        
        const viralTweets = await db
          .select()
          .from(tweets)
          .where(
            and(
              eq(tweets.accountId, account.id),
              gte(tweets.publishedAt, since),
              sql`${tweets.retweetCount} >= 50`
            )
          )
          .orderBy(desc(tweets.retweetCount))
          .limit(1);

        if (viralTweets.length > 0) {
          const tweet = viralTweets[0]!;
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, account.userId));

          if (user?.email) {
            await sendViralTweetEmail(
              user.email,
              account.username,
              tweet.id,
              tweet.likeCount ?? 0,
              tweet.retweetCount ?? 0
            );
          }
        }
      });

      // Check negative sentiment
      await step.run(`check-sentiment-${account.id}`, async () => {
        const since = subHours(new Date(), 6);
        
        const [negCount] = await db
          .select({ count: count() })
          .from(mentions)
          .where(
            and(
              eq(mentions.accountId, account.id),
              gte(mentions.publishedAt, since),
              eq(mentions.sentiment, "negative")
            )
          );

        if ((negCount?.count ?? 0) >= 10) {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, account.userId));

          if (user?.email) {
            await sendNegativeSentimentAlertEmail(
              user.email,
              account.username,
              negCount?.count ?? 0,
              6
            );
          }
        }
      });
    }

    return { checked: accounts.length };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Weekly Report
// ─────────────────────────────────────────────────────────────────────────────

export const sendWeeklyReports = inngest.createFunction(
  { id: "weekly-reports" },
  { cron: "0 9 * * 1" }, // Every Monday at 9 AM
  async ({ step }) => {
    const accounts = await step.run("get-accounts", async () => {
      return db.select().from(twitterAccounts).where(eq(twitterAccounts.isActive, true));
    });

    let sent = 0;

    for (const account of accounts) {
      await step.run(`report-${account.id}`, async () => {
        const since = subDays(new Date(), 7);

        // Get snapshots for follower delta
        const snapshots = await db
          .select()
          .from(twitterSnapshots)
          .where(
            and(
              eq(twitterSnapshots.accountId, account.id),
              gte(twitterSnapshots.date, since)
            )
          )
          .orderBy(twitterSnapshots.date);

        const followerDelta = snapshots.length > 0
          ? snapshots.reduce((sum, s) => sum + (s.followerDelta ?? 0), 0)
          : 0;

        // Get tweet stats
        const [tweetStats] = await db
          .select({
            count: count(),
            totalLikes: sql<number>`sum(${tweets.likeCount})`,
            totalRetweets: sql<number>`sum(${tweets.retweetCount})`,
          })
          .from(tweets)
          .where(
            and(
              eq(tweets.accountId, account.id),
              gte(tweets.publishedAt, since)
            )
          );

        // Get mention count
        const [mentionCount] = await db
          .select({ count: count() })
          .from(mentions)
          .where(
            and(
              eq(mentions.accountId, account.id),
              gte(mentions.publishedAt, since)
            )
          );

        // Get top tweet
        const [topTweet] = await db
          .select()
          .from(tweets)
          .where(
            and(
              eq(tweets.accountId, account.id),
              gte(tweets.publishedAt, since)
            )
          )
          .orderBy(desc(sql`${tweets.likeCount} + ${tweets.retweetCount} * 2`))
          .limit(1);

        // Get user email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, account.userId));

        if (user?.email) {
          await sendWeeklyReportEmail(user.email, account.username, {
            followerDelta,
            tweetCount: tweetStats?.count ?? 0,
            totalLikes: Number(tweetStats?.totalLikes ?? 0),
            totalRetweets: Number(tweetStats?.totalRetweets ?? 0),
            mentionCount: mentionCount?.count ?? 0,
            topTweetUrl: topTweet
              ? `https://twitter.com/${account.username}/status/${topTweet.id}`
              : undefined,
          });
          sent++;
        }
      });
    }

    return { sent };
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled Account Syncs
// ─────────────────────────────────────────────────────────────────────────────

export const scheduledSync = inngest.createFunction(
  { id: "scheduled-sync" },
  { cron: "0 */4 * * *" }, // Every 4 hours
  async ({ step }) => {
    const accounts = await step.run("get-accounts", async () => {
      return db.select().from(twitterAccounts).where(eq(twitterAccounts.isActive, true));
    });

    // Queue sync for each account
    for (const account of accounts) {
      await step.sendEvent("queue-sync", {
        name: "twitter/sync.account",
        data: {
          accountId: account.id,
          userId: account.userId,
        },
      });
    }

    return { queued: accounts.length };
  }
);
