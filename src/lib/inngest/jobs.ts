import { db } from "@/lib/db";
import {
  twitterAccounts,
  tweets,
  mentions,
  twitterSnapshots,
  topFollowers,
  hashtagAnalytics,
  syncJobs,
  users,
} from "@/lib/db/schema";
import {
  getUserTwitterClient,
  fetchUserTweets,
  fetchUserMentions,
  fetchUserProfile,
  calculateEngagementScore,
  analyzeSentiment,
} from "@/lib/twitter/client";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { subDays, subHours } from "date-fns";
import {
  sendFollowerMilestoneEmail,
  sendViralTweetEmail,
  sendNegativeSentimentAlertEmail,
  sendWeeklyReportEmail,
} from "@/lib/email";

import { inngest } from "./client";
export { inngest };

// Re-export sync functions
export {
  syncTwitterAccount,
  checkAlerts,
  sendWeeklyReports,
  scheduledSync,
} from "./sync-jobs";

// ─────────────────────────────────────────────
// JOB: Sync User Tweets (runs hourly)
// ─────────────────────────────────────────────

export const syncTweets = inngest.createFunction(
  { id: "sync-tweets", name: "Sync Twitter Tweets" },
  { cron: "0 * * * *" }, // Every hour
  async ({ step }) => {
    // Get all active accounts
    const accounts = await step.run("get-accounts", async () => {
      return db
        .select()
        .from(twitterAccounts)
        .where(eq(twitterAccounts.isActive, true));
    });

    // Process each account
    for (const account of accounts) {
      await step.run(`sync-account-${account.id}`, async () => {
        if (!account.accessToken) return;

        const jobId = nanoid();
        await db.insert(syncJobs).values({
          id: jobId,
          accountId: account.id,
          jobType: "tweets",
          status: "running",
          startedAt: new Date(),
        });

        try {
          const client = getUserTwitterClient(account.accessToken);
          const rawTweets = await fetchUserTweets(client, account.id, 100);

          // Upsert tweets
          for (const tweet of rawTweets) {
            const engagementScore = calculateEngagementScore(tweet);
            const hashtags =
              tweet.entities?.hashtags?.map((h) => h.tag) ?? [];
            const mentions =
              tweet.entities?.mentions?.map((m) => m.username) ?? [];

            await db
              .insert(tweets)
              .values({
                id: tweet.id,
                accountId: account.id,
                text: tweet.text,
                likeCount: tweet.public_metrics?.like_count ?? 0,
                retweetCount: tweet.public_metrics?.retweet_count ?? 0,
                replyCount: tweet.public_metrics?.reply_count ?? 0,
                quoteCount: tweet.public_metrics?.quote_count ?? 0,
                impressionCount:
                  tweet.public_metrics?.impression_count ?? 0,
                bookmarkCount:
                  tweet.public_metrics?.bookmark_count ?? 0,
                engagementScore,
                isRetweet:
                  tweet.referenced_tweets?.some(
                    (r) => r.type === "retweeted"
                  ) ?? false,
                isReply:
                  tweet.referenced_tweets?.some(
                    (r) => r.type === "replied_to"
                  ) ?? false,
                hasMedia: !!tweet.attachments?.media_keys?.length,
                hasLink: !!tweet.entities?.urls?.length,
                hashtags,
                mentions,
                publishedAt: new Date(tweet.created_at!),
              })
              .onConflictDoUpdate({
                target: tweets.id,
                set: {
                  likeCount: tweet.public_metrics?.like_count ?? 0,
                  retweetCount: tweet.public_metrics?.retweet_count ?? 0,
                  replyCount: tweet.public_metrics?.reply_count ?? 0,
                  impressionCount:
                    tweet.public_metrics?.impression_count ?? 0,
                  engagementScore,
                },
              });
          }

          // Mark job complete
          await db
            .update(syncJobs)
            .set({ status: "completed", completedAt: new Date() })
            .where(eq(syncJobs.id, jobId));
        } catch (error) {
          await db
            .update(syncJobs)
            .set({
              status: "failed",
              errorMessage: String(error),
              completedAt: new Date(),
            })
            .where(eq(syncJobs.id, jobId));
        }
      });
    }

    return { synced: accounts.length };
  }
);

// ─────────────────────────────────────────────
// JOB: Sync Mentions (runs every 30 minutes)
// ─────────────────────────────────────────────

