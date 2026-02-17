import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/lib/db";
import {
  crmContacts,
  crmDeals,
  crmPipelines,
  crmActivities,
} from "@/lib/db/schema";
import { and, eq, desc, ilike, or, sql, count } from "drizzle-orm";
import { nanoid } from "nanoid";

export const crmRouter = createTRPCRouter({
  // ── Contacts ──────────────────────────────────────────────────────────────
  listContacts: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["lead", "prospect", "active", "partner", "archived"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [eq(crmContacts.userId, ctx.userId)];

      if (input.search) {
        conditions.push(
          or(
            ilike(crmContacts.twitterUsername, `%${input.search}%`),
            ilike(crmContacts.twitterDisplayName, `%${input.search}%`),
            ilike(crmContacts.email, `%${input.search}%`)
          )!
        );
      }

      if (input.status) {
        conditions.push(eq(crmContacts.status, input.status));
      }

      const [contacts, total] = await Promise.all([
        db
          .select()
          .from(crmContacts)
          .where(and(...conditions))
          .orderBy(desc(crmContacts.updatedAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ count: count() })
          .from(crmContacts)
          .where(and(...conditions)),
      ]);

      return { contacts, total: total[0]?.count ?? 0 };
    }),

  getContact: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [contact] = await db
        .select()
        .from(crmContacts)
        .where(and(eq(crmContacts.id, input.id), eq(crmContacts.userId, ctx.userId)));

      if (!contact) throw new Error("Contact not found");

      const activities = await db
        .select()
        .from(crmActivities)
        .where(eq(crmActivities.contactId, input.id))
        .orderBy(desc(crmActivities.createdAt))
        .limit(50);

      const deals = await db
        .select()
        .from(crmDeals)
        .where(and(eq(crmDeals.contactId, input.id), eq(crmDeals.userId, ctx.userId)));

      return { contact, activities, deals };
    }),

  createContact: protectedProcedure
    .input(
      z.object({
        twitterUsername: z.string().optional(),
        twitterDisplayName: z.string().optional(),
        email: z.string().email().optional(),
        status: z.enum(["lead", "prospect", "active", "partner", "archived"]).default("lead"),
        tags: z.array(z.string()).default([]),
        notes: z.string().optional(),
        followerCount: z.number().optional(),
        isInfluencer: z.boolean().default(false),
        isNftCreator: z.boolean().default(false),
        isBtcOrdinals: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = nanoid();

      const [contact] = await db
        .insert(crmContacts)
        .values({
          id,
          userId: ctx.userId,
          twitterUsername: input.twitterUsername,
          twitterDisplayName: input.twitterDisplayName,
          email: input.email,
          status: input.status,
          tags: input.tags,
          notes: input.notes,
          followerCount: input.followerCount ?? 0,
          isInfluencer: input.isInfluencer,
          isNftCreator: input.isNftCreator,
          isBtcOrdinals: input.isBtcOrdinals,
        })
        .returning();

      if (contact) {
        await db.insert(crmActivities).values({
          id: nanoid(),
          userId: ctx.userId,
          contactId: contact.id,
          type: "note",
          title: "Contact created",
          body: `Contact @${input.twitterUsername ?? "unknown"} added to CRM`,
        });
      }

      return contact;
    }),

  updateContact: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        twitterUsername: z.string().optional(),
        twitterDisplayName: z.string().optional(),
        email: z.string().email().optional(),
        status: z.enum(["lead", "prospect", "active", "partner", "archived"]).optional(),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional(),
        followerCount: z.number().optional(),
        isInfluencer: z.boolean().optional(),
        isNftCreator: z.boolean().optional(),
        isBtcOrdinals: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      const [updated] = await db
        .update(crmContacts)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(crmContacts.id, id), eq(crmContacts.userId, ctx.userId)))
        .returning();

      return updated;
    }),

  deleteContact: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db
        .delete(crmContacts)
        .where(and(eq(crmContacts.id, input.id), eq(crmContacts.userId, ctx.userId)));
      return { success: true };
    }),

  // ── Activities ────────────────────────────────────────────────────────────
  addActivity: protectedProcedure
    .input(
      z.object({
        contactId: z.string().optional(),
        dealId: z.string().optional(),
        type: z.string(),
        title: z.string(),
        body: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [activity] = await db
        .insert(crmActivities)
        .values({
          id: nanoid(),
          userId: ctx.userId,
          contactId: input.contactId,
          dealId: input.dealId,
          type: input.type,
          title: input.title,
          body: input.body,
          metadata: input.metadata,
        })
        .returning();

      // Update contact updatedAt
      if (input.contactId) {
        await db
          .update(crmContacts)
          .set({ updatedAt: new Date() })
          .where(and(eq(crmContacts.id, input.contactId), eq(crmContacts.userId, ctx.userId)));
      }

      return activity;
    }),

  // ── Deals ─────────────────────────────────────────────────────────────────
  listDeals: protectedProcedure
    .input(
      z.object({
        status: z.enum(["idea", "outreach", "in_talks", "agreed", "live", "completed", "dead"]).optional(),
        pipelineId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const conditions = [eq(crmDeals.userId, ctx.userId)];
      if (input.status) conditions.push(eq(crmDeals.status, input.status));
      if (input.pipelineId) conditions.push(eq(crmDeals.pipelineId, input.pipelineId));

      return db
        .select()
        .from(crmDeals)
        .where(and(...conditions))
        .orderBy(desc(crmDeals.updatedAt));
    }),

  createDeal: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        contactId: z.string().optional(),
        pipelineId: z.string().optional(),
        value: z.number().optional(), // USD cents
        status: z.enum(["idea", "outreach", "in_talks", "agreed", "live", "completed", "dead"]).default("idea"),
        description: z.string().optional(),
        expectedCloseAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = nanoid();

      const [deal] = await db
        .insert(crmDeals)
        .values({
          id,
          userId: ctx.userId,
          title: input.title,
          contactId: input.contactId,
          pipelineId: input.pipelineId,
          value: input.value,
          status: input.status,
          description: input.description,
          expectedCloseAt: input.expectedCloseAt,
        })
        .returning();

      if (input.contactId && deal) {
        await db.insert(crmActivities).values({
          id: nanoid(),
          userId: ctx.userId,
          contactId: input.contactId,
          dealId: deal.id,
          type: "deal_update",
          title: `Deal created: ${input.title}`,
          body: input.value ? `Value: $${(input.value / 100).toFixed(2)}` : undefined,
        });
      }

      return deal;
    }),

  updateDeal: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        value: z.number().optional(),
        status: z.enum(["idea", "outreach", "in_talks", "agreed", "live", "completed", "dead"]).optional(),
        description: z.string().optional(),
        closedAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, closedAt, ...data } = input;
      const [updated] = await db
        .update(crmDeals)
        .set({ ...data, closedAt, updatedAt: new Date() })
        .where(and(eq(crmDeals.id, id), eq(crmDeals.userId, ctx.userId)))
        .returning();
      return updated;
    }),

  // ── Pipelines ─────────────────────────────────────────────────────────────
  listPipelines: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(crmPipelines)
      .where(eq(crmPipelines.userId, ctx.userId));
  }),

  createPipeline: protectedProcedure
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const [pipeline] = await db
        .insert(crmPipelines)
        .values({
          id: nanoid(),
          userId: ctx.userId,
          name: input.name,
          description: input.description,
        })
        .returning();
      return pipeline;
    }),

  // ── CRM Stats ─────────────────────────────────────────────────────────────
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [contactStats, dealStats] = await Promise.all([
      db
        .select({ status: crmContacts.status, count: count() })
        .from(crmContacts)
        .where(eq(crmContacts.userId, ctx.userId))
        .groupBy(crmContacts.status),
      db
        .select({
          status: crmDeals.status,
          totalValue: sql<number>`sum(coalesce(${crmDeals.value}, 0))`,
          count: count(),
        })
        .from(crmDeals)
        .where(eq(crmDeals.userId, ctx.userId))
        .groupBy(crmDeals.status),
    ]);

    const totalContacts = contactStats.reduce((sum, s) => sum + s.count, 0);
    const totalDealValue = dealStats.reduce((sum, s) => sum + (Number(s.totalValue) ?? 0), 0);
    const activeDealValue = dealStats
      .filter((s) => !["completed", "dead"].includes(s.status))
      .reduce((sum, s) => sum + (Number(s.totalValue) ?? 0), 0);

    return {
      totalContacts,
      contactsByStatus: contactStats,
      totalDealValue: totalDealValue / 100,
      activeDealValue: activeDealValue / 100,
      dealsByStatus: dealStats,
    };
  }),

  // ── Import from Twitter ───────────────────────────────────────────────────
  importFromTwitter: protectedProcedure
    .input(
      z.object({
        handles: z.array(z.string()),
        status: z.enum(["lead", "prospect", "active", "partner", "archived"]).default("lead"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let imported = 0;
      for (const handle of input.handles.slice(0, 100)) {
        try {
          await db.insert(crmContacts).values({
            id: nanoid(),
            userId: ctx.userId,
            twitterUsername: handle.replace("@", ""),
            status: input.status,
          }).onConflictDoNothing();
          imported++;
        } catch {}
      }
      return { imported };
    }),
});
