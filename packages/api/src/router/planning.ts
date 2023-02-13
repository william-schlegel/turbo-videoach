import { isCUID } from "@lib/checkValidity";
import type {
  Activity,
  Club,
  Planning,
  PlanningActivity,
  Room,
  RoomReservation,
  Site,
  UserCoach,
} from "@prisma/client";
import { DayName } from "@prisma/client";
import { getDayName } from "@trpcserver/lib/days";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const planningObject = z.object({
  id: z.string().cuid(),
  clubId: z.string().cuid(),
  startDate: z.date().default(new Date(Date.now())),
  siteId: z.string().cuid().optional(),
  roomId: z.string().cuid().optional(),
  endDate: z.date().optional(),
  name: z.string().optional(),
});

const planningActivityObject = z.object({
  id: z.string().cuid(),
  planningId: z.string().cuid(),
  activityId: z.string().cuid(),
  siteId: z.string().cuid(),
  roomId: z.string().cuid().optional(),
  day: z.nativeEnum(DayName),
  startTime: z.string(),
  duration: z.number(),
  coachId: z.string().cuid().optional(),
});

export const planningRouter = createTRPCRouter({
  getPlanningsForClub: protectedProcedure
    .input(z.string())
    .query(({ ctx, input }) =>
      ctx.prisma.planning.findMany({
        where: { clubId: input },
        orderBy: { startDate: "desc" },
      })
    ),

  getPlanningById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.planning.findUnique({
        where: { id: input },
        include: {
          planningActivities: {
            include: {
              activity: true,
              site: true,
              room: true,
              coach: true,
            },
          },
          site: {
            select: { name: true },
          },
          room: {
            select: { name: true },
          },
        },
      })
    ),
  getPlanningActivityById: protectedProcedure
    .input(z.string().cuid().nullable())
    .query(({ ctx, input }) => {
      if (!input) return null;
      return ctx.prisma.planningActivity.findUnique({
        where: { id: input },
        include: {
          activity: true,
          site: {
            include: { rooms: true },
          },
          room: true,
          coach: true,
        },
      });
    }),
  createPlanningForClub: protectedProcedure
    .input(planningObject.omit({ id: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.planning.create({
        data: input,
      })
    ),
  updatePlanningForClub: protectedProcedure
    .input(planningObject.partial())
    .mutation(({ ctx, input }) =>
      ctx.prisma.planning.update({
        where: { id: input.id },
        data: input,
      })
    ),
  duplicatePlanningForClub: protectedProcedure
    .input(planningObject.partial())
    .mutation(async ({ ctx, input }) => {
      const org = await ctx.prisma.planning.findUnique({
        where: { id: input.id },
        include: { planningActivities: true },
      });
      if (!org) return null;
      return ctx.prisma.planning.create({
        data: {
          clubId: org.clubId,
          name: input.name ?? org.name,
          startDate: input.startDate,
          endDate: input.endDate,
          siteId: org.siteId,
          roomId: org.roomId,
          planningActivities: {
            createMany: {
              data: org.planningActivities.map((pa) => ({
                day: pa.day,
                startTime: pa.startTime,
                duration: pa.duration,
                activityId: pa.activityId,
                coachId: pa.coachId,
                siteId: pa.siteId,
                roomId: pa.roomId,
              })),
            },
          },
        },
      });
    }),
  deletePlanning: protectedProcedure
    .input(z.string())
    .mutation(({ ctx, input }) =>
      ctx.prisma.planning.delete({
        where: { id: input },
      })
    ),
  addPlanningActivity: protectedProcedure
    .input(planningActivityObject.omit({ id: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.planningActivity.create({ data: input })
    ),
  updatePlanningActivity: protectedProcedure
    .input(planningActivityObject.partial())
    .mutation(({ ctx, input }) =>
      ctx.prisma.planningActivity.update({
        where: { id: input.id },
        data: input,
      })
    ),
  deletePlanningActivity: protectedProcedure
    .input(z.string())
    .mutation(({ ctx, input }) =>
      ctx.prisma.planningActivity.delete({
        where: { id: input },
      })
    ),
  getClubDailyPlanning: publicProcedure
    .input(
      z.object({
        clubId: z.string().cuid(),
        day: z.nativeEnum(DayName),
      })
    )
    .query(async ({ ctx, input }) => {
      const planning = await ctx.prisma.planning.findFirst({
        where: {
          clubId: input.clubId,
          startDate: {
            lte: new Date(Date.now()),
          },
        },
        include: {
          club: true,
          planningActivities: {
            where: {
              day: input.day,
            },
            include: {
              activity: true,
              coach: { include: { user: true } },
              room: true,
              site: true,
            },
          },
        },
      });
      // TODO: manage exception days
      return planning;
    }),
  getCoachDailyPlanning: protectedProcedure
    .input(
      z.object({
        coachId: z.string().cuid(),
        day: z.nativeEnum(DayName),
      })
    )
    .query(async ({ ctx, input }) => {
      const planning = await ctx.prisma.planning.findMany({
        where: {
          startDate: {
            lte: new Date(Date.now()),
          },
          planningActivities: {
            some: {
              coachId: input.coachId,
            },
          },
        },
        include: {
          club: true,
          planningActivities: {
            where: {
              day: input.day,
              coachId: input.coachId,
            },
            include: {
              activity: true,
              coach: true,
              room: true,
              site: true,
            },
          },
        },
      });
      // TODO: manage exception days
      return planning;
    }),
  getCoachPlanningForClub: protectedProcedure
    .input(
      z.object({
        coachId: z.string().cuid(),
        clubId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const planning = await ctx.prisma.planning.findFirst({
        where: {
          startDate: {
            lte: new Date(Date.now()),
          },
          clubId: input.clubId,
        },
        include: {
          club: true,
          planningActivities: {
            where: {
              coachId: input.coachId,
            },
            include: {
              activity: true,
              coach: true,
              room: true,
              site: true,
            },
          },
        },
      });
      // TODO: manage exception days
      return planning;
    }),
  getMemberDailyPlanning: protectedProcedure
    .input(
      z.object({
        memberId: z.string().cuid(),
        date: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.memberId },
        include: {
          memberData: {
            include: {
              subscriptions: {
                include: {
                  activitieGroups: true,
                  activities: true,
                  rooms: true,
                  sites: true,
                },
              },
            },
          },
        },
      });
      const clubIds = Array.from(
        new Set(user?.memberData?.subscriptions.map((s) => s.clubId))
      );

      const planningClubs = await ctx.prisma.planning.findMany({
        where: {
          startDate: {
            lte: new Date(Date.now()),
          },
          clubId: {
            in: clubIds,
          },
        },
        include: { club: true },
      });

      const planning: (Planning & {
        club: Club;
        activities: (PlanningActivity & {
          site: Site;
          room: Room | null;
          activity: Activity;
          coach: UserCoach | null;
          reservations: { id: string; date: Date }[];
        })[];
        withNoCalendar: (Activity & {
          rooms: {
            id: string;
            name: string;
            capacity: number;
            reservation: RoomReservation;
          }[];
          reservations: { id: string; date: Date; roomName: string }[];
        })[];
      })[] = [];

      const dayName = getDayName(input.date);

      for (const planningClub of planningClubs) {
        const sub = user?.memberData?.subscriptions.filter(
          (s) => s.clubId === planningClub.clubId
        );

        type TIn = { in: string[] };
        type TFilter = {
          activityId?: TIn;
          activity?: { groupId: TIn };
          siteId?: TIn;
          roomId?: TIn;
        };
        const where: {
          day: DayName;
          planningId: string;
          OR?: TFilter[];
        } = {
          day: dayName,
          planningId: planningClub.id,
        };
        type TFilterNC = {
          id?: TIn;
          groupId?: TIn;
        };

        const whereNoCal: {
          clubId: string;
          noCalendar: boolean;
          OR?: TFilterNC[];
        } = {
          clubId: planningClub.clubId,
          noCalendar: true,
        };

        for (const s of sub ?? []) {
          let fAct: TIn | null = null;
          let fGAct: TIn | null = null;
          let fSite: TIn | null = null;
          let fRoom: TIn | null = null;

          if (s.mode === "ACTIVITY_GROUP")
            fGAct = {
              in: s?.activitieGroups.map((ag) => ag.id),
            };
          if (s.mode === "ACTIVITY")
            fAct = {
              in: s.activities.map((a) => a.id),
            };
          if (s.restriction === "SITE") {
            const sites = s.sites.map((s) => s.id);
            fSite = { in: sites };
          }
          if (s.restriction === "ROOM") {
            const rooms = s.rooms.map((s) => s.id);
            fRoom = { in: rooms };
          }
          const filter: TFilter = {};
          if (fGAct) filter.activity = { groupId: fGAct };
          if (fAct) filter.activityId = fAct;
          if (fSite) filter.siteId = fSite;
          if (fRoom) filter.roomId = fRoom;
          if (Object.keys(filter).length) {
            if (!where.OR) where.OR = [];
            where.OR.push(filter);
          }
          const filterNC: TFilterNC = {};
          if (fGAct) filterNC.groupId = fGAct;
          if (fAct) filterNC.id = fAct;
          if (Object.keys(filterNC).length) {
            if (!whereNoCal.OR) whereNoCal.OR = [];
            whereNoCal.OR.push(filterNC);
          }
        }
        const pa = await ctx.prisma.planningActivity.findMany({
          where,
          include: {
            activity: true,
            coach: true,
            room: true,
            site: true,
            reservations: {
              where: {
                date: { gte: input.date },
              },
            },
          },
        });
        const withNoCalendar = await ctx.prisma.activity.findMany({
          where: whereNoCal,
          include: {
            // sites: { select: { name: true } },
            rooms: {
              select: {
                id: true,
                name: true,
                capacity: true,
                reservation: true,
              },
            },
            reservations: {
              where: {
                date: { gte: input.date },
              },
              include: {
                room: true,
              },
            },
          },
        });
        planning.push({
          ...planningClub,
          activities: pa.map((p) => ({
            ...p,
            reservations: p.reservations
              .filter((r) => isCUID(r.planningActivityId))
              .map((r) => ({ id: r.planningActivityId ?? "", date: r.date })),
          })),
          withNoCalendar: withNoCalendar.map((wnc) => ({
            ...wnc,
            rooms: wnc.rooms ?? [],
            reservations: wnc.reservations
              .filter((r) => isCUID(r.activityId))
              .map((r) => ({
                id: r.activityId ?? "",
                date: r.date,
                roomName: r.room?.name ?? "",
              })),
          })),
        });
      }

      // TODO: manage exception days
      return planning;
    }),
  createPlanningReservation: protectedProcedure
    .input(
      z.object({
        memberId: z.string().cuid(),
        planningActivityId: z.string().cuid(),
        date: z.date(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.reservation.create({
        data: {
          date: input.date,
          planningActivityId: input.planningActivityId,
          userId: input.memberId,
        },
      })
    ),
  deleteReservation: protectedProcedure
    .input(z.string().cuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.reservation.delete({ where: { id: input } })
    ),
  createActivityReservation: protectedProcedure
    .input(
      z.object({
        memberId: z.string().cuid(),
        activityId: z.string().cuid(),
        date: z.date(),
        activitySlot: z.number(),
        roomId: z.string().cuid(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.reservation.create({
        data: {
          date: input.date,
          activityId: input.activityId,
          userId: input.memberId,
          activitySlot: input.activitySlot,
          roomId: input.roomId,
        },
      })
    ),
});