export const syncMentions = inngest.createFunction(
  { id: "sync-mentions", name: "Sync Twitter Mentions" },
  { cron: "*/30 * * * *" }, // Every 30 minutes
  async ({ step }) => {
    const accounts = await step.run("get-accounts", async () => {
      return db
        .select()
        .from(twitterAccounts)
        .where(eq(twitterAccounts.isActive, true));
    });

    for (const account of accounts) {
      await step.run(`sync-mentions-${account.id}`, async () => {
        if (!account.accessToken) return;

        const client = getUserTwitterClient(account.accessToken);
        const { tweets: rawMentions, users: mentionUsers } =
          await fetchUserMentions(client, account.id);

        for (const mention of rawMentions) {
          const author = mentionUsers.find((u) => u.id === mention.author_id);
          const { sentiment, score } = analyzeSentiment(mention.text);

          await db
            .insert(mentions)
            .values({
              id: mention.id,
              accountId: account.id,
              authorId: mention.author_id!,
              authorUsername: author?.username ?? "",
              authorName: author?.name,
              authorAvatarUrl: author?.profile_image_url,
              authorFollowerCount:
                author?.public_metrics?.followers_count ?? 0,
              text: mention.text,
              likeCount: mention.public_metrics?.like_count ?? 0,
              retweetCount: mention.public_metrics?.retweet_count ?? 0,
              replyCount: mention.public_metrics?.reply_count ?? 0,
              sentiment,
              sentimentScore: score,
              publishedAt: new Date(mention.created_at!),
            })
            .onConflictDoNothing();
        }
      });
    }
  }
);

// ─────────────────────────────────────────────
// JOB: Daily Snapshot (runs daily at midnight UTC)
// ─────────────────────────────────────────────

export const takeDailySnapshot = inngest.createFunction(
  { id: "daily-snapshot", name: "Take Daily Analytics Snapshot" },
  { cron: "0 0 * * *" }, // Midnight UTC daily
  async ({ step }) => {
    const accounts = await step.run("get-accounts", async () => {
      return db
        .select()
        .from(twitterAccounts)
        .where(eq(twitterAccounts.isActive, true));
    });

    for (const account of accounts) {
      await step.run(`snapshot-${account.id}`, async () => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Get yesterday's snapshot for delta calculation
        const yesterday = new Date(today);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);

        const [prevSnapshot] = await db
          .select()
          .from(twitterSnapshots)
          .where(
            and(
              eq(twitterSnapshots.accountId, account.id),
              eq(twitterSnapshots.date, yesterday)
            )
          )
          .limit(1);

        // Calculate 24h engagement stats
        const dayTweets = await db
          .select()
          .from(tweets)
          .where(
            and(
              eq(tweets.accountId, account.id),
              gte(tweets.publishedAt, yesterday)
            )
          );

        const totalEngagement = dayTweets.reduce(
          (sum, t) => sum + (t.engagementScore ?? 0),
          0
        );
        const avgLikes =
          dayTweets.length > 0
            ? Math.round(
                dayTweets.reduce((sum, t) => sum + t.likeCount, 0) /
                  dayTweets.length
              )
            : 0;
        const avgRetweets =
          dayTweets.length > 0
            ? Math.round(
                dayTweets.reduce((sum, t) => sum + t.retweetCount, 0) /
                  dayTweets.length
              )
            : 0;
        const avgReplies =
          dayTweets.length > 0
            ? Math.round(
                dayTweets.reduce((sum, t) => sum + t.replyCount, 0) /
                  dayTweets.length
              )
            : 0;
        const avgImpressions =
          dayTweets.length > 0
            ? Math.round(
                dayTweets.reduce(
                  (sum, t) => sum + (t.impressionCount ?? 0),
                  0
                ) / dayTweets.length
              )
            : 0;

        const followerDelta = prevSnapshot
          ? (account.followerCount ?? 0) - prevSnapshot.followerCount
          : 0;

        const engagementRate =
          avgImpressions > 0
            ? Math.round((totalEngagement / avgImpressions) * 10000)
            : 0;

        await db
          .insert(twitterSnapshots)
          .values({
            id: nanoid(),
            accountId: account.id,
            date: today,
            followerCount: account.followerCount ?? 0,
            followingCount: account.followingCount ?? 0,
            tweetCount: account.tweetCount ?? 0,
            followerDelta,
            engagementRate,
            avgLikes,
            avgRetweets,
            avgReplies,
            avgImpressions,
          })
          .onConflictDoNothing();
      });
    }
  }
);

// ─────────────────────────────────────────────
// JOB: Trigger manual sync for a single account
// ─────────────────────────────────────────────

export const triggerAccountSync = inngest.createFunction(
  { id: "trigger-account-sync", name: "Trigger Account Sync" },
  { event: "account/sync.requested" },
  async ({ event, step }) => {
    const { accountId } = event.data as { accountId: string };

    await step.run("sync-account", async () => {
      const [account] = await db
        .select()
        .from(twitterAccounts)
        .where(eq(twitterAccounts.id, accountId))
        .limit(1);

      if (!account?.accessToken) return;

      const client = getUserTwitterClient(account.accessToken);
      const rawTweets = await fetchUserTweets(client, account.id, 200);

      // Update follower count
      const profile = await fetchUserProfile(client, account.username);
      if (profile) {
        await db
          .update(twitterAccounts)
          .set({
            followerCount: profile.public_metrics?.followers_count ?? 0,
            followingCount: profile.public_metrics?.following_count ?? 0,
            tweetCount: profile.public_metrics?.tweet_count ?? 0,
            lastSyncedAt: new Date(),
          })
          .where(eq(twitterAccounts.id, accountId));
      }

      return { synced: rawTweets.length };
    });
  }
);

export const functions = [
  syncTweets,
  syncMentions,
  takeDailySnapshot,
  triggerAccountSync,
];
