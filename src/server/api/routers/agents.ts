import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import { agents, agentTasks, agentLogs } from "@/lib/db/schema";
import { and, eq, desc, gte, count } from "drizzle-orm";
import { subDays } from "date-fns";
import { nanoid } from "nanoid";

export const agentsRouter = createTRPCRouter({
  // ── List agents ──────────────────────────────────────────────────────────
  listAgents: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(agents)
      .where(eq(agents.userId, ctx.userId))
      .orderBy(desc(agents.createdAt));
  }),

  // ── Connect a new agent ───────────────────────────────────────────────────
  connectAgent: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        moltbookApiKey: z.string().min(5),
        moltbookUsername: z.string().optional(),
        persona: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify API key works
      let moltbookAgentId: string | undefined;
      try {
        const res = await fetch("https://moltbook.com/api/v1/agent/me", {
          headers: { Authorization: `Bearer ${input.moltbookApiKey}` },
        });
        if (res.ok) {
          const data = await res.json() as { id?: string; username?: string };
          moltbookAgentId = data.id;
        }
      } catch {}

      const [agent] = await db
        .insert(agents)
        .values({
          id: nanoid(),
          userId: ctx.userId,
          displayName: input.name,
          moltbookApiKey: input.moltbookApiKey,
          moltbookAgentId,
          moltbookUsername: input.moltbookUsername,
          persona: input.persona,
          status: "active",
        })
        .returning();

      return agent;
    }),

  // ── Pause / resume ────────────────────────────────────────────────────────
  pauseAgent: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [updated] = await db
        .update(agents)
        .set({ status: "paused", updatedAt: new Date() })
        .where(and(eq(agents.id, input.agentId), eq(agents.userId, ctx.userId)))
        .returning();
      return updated;
    }),

  resumeAgent: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [updated] = await db
        .update(agents)
        .set({ status: "active", lastActiveAt: new Date(), updatedAt: new Date() })
        .where(and(eq(agents.id, input.agentId), eq(agents.userId, ctx.userId)))
        .returning();
      return updated;
    }),

  deleteAgent: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .delete(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.userId, ctx.userId)));
      return { success: true };
    }),

  // ── Run a task ────────────────────────────────────────────────────────────
  runTask: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        type: z.enum([
          "post_tweet", "reply_mention", "dm_follower", "post_moltbook",
          "monitor_keywords", "analyze_competitors", "follow_user", "unfollow_user", "custom",
        ]),
        payload: z.record(z.unknown()).default({}),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.userId, ctx.userId)));

      if (!agent) throw new Error("Agent not found");

      const taskId = nanoid();

      const [task] = await db
        .insert(agentTasks)
        .values({
          id: taskId,
          userId: ctx.userId,
          agentId: input.agentId,
          type: input.type,
          status: input.scheduledAt ? "queued" : "running",
          input: input.payload,
          scheduledFor: input.scheduledAt ?? new Date(),
        })
        .returning();

      // Dispatch via Moltbook API if configured
      if (agent.moltbookApiKey) {
        try {
          const res = await fetch("https://moltbook.com/api/v1/tasks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${agent.moltbookApiKey}`,
            },
            body: JSON.stringify({ type: input.type, payload: input.payload }),
          });

          const taskStatus = res.ok ? "done" : "failed";
          const errorMessage = res.ok ? undefined : await res.text();

          await db
            .update(agentTasks)
            .set({ status: taskStatus, errorMessage, completedAt: new Date() })
            .where(eq(agentTasks.id, taskId));
        } catch (err) {
          await db
            .update(agentTasks)
            .set({ status: "failed", errorMessage: String(err) })
            .where(eq(agentTasks.id, taskId));
        }
      }

      // Update agent last active
      await db
        .update(agents)
        .set({ lastActiveAt: new Date(), tasksCompleted: agent.tasksCompleted + 1 })
        .where(eq(agents.id, input.agentId));

      return task;
    }),

  // ── Schedule a task ────────────────────────────────────────────────────────
  scheduleTask: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        type: z.enum([
          "post_tweet", "reply_mention", "dm_follower", "post_moltbook",
          "monitor_keywords", "analyze_competitors", "follow_user", "unfollow_user", "custom",
        ]),
        payload: z.record(z.unknown()).default({}),
        scheduledAt: z.date(),
        cronExpression: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.userId, ctx.userId)));

      if (!agent) throw new Error("Agent not found");

      const [task] = await db
        .insert(agentTasks)
        .values({
          id: nanoid(),
          userId: ctx.userId,
          agentId: input.agentId,
          type: input.type,
          status: "queued",
          input: input.payload,
          scheduledFor: input.scheduledAt,
          isRecurring: !!input.cronExpression,
          cronExpression: input.cronExpression,
        })
        .returning();

      return task;
    }),

  // ── Get recent tasks ──────────────────────────────────────────────────────
  getRecentTasks: protectedProcedure
    .input(z.object({ agentId: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      const conditions = [eq(agentTasks.userId, ctx.userId)];
      if (input.agentId) conditions.push(eq(agentTasks.agentId, input.agentId));

      return db
        .select()
        .from(agentTasks)
        .where(and(...conditions))
        .orderBy(desc(agentTasks.createdAt))
        .limit(input.limit);
    }),

  // ── Cancel task ───────────────────────────────────────────────────────────
  cancelTask: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [updated] = await db
        .update(agentTasks)
        .set({ status: "cancelled" })
        .where(and(eq(agentTasks.id, input.taskId), eq(agentTasks.userId, ctx.userId)))
        .returning();
      return updated;
    }),

  // ── Agent stats ───────────────────────────────────────────────────────────
  getAgentStats: protectedProcedure.query(async ({ ctx }) => {
    const since7d = subDays(new Date(), 7);

    const [allAgents, taskStats, queuedCount] = await Promise.all([
      db.select({ id: agents.id, status: agents.status }).from(agents).where(eq(agents.userId, ctx.userId)),
      db
        .select({ status: agentTasks.status, count: count() })
        .from(agentTasks)
        .where(and(eq(agentTasks.userId, ctx.userId), gte(agentTasks.createdAt, since7d)))
        .groupBy(agentTasks.status),
      db
        .select({ count: count() })
        .from(agentTasks)
        .where(and(eq(agentTasks.userId, ctx.userId), eq(agentTasks.status, "queued"))),
    ]);

    return {
      totalAgents: allAgents.length,
      activeAgents: allAgents.filter((a) => a.status === "active").length,
      pausedAgents: allAgents.filter((a) => a.status === "paused").length,
      completedTasks7d: taskStats.find((t) => t.status === "done")?.count ?? 0,
      failedTasks7d: taskStats.find((t) => t.status === "failed")?.count ?? 0,
      queuedTasks: queuedCount[0]?.count ?? 0,
    };
  }),

  // ── Get agent logs ────────────────────────────────────────────────────────
  getAgentLogs: protectedProcedure
    .input(z.object({ agentId: z.string(), limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.userId, ctx.userId)));

      if (!agent) throw new Error("Agent not found");

      return db
        .select()
        .from(agentLogs)
        .where(eq(agentLogs.agentId, input.agentId))
        .orderBy(desc(agentLogs.createdAt))
        .limit(input.limit);
    }),
});
