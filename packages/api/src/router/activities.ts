import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const activityObject = z.object({
  id: z.string().cuid(),
  name: z.string(),
  noCalendar: z.boolean().default(false),
  reservationDuration: z.number().default(60),
  clubId: z.string().cuid(),
  groupId: z.string().cuid(),
});

export const activityRouter = createTRPCRouter({
  getActivityById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.activity.findUnique({
        where: { id: input },
      });
    }),
  getActivityByName: publicProcedure.input(z.string()).query(({ ctx, input }) =>
    ctx.prisma.activity.findMany({
      where: { name: { contains: input } },
      take: 25,
      include: { _count: true },
    })
  ),
  getActivityGroupById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.activityGroup.findUnique({
        where: { id: input },
      });
    }),
  getActivityGroupsForUser: protectedProcedure
    .input(z.string())
    .query(({ ctx, input }) => {
      return ctx.prisma.activityGroup.findMany({
        where: {
          OR: [{ default: true }, { coachId: input }],
        },
        include: { activities: true },
        orderBy: {
          name: "asc",
        },
      });
    }),
  getAllActivityGroups: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.activityGroup.findMany({
      include: { coach: { include: { user: true } } },
      orderBy: {
        name: "asc",
      },
    });
  }),
  getActivitiesForClub: protectedProcedure
    .input(z.object({ clubId: z.string().cuid(), userId: z.string().cuid() }))
    .query(({ ctx, input }) => {
      if (
        ctx.session.user.role !== Role.ADMIN &&
        ctx.session.user.id !== input.userId
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to query activities from this club",
        });

      return ctx.prisma.club.findUnique({
        where: { id: input.clubId },
        select: {
          activities: true,
        },
      });
    }),
  getAllActivitiesForGroup: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      if (ctx.session.user.role !== Role.ADMIN)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to query activities from this group",
        });

      return ctx.prisma.activity.findMany({
        where: { groupId: input },
        include: {
          club: { select: { name: true } },
        },
      });
    }),
  getAllClubsForGroup: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      if (ctx.session.user.role !== Role.ADMIN)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to query activities from this group",
        });

      return ctx.prisma.activity.findMany({
        where: { club: { activities: { some: { groupId: input } } } },
        distinct: "clubId",
        select: {
          club: { select: { name: true, id: true, _count: true } },
        },
      });
    }),
  createActivity: protectedProcedure
    .input(activityObject.omit({ id: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.activity.create({
        data: input,
      })
    ),
  updateActivity: protectedProcedure
    .input(activityObject.partial())
    .mutation(({ ctx, input }) =>
      ctx.prisma.activity.update({
        where: { id: input.id },
        data: input,
      })
    ),
  deleteActivity: protectedProcedure
    .input(
      z.object({
        activityId: z.string().cuid(),
        clubId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.activity.delete({ where: { id: input.activityId } })
    ),
  createGroup: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        userId: z.string().cuid().optional().nullable(),
        default: z.boolean().optional().default(false),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.activityGroup.create({
        data: {
          name: input.name,
          coachId: input.userId,
          default: input.default,
        },
      })
    ),
  updateGroup: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string(),
        default: z.boolean().optional().default(false),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.activityGroup.update({
        where: { id: input.id },
        data: {
          name: input.name,
          default: input.default,
        },
      })
    ),
  deleteGroup: protectedProcedure
    .input(
      z.object({
        groupId: z.string().cuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const group = await ctx.prisma.activityGroup.findUnique({
        where: { id: input.groupId },
      });
      if (
        ctx.session.user.role !== Role.ADMIN &&
        ctx.session.user.id !== group?.coachId
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to delete this group",
        });

      return ctx.prisma.activityGroup.delete({ where: { id: input.groupId } });
    }),
  affectToRoom: protectedProcedure
    .input(
      z.object({
        roomId: z.string().cuid(),
        activityId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.activity.update({
        where: { id: input.activityId },
        data: {
          rooms: {
            connect: { id: input.roomId },
          },
        },
      })
    ),
  removeFromRoom: protectedProcedure
    .input(
      z.object({
        roomId: z.string().cuid(),
        activityId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.activity.update({
        where: { id: input.activityId },
        data: {
          rooms: {
            disconnect: { id: input.roomId },
          },
        },
      })
    ),
});
