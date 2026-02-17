import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { twitterAccounts, twitterSnapshots, tweets, mentions } from "@/lib/db/schema";
import { eq, and, gte, desc, count, sql } from "drizzle-orm";
import { subDays } from "date-fns";

/**
 * Public API: GET /api/v1/analytics/:accountId
 * Returns analytics data for a specific Twitter account
 * 
 * Query params:
 *   days: number (default 30)
 * 
 * Headers:
 *   Authorization: Bearer cs_live_xxxxx
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = params;
    const days = parseInt(req.nextUrl.searchParams.get("days") ?? "30");
    const since = subDays(new Date(), days);

    // Get account
    const [account] = await db
      .select()
      .from(twitterAccounts)
      .where(eq(twitterAccounts.id, accountId))
      .limit(1);

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Get latest snapshot
    const [latestSnapshot] = await db
      .select()
      .from(twitterSnapshots)
      .where(eq(twitterSnapshots.accountId, accountId))
      .orderBy(desc(twitterSnapshots.date))
      .limit(1);

    // Get follower growth
    const followerGrowth = await db
      .select({
        date: twitterSnapshots.date,
        followerCount: twitterSnapshots.followerCount,
        followerDelta: twitterSnapshots.followerDelta,
      })
      .from(twitterSnapshots)
      .where(
        and(
          eq(twitterSnapshots.accountId, accountId),
          gte(twitterSnapshots.date, since)
        )
      )
      .orderBy(twitterSnapshots.date);

    // Get tweet stats
    const [tweetStats] = await db
      .select({
        totalTweets: count(),
        avgLikes: sql<number>`avg(${tweets.likeCount})`,
        avgRetweets: sql<number>`avg(${tweets.retweetCount})`,
        avgReplies: sql<number>`avg(${tweets.replyCount})`,
        avgImpressions: sql<number>`avg(${tweets.impressionCount})`,
      })
      .from(tweets)
      .where(
        and(
          eq(tweets.accountId, accountId),
          gte(tweets.publishedAt, since)
        )
      );

    // Get mention stats
    const [mentionStats] = await db
      .select({
        totalMentions: count(),
        positiveCount: sql<number>`sum(case when ${mentions.sentiment} = 'positive' then 1 else 0 end)`,
        negativeCount: sql<number>`sum(case when ${mentions.sentiment} = 'negative' then 1 else 0 end)`,
        neutralCount: sql<number>`sum(case when ${mentions.sentiment} = 'neutral' then 1 else 0 end)`,
      })
      .from(mentions)
      .where(
        and(
          eq(mentions.accountId, accountId),
          gte(mentions.publishedAt, since)
        )
      );

    return NextResponse.json({
      account: {
        id: account.id,
        username: account.username,
        displayName: account.displayName,
        followerCount: account.followerCount,
        followingCount: account.followingCount,
        tweetCount: account.tweetCount,
      },
      period: { days, since: since.toISOString() },
      currentStats: latestSnapshot
        ? {
            followers: latestSnapshot.followerCount,
            followerDelta: latestSnapshot.followerDelta,
            engagementRate: (latestSnapshot.engagementRate ?? 0) / 100,
            avgLikes: latestSnapshot.avgLikes,
            avgRetweets: latestSnapshot.avgRetweets,
            avgReplies: latestSnapshot.avgReplies,
            avgImpressions: latestSnapshot.avgImpressions,
          }
        : null,
      followerGrowth: followerGrowth.map((s) => ({
        date: s.date.toISOString(),
        followers: s.followerCount,
        delta: s.followerDelta,
      })),
      tweetStats: {
        totalTweets: tweetStats?.totalTweets ?? 0,
        avgLikes: Math.round(tweetStats?.avgLikes ?? 0),
        avgRetweets: Math.round(tweetStats?.avgRetweets ?? 0),
        avgReplies: Math.round(tweetStats?.avgReplies ?? 0),
        avgImpressions: Math.round(tweetStats?.avgImpressions ?? 0),
      },
      mentionStats: {
        total: mentionStats?.totalMentions ?? 0,
        positive: Number(mentionStats?.positiveCount ?? 0),
        negative: Number(mentionStats?.negativeCount ?? 0),
        neutral: Number(mentionStats?.neutralCount ?? 0),
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
