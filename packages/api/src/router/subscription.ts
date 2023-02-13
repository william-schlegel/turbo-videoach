import type { Activity, ActivityGroup } from "@prisma/client";
import { SubscriptionMode, SubscriptionRestriction } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const subscriptionObject = z.object({
  id: z.string().cuid(),
  name: z.string(),
  highlight: z.string(),
  description: z.string(),
  startDate: z.date(),
  monthly: z.number(),
  yearly: z.number(),
  cancelationFee: z.number(),
  clubId: z.string().cuid(),
  mode: z.nativeEnum(SubscriptionMode),
  restriction: z.nativeEnum(SubscriptionRestriction),
});

export const subscriptionRouter = createTRPCRouter({
  getSubscriptionById: publicProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.subscription.findUnique({
        where: { id: input },
        include: {
          sites: true,
          rooms: true,
          activities: true,
          activitieGroups: true,
          users: true,
        },
      });
    }),
  getSubscriptionsForClub: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.subscription.findMany({
        where: { clubId: input },
        orderBy: { startDate: "desc" },
      });
    }),
  createSubscription: protectedProcedure
    .input(subscriptionObject.omit({ id: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.subscription.create({
        data: input,
      })
    ),
  updateSubscription: protectedProcedure
    .input(subscriptionObject.partial())
    .mutation(({ ctx, input }) => {
      return ctx.prisma.subscription.update({
        where: { id: input.id },
        data: input,
      });
    }),
  updateSubscriptionSelection: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string().cuid(),
        sites: z.array(z.string().cuid()),
        rooms: z.array(z.string().cuid()),
        activityGroups: z.array(z.string().cuid()),
        activities: z.array(z.string().cuid()),
      })
    )
    .mutation(({ ctx, input }) => {
      return ctx.prisma.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          sites: { connect: input.sites.map((id) => ({ id })) },
          rooms: { connect: input.rooms.map((id) => ({ id })) },
          activitieGroups: {
            connect: input.activityGroups.map((id) => ({ id })),
          },
          activities: { connect: input.activities.map((id) => ({ id })) },
        },
      });
    }),
  deleteSubscription: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.prisma.subscription.findUnique({
        where: { id: input },
        include: { users: { select: { id: true } } },
      });
      if (!sub)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `unknown subscription ${input}`,
        });
      if (sub.users.length > 0) {
        return ctx.prisma.subscription.update({
          where: { id: input },
          data: {
            deletionDate: new Date(Date.now()),
          },
        });
      } else {
        return ctx.prisma.subscription.delete({ where: { id: input } });
      }
    }),
  getPossibleChoice: protectedProcedure
    .input(
      z.object({
        clubId: z.string().cuid(),
        mode: z.nativeEnum(SubscriptionMode),
        restriction: z.nativeEnum(SubscriptionRestriction),
        siteIds: z.array(z.string().cuid()),
        roomIds: z.array(z.string().cuid()),
      })
    )
    .query(async ({ ctx, input }) => {
      if (input.mode === "ACTIVITY_GROUP") {
        if (input.restriction === "CLUB") {
          const club = await ctx.prisma.club.findUnique({
            where: { id: input.clubId },
            include: {
              activities: {
                include: {
                  group: true,
                },
              },
            },
          });
          const activityGroups = new Map<string, ActivityGroup>();
          for (const activity of club?.activities ?? [])
            activityGroups.set(activity.groupId, activity.group);

          return { activityGroups: Array.from(activityGroups.values()) };
        }
        if (input.restriction === "SITE") {
          const sites = await ctx.prisma.site.findMany({
            where: { id: { in: input.siteIds } },
            include: {
              rooms: {
                include: {
                  activities: {
                    include: {
                      group: true,
                    },
                  },
                },
              },
            },
          });
          const activityGroups = new Map<string, ActivityGroup>();
          for (const site of sites)
            for (const room of site.rooms)
              for (const activity of room.activities)
                activityGroups.set(activity.groupId, activity.group);

          return { activityGroups: Array.from(activityGroups.values()) };
        }

        if (input.restriction === "ROOM") {
          const rooms = await ctx.prisma.room.findMany({
            where: { id: { in: input.roomIds } },
            include: {
              activities: {
                include: {
                  group: true,
                },
              },
            },
          });
          const activityGroups = new Map<string, ActivityGroup>();
          for (const room of rooms)
            for (const activity of room.activities)
              activityGroups.set(activity.groupId, activity.group);

          return { activityGroups: Array.from(activityGroups.values()) };
        }
      }
      if (input.mode === "ACTIVITY") {
        if (input.restriction === "CLUB") {
          const activities = await ctx.prisma.activity.findMany({
            where: { clubId: input.clubId },
          });
          return { activities };
        }
        if (input.restriction === "SITE") {
          const sites = await ctx.prisma.site.findMany({
            where: { id: { in: input.siteIds } },
            include: {
              rooms: {
                include: {
                  activities: true,
                },
              },
            },
          });
          const activities = new Map<string, Activity>();
          for (const site of sites)
            for (const room of site.rooms)
              for (const activity of room.activities)
                activities.set(activity.id, activity);
          return { activities: Array.from(activities.values()) };
        }
        if (input.restriction === "ROOM") {
          const rooms = await ctx.prisma.room.findMany({
            where: { id: { in: input.roomIds } },
            include: {
              activities: true,
            },
          });
          const activities = new Map<string, Activity>();
          for (const room of rooms)
            for (const activity of room.activities)
              activities.set(activity.id, activity);
          return { activities: Array.from(activities.values()) };
        }
      }
      return {};
    }),
  getDataNames: publicProcedure
    .input(
      z.object({
        siteIds: z.array(z.string().cuid()),
        roomIds: z.array(z.string().cuid()),
        activityGroupIds: z.array(z.string().cuid()),
        activityIds: z.array(z.string().cuid()),
      })
    )
    .query(async ({ ctx, input }) => {
      const sites = await ctx.prisma.site.findMany({
        where: { id: { in: input.siteIds } },
        select: { id: true, name: true },
      });
      const rooms = await ctx.prisma.room.findMany({
        where: { id: { in: input.roomIds } },
        select: { id: true, name: true },
      });
      const activityGroups = await ctx.prisma.activityGroup.findMany({
        where: { id: { in: input.activityGroupIds } },
        select: { id: true, name: true },
      });
      const activities = await ctx.prisma.activity.findMany({
        where: { id: { in: input.activityIds } },
        select: { id: true, name: true },
      });
      return { sites, rooms, activityGroups, activities };
    }),
});
