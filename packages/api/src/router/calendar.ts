import { DayName } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const CalendarData = {
  startDate: z.date().default(new Date()),
  openingTime: z
    .array(
      z.object({
        name: z.nativeEnum(DayName),
        workingHours: z.array(
          z.object({
            opening: z
              .string()
              .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .default("00:00"),
            closing: z
              .string()
              .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .default("23:59"),
          })
        ),
        wholeDay: z.boolean().default(true),
        closed: z.boolean().default(false),
      })
    )
    .length(7),
};

export const calendarRouter = createTRPCRouter({
  getCalendarById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.openingCalendar.findUnique({
        where: { id: input },
        include: { openingTime: { include: { workingHours: true } } },
      });
    }),
  getCalendarForClub: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      const now = new Date();
      const dtNow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      return ctx.prisma.openingCalendar.findFirst({
        where: { clubs: { some: { id: input } }, startDate: { lte: dtNow } },
        orderBy: { startDate: "desc" },
        include: { openingTime: { include: { workingHours: true } } },
      });
    }),
  getCalendarForSite: protectedProcedure
    .input(
      z.object({
        siteId: z.string().cuid(),
        clubId: z.string().cuid(),
        openWithClub: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const dtNow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      const siteCal = await ctx.prisma.openingCalendar.findFirst({
        where: {
          sites: { some: { id: input.siteId } },
          startDate: { lte: dtNow },
        },
        orderBy: { startDate: "desc" },
        include: { openingTime: { include: { workingHours: true } } },
      });
      if (!siteCal) {
        const site = await ctx.prisma.site.findUnique({
          where: { id: input.siteId },
          select: { openWithClub: true },
        });

        if (site?.openWithClub) {
          return ctx.prisma.openingCalendar.findFirst({
            where: {
              clubs: { some: { id: input.clubId } },
              startDate: { lte: dtNow },
            },
            orderBy: { startDate: "desc" },
            include: { openingTime: { include: { workingHours: true } } },
          });
        }
      }
      return siteCal;
    }),
  getCalendarForRoom: protectedProcedure
    .input(
      z.object({
        roomId: z.string().cuid(),
        siteId: z.string().cuid(),
        clubId: z.string().cuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const dtNow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );
      const roomCal = await ctx.prisma.openingCalendar.findFirst({
        where: {
          rooms: { some: { id: input.roomId } },
          startDate: { lte: dtNow },
        },
        orderBy: { startDate: "desc" },
        include: { openingTime: { include: { workingHours: true } } },
      });
      if (!roomCal) {
        const room = await ctx.prisma.room.findUnique({
          where: { id: input.roomId },
          select: { openWithSite: true, openWithClub: true },
        });
        if (room?.openWithSite) {
          const siteCal = await ctx.prisma.openingCalendar.findFirst({
            where: {
              sites: { some: { id: input.siteId } },
              startDate: { lte: dtNow },
            },
            orderBy: { startDate: "desc" },
            include: { openingTime: { include: { workingHours: true } } },
          });
          if (!siteCal) {
            const site = await ctx.prisma.site.findUnique({
              where: { id: input.siteId },
              select: { openWithClub: true },
            });
            if (site?.openWithClub) {
              const clubCal = await ctx.prisma.openingCalendar.findFirst({
                where: {
                  clubs: { some: { id: input.clubId } },
                  startDate: { lte: dtNow },
                },
                orderBy: { startDate: "desc" },
                include: { openingTime: { include: { workingHours: true } } },
              });
              return clubCal;
            }
          }
          return siteCal;
        } else if (room?.openWithClub) {
          const clubCal = await ctx.prisma.openingCalendar.findFirst({
            where: {
              clubs: { some: { id: input.clubId } },
              startDate: { lte: dtNow },
            },
            orderBy: { startDate: "desc" },
            include: { openingTime: { include: { workingHours: true } } },
          });
          return clubCal;
        }
      }

      return roomCal;
    }),
  createCalendar: protectedProcedure
    .input(z.object(CalendarData))
    .mutation(({ ctx, input }) => {
      const createOT = input.openingTime.map((i) => ({
        name: i.name,
        wholeDay: i.wholeDay,
        closed: i.closed,
        workingHours: {
          create: i.workingHours.map((w) => ({
            opening: w.opening,
            closing: w.closing,
          })),
        },
      }));
      return ctx.prisma.openingCalendar.create({
        data: {
          startDate: input.startDate,
          openingTime: {
            create: createOT,
          },
        },
      });
    }),
});
