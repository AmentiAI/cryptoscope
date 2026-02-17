import { z } from "zod";
import { nanoid } from "nanoid";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import { tweets, twitterAccounts, agentTasks, agents } from "@/lib/db/schema";
import { and, eq, desc, gte, sql, count, inArray } from "drizzle-orm";
import { subDays } from "date-fns";

export const contentRouter = createTRPCRouter({
  // ── Tweet Schedule ─────────────────────────────────────────────────────────
  getScheduled: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      return db
        .select()
        .from(agentTasks)
        .where(
          and(
            eq(agentTasks.userId, ctx.userId),
            eq(agentTasks.type, "post_tweet"),
            inArray(agentTasks.status, ["queued"])
          )
        )
        .orderBy(agentTasks.scheduledFor);
    }),

  // ── AI Compose helper ─────────────────────────────────────────────────────
  generateTweetSuggestions: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
        tone: z.enum(["hype", "educational", "controversial", "community", "alpha"]).default("hype"),
        count: z.number().default(5),
      })
    )
    .mutation(async ({ input }) => {
      // AI template suggestions without needing OpenAI key
      const templates: Record<string, string[]> = {
        hype: [
          `🚀 ${input.topic} is about to change everything. You're not ready. #crypto #Web3`,
          `The builders are quiet. The charts don't lie. ${input.topic} loading... 👀`,
          `Just saw the ${input.topic} numbers. Not going to lie to you — this is the one. 🔥`,
          `${input.topic} isn't a trend. It's infrastructure. And we're early. #WAGMI`,
          `Whoever sold ${input.topic} last week is going to have a really bad time explaining that.`,
        ],
        educational: [
          `Thread: Why ${input.topic} matters for crypto creators (1/${input.count + 2})`,
          `Let me break down ${input.topic} for you in plain English 🧵`,
          `Most people misunderstand ${input.topic}. Here's what's actually happening:`,
          `3 things every creator needs to know about ${input.topic}:`,
          `The math behind ${input.topic} is actually wild. Let me show you 👇`,
        ],
        controversial: [
          `Hot take: ${input.topic} is overrated and nobody wants to say it`,
          `Unpopular opinion: The ${input.topic} space needs a wake up call`,
          `I'll die on this hill: ${input.topic} is the most misunderstood thing in crypto`,
          `Everyone is bullish on ${input.topic}. That's exactly why I'm paying attention.`,
          `The ${input.topic} narrative is collapsing and the influencers are still pumping it. 👀`,
        ],
        community: [
          `Shoutout to everyone building in the ${input.topic} space rn. The vibes are immaculate 🫶`,
          `Who else is deep in ${input.topic}? Drop your handle, let's connect 👇`,
          `${input.topic} community where you at? Best project gets a retweet 🔁`,
          `Hosting a ${input.topic} spaces next week. Builders/traders/degens welcome. RT to spread 📣`,
          `If you're building on ${input.topic}, DM me. Serious collaborations only.`,
        ],
        alpha: [
          `🔐 Alpha: The ${input.topic} play everyone is sleeping on right now`,
          `Quietly watching ${input.topic} while everyone is distracted. This is the move.`,
          `${input.topic} wallet addresses are accumulating. Chart doesn't reflect it yet. 👀`,
          `Insiders know. ${input.topic} announcement incoming. Stack accordingly.`,
          `The ${input.topic} signal is flashing. If you know, you know.`,
        ],
      };

      const selected = templates[input.tone] ?? templates.hype;
      return selected.slice(0, input.count);
    }),

  // ── Thread builder ─────────────────────────────────────────────────────────
  buildThread: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
        keyPoints: z.array(z.string()),
        style: z.enum(["informative", "storytelling", "alpha_leak"]).default("informative"),
      })
    )
    .mutation(async ({ input }) => {
      const points = input.keyPoints.slice(0, 20);
      const thread: string[] = [];

      // Hook tweet
      if (input.style === "storytelling") {
        thread.push(`A story about ${input.topic} that will change how you see crypto forever 🧵`);
      } else if (input.style === "alpha_leak") {
        thread.push(`🔐 Thread: What nobody is telling you about ${input.topic} (and why they're not)`);
      } else {
        thread.push(`Everything you need to know about ${input.topic} — a thread 🧵\n\nBookmark this. Share it. You'll need it.`);
      }

      // Middle tweets
      points.forEach((point, i) => {
        thread.push(`${i + 2}/ ${point}`);
      });

      // CTA
      thread.push(
        `${points.length + 2}/ That's the ${input.topic} breakdown.\n\nIf this helped → RT the first tweet\nFollow for more alpha: @cryptoscope_\n\n#crypto #Web3 #${input.topic.replace(/\s/g, "")}`
      );

      return thread;
    }),

  // ── Content calendar ──────────────────────────────────────────────────────
  getCalendar: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Return scheduled tasks in the date range
      return db
        .select()
        .from(agentTasks)
        .where(
          and(
            eq(agentTasks.userId, ctx.userId),
            eq(agentTasks.type, "post_tweet"),
            gte(agentTasks.scheduledFor, input.startDate)
          )
        )
        .orderBy(agentTasks.scheduledFor)
        .limit(200);
    }),

  // ── Schedule a tweet ──────────────────────────────────────────────────────
  scheduleTweet: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        text: z.string().max(280),
        scheduledAt: z.date(),
        isThread: z.boolean().default(false),
        threadTweets: z.array(z.string()).optional(),
        agentId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Find or use specified agent
      let agentId = input.agentId;
      if (!agentId) {
        const [agent] = await db
          .select()
          .from(agents)
          .where(and(eq(agents.userId, ctx.userId), eq(agents.status, "active")))
          .limit(1);
        agentId = agent?.id;
      }

      const [task] = await db
        .insert(agentTasks)
        .values({
          id: nanoid(),
          userId: ctx.userId,
          agentId: agentId!,
          type: "post_tweet",
          status: "queued",
          input: {
            accountId: input.accountId,
            text: input.text,
            isThread: input.isThread,
            threadTweets: input.threadTweets,
          },
          scheduledFor: input.scheduledAt,
        })
        .returning();

      return task;
    }),

  // ── Best posting times ────────────────────────────────────────────────────
  getBestPostingTimes: protectedProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Analyze existing tweet performance by hour
      const tweetsByHour = await db
        .select({
          hour: sql<number>`extract(hour from ${tweets.publishedAt})`,
          avgEngagement: sql<number>`avg(${tweets.likeCount} + ${tweets.retweetCount} * 2 + ${tweets.replyCount})`,
          count: count(),
        })
        .from(tweets)
        .where(
          and(
            eq(tweets.accountId, input.accountId),
            gte(tweets.publishedAt, subDays(new Date(), 90))
          )
        )
        .groupBy(sql`extract(hour from ${tweets.publishedAt})`)
        .orderBy(sql`avg(${tweets.likeCount} + ${tweets.retweetCount} * 2 + ${tweets.replyCount}) desc`)
        .limit(5);

      const bestHours = tweetsByHour.map((r) => ({
        hour: Math.round(r.hour),
        avgEngagement: Math.round(r.avgEngagement ?? 0),
        tweetCount: r.count,
        label: formatHour(Math.round(r.hour)),
      }));

      // Default recommendations if no data
      if (bestHours.length === 0) {
        return [
          { hour: 9, avgEngagement: 0, tweetCount: 0, label: "9 AM", default: true },
          { hour: 12, avgEngagement: 0, tweetCount: 0, label: "12 PM", default: true },
          { hour: 17, avgEngagement: 0, tweetCount: 0, label: "5 PM", default: true },
          { hour: 20, avgEngagement: 0, tweetCount: 0, label: "8 PM", default: true },
        ];
      }

      return bestHours;
    }),

  // ── Content performance analytics ─────────────────────────────────────────
  getContentAnalytics: protectedProcedure
    .input(
      z.object({
        accountId: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      const since = subDays(new Date(), input.days);

      const [volumeByDay, topByEngagement, topByImpressions, avgStats] = await Promise.all([
        // Tweets per day
        db
          .select({
            date: sql<string>`date(${tweets.publishedAt})`,
            count: count(),
          })
          .from(tweets)
          .where(and(eq(tweets.accountId, input.accountId), gte(tweets.publishedAt, since)))
          .groupBy(sql`date(${tweets.publishedAt})`)
          .orderBy(sql`date(${tweets.publishedAt})`),

        // Top by engagement
        db
          .select()
          .from(tweets)
          .where(and(eq(tweets.accountId, input.accountId), gte(tweets.publishedAt, since)))
          .orderBy(desc(sql`${tweets.likeCount} + ${tweets.retweetCount} * 2 + ${tweets.replyCount}`))
          .limit(5),

        // Top by impressions
        db
          .select()
          .from(tweets)
          .where(and(eq(tweets.accountId, input.accountId), gte(tweets.publishedAt, since)))
          .orderBy(desc(tweets.impressionCount))
          .limit(5),

        // Average stats
        db
          .select({
            avgLikes: sql<number>`avg(${tweets.likeCount})`,
            avgRetweets: sql<number>`avg(${tweets.retweetCount})`,
            avgReplies: sql<number>`avg(${tweets.replyCount})`,
            avgImpressions: sql<number>`avg(${tweets.impressionCount})`,
            totalTweets: count(),
          })
          .from(tweets)
          .where(and(eq(tweets.accountId, input.accountId), gte(tweets.publishedAt, since))),
      ]);

      return {
        volumeByDay,
        topByEngagement,
        topByImpressions,
        avgStats: avgStats[0],
      };
    }),
});

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}
