import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mentions } from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { subHours } from "date-fns";

/**
 * Public API: GET /api/v1/mentions/:accountId
 * Returns recent mentions for a Twitter account
 * 
 * Query params:
 *   hours: number (default 48)
 *   sentiment: "positive" | "negative" | "neutral" (optional)
 *   limit: number (default 50, max 200)
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
    const hours = parseInt(req.nextUrl.searchParams.get("hours") ?? "48");
    const sentiment = req.nextUrl.searchParams.get("sentiment");
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 200);

    const since = subHours(new Date(), hours);

    const conditions = [
      eq(mentions.accountId, accountId),
      gte(mentions.publishedAt, since),
    ];

    if (sentiment && ["positive", "negative", "neutral"].includes(sentiment)) {
      conditions.push(eq(mentions.sentiment, sentiment));
    }

    const results = await db
      .select({
        id: mentions.id,
        authorId: mentions.authorId,
        authorUsername: mentions.authorUsername,
        authorName: mentions.authorName,
        authorFollowerCount: mentions.authorFollowerCount,
        text: mentions.text,
        sentiment: mentions.sentiment,
        sentimentScore: mentions.sentimentScore,
        likeCount: mentions.likeCount,
        retweetCount: mentions.retweetCount,
        replyCount: mentions.replyCount,
        publishedAt: mentions.publishedAt,
      })
      .from(mentions)
      .where(and(...conditions))
      .orderBy(desc(mentions.publishedAt))
      .limit(limit);

    return NextResponse.json({
      accountId,
      period: { hours, since: since.toISOString() },
      total: results.length,
      mentions: results.map((m) => ({
        id: m.id,
        author: {
          id: m.authorId,
          username: m.authorUsername,
          name: m.authorName,
          followers: m.authorFollowerCount,
        },
        text: m.text,
        sentiment: m.sentiment,
        sentimentScore: m.sentimentScore,
        engagement: {
          likes: m.likeCount,
          retweets: m.retweetCount,
          replies: m.replyCount,
        },
        tweetUrl: `https://twitter.com/${m.authorUsername}/status/${m.id}`,
        publishedAt: m.publishedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
