import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { startOfToday } from "date-fns";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const dashboardRouter = createTRPCRouter({
  getManagerDataForUserId: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== Role.ADMIN &&
        ctx.session.user.role !== Role.MANAGER &&
        ctx.session.user.role !== Role.MANAGER_COACH
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You cannot read manager data",
        });
      const clubData = await ctx.prisma.club.findMany({
        where: { managerId: input },
        include: {
          sites: {
            include: { _count: true },
          },
          activities: {
            select: { name: true },
          },
          subscriptions: {
            select: {
              _count: true,
              users: {
                select: {
                  userId: true,
                },
              },
            },
          },
          events: {
            where: {
              startDate: { gte: startOfToday() },
            },
            orderBy: {
              startDate: "asc",
            },
          },
        },
      });

      if (!clubData) return null;
      const memberSet = new Set<string>();
      let members = 0;
      const initialValue = {
        activities: 0,
        subscriptions: 0,
        sites: 0,
        rooms: 0,
      };
      const { activities, subscriptions, sites, rooms } = clubData.reduce(
        (acc, c) => {
          for (const s of c.subscriptions)
            for (const u of s.users) memberSet.add(u.userId);
          acc.subscriptions += c.subscriptions.length;
          acc.sites += c.sites.length;
          acc.rooms += c.sites.reduce((ss, s) => (ss += s._count.rooms), 0);
          acc.activities += c.activities.length;
          return acc;
        },
        initialValue
      );
      members = memberSet.size;

      return {
        clubs: clubData.map((c) => ({
          id: c.id,
          name: c.name,
          events: c.events.map((e) => ({
            id: e.id,
            name: e.name,
            startDate: e.startDate,
          })),
        })),
        clubCount: clubData.length,
        activities,
        subscriptions,
        sites,
        rooms,
        members,
      };
    }),
  getCoachDataForUserId: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== Role.ADMIN &&
        ctx.session.user.role !== Role.COACH &&
        ctx.session.user.role !== Role.MANAGER_COACH
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You cannot read coach data",
        });
      const clubData = await ctx.prisma.user.findUnique({
        where: { id: input },
        include: {
          coachData: {
            include: {
              clubs: true,
              certifications: true,
              activityGroups: true,
              page: true,
              coachingPrices: true,
            },
          },
        },
      });
      return clubData;
    }),
  getAdminData: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== Role.ADMIN)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You are not admin",
      });
    const clubs = await ctx.prisma.club.findMany({
      include: { sites: { include: { _count: true } } },
    });
    const members = await ctx.prisma.user.count()
    const messages = await ctx.prisma.message.count()
    return {
      clubs,
      members,
      messages
    };
  }),
});
