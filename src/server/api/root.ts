import { createTRPCRouter } from "@/server/api/trpc";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { agentsRouter } from "@/server/api/routers/agents";
import { billingRouter } from "@/server/api/routers/billing";
import { crmRouter } from "@/server/api/routers/crm";
import { contentRouter } from "@/server/api/routers/content";
import { alertsRouter } from "@/server/api/routers/alerts";
import { communityRouter } from "@/server/api/routers/community";
import { settingsRouter } from "@/server/api/routers/settings";

export const appRouter = createTRPCRouter({
  analytics: analyticsRouter,
  agents: agentsRouter,
  billing: billingRouter,
  crm: crmRouter,
  content: contentRouter,
  alerts: alertsRouter,
  community: communityRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
