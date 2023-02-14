import { activityRouter } from "./router/activities";
import { authRouter } from "./router/auth";
import { calendarRouter } from "./router/calendar";
import { clubRouter } from "./router/clubs";
import { coachRouter } from "./router/coachs";
import { dashboardRouter } from "./router/dashboard";
import { eventRouter } from "./router/event";
import { fileRouter } from "./router/files";
import { notificationRouter } from "./router/notification";
import { pageRouter } from "./router/page";
import { planningRouter } from "./router/planning";
import { pricingRouter } from "./router/pricing";
import { siteRouter } from "./router/sites";
import { subscriptionRouter } from "./router/subscription";
import { userRouter } from "./router/users";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  users: userRouter,
  clubs: clubRouter,
  sites: siteRouter,
  activities: activityRouter,
  dashboards: dashboardRouter,
  calendars: calendarRouter,
  pricings: pricingRouter,
  coachs: coachRouter,
  files: fileRouter,
  pages: pageRouter,
  plannings: planningRouter,
  subscriptions: subscriptionRouter,
  events: eventRouter,
  notifications: notificationRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
