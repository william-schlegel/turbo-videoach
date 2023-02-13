import { RoomReservation } from "@prisma/client";
import { z } from "zod";
import { LATITUDE, LONGITUDE } from "../lib/defaultValues";
import { calculateBBox, calculateDistance } from "../lib/distance";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const SiteObject = z.object({
  id: z.string().cuid(),
  clubId: z.string().cuid(),
  name: z.string(),
  address: z.string(),
  searchAddress: z.string(),
  longitude: z.number(),
  latitude: z.number(),
});

const RoomObject = z.object({
  id: z.string().cuid(),
  siteId: z.string().cuid(),
  name: z.string(),
  reservation: z.nativeEnum(RoomReservation),
  capacity: z.number(),
  unavailable: z.boolean(),
  openWithClub: z.boolean().default(true),
  openWithSite: z.boolean().default(true),
});

export const siteRouter = createTRPCRouter({
  getSiteById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.site.findUnique({
        where: { id: input },
        include: { rooms: true },
      });
    }),
  getSitesForClub: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          pricing: {
            include: {
              features: true,
            },
          },
        },
      });
      const take = user?.pricing?.features.find(
        (f) => f.feature === "MANAGER_MULTI_SITE",
      )
        ? undefined
        : 1;

      return ctx.prisma.site.findMany({
        where: { clubId: input },
        include: { rooms: true },
        orderBy: { name: "asc" },
        take,
      });
    }),
  createSite: protectedProcedure
    .input(SiteObject.omit({ id: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.site.create({
        data: {
          clubId: input.clubId,
          name: input.name,
          address: input.address,
          searchAddress: input.searchAddress,
          longitude: input.longitude,
          latitude: input.latitude,
        },
      }),
    ),
  updateSite: protectedProcedure
    .input(SiteObject.partial())
    .mutation(({ ctx, input }) => {
      return ctx.prisma.site.update({
        where: { id: input.id },
        data: {
          name: input.name,
          address: input.address,
          searchAddress: input.searchAddress,
          longitude: input.longitude,
          latitude: input.latitude,
        },
      });
    }),
  updateSiteCalendar: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        calendarId: z.string().cuid(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.site.update({
        where: { id: input.id },
        data: {
          calendars: { connect: { id: input.calendarId } },
        },
      }),
    ),
  deleteSite: protectedProcedure
    .input(z.string().cuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.site.delete({ where: { id: input } }),
    ),
  /**  ------------------- ROOMS -------------------- **/
  getRoomById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.room.findUnique({
        where: { id: input },
      });
    }),
  getRoomsForSite: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      // check user rights
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          pricing: {
            include: {
              features: true,
            },
          },
        },
      });
      if (!user?.pricing?.features.find((f) => f.feature === "MANAGER_ROOM"))
        return [];

      return ctx.prisma.room.findMany({
        where: { siteId: input },
        orderBy: { name: "asc" },
      });
    }),

  createRoom: protectedProcedure
    .input(RoomObject.omit({ id: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.room.create({
        data: { ...input },
      }),
    ),
  updateRoom: protectedProcedure
    .input(RoomObject.partial())
    .mutation(({ ctx, input }) => {
      return ctx.prisma.room.update({
        where: { id: input.id },
        data: input,
      });
    }),
  deleteRoom: protectedProcedure
    .input(z.string().cuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.room.delete({ where: { id: input } }),
    ),
  updateRoomCalendar: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        openWithClub: z.boolean().optional(),
        openWithSite: z.boolean().optional(),
        calendarId: z.string().cuid().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.room.update({
        where: { id: input.id },
        data: {
          calendars: { connect: { id: input.calendarId } },
        },
      }),
    ),
  getSitesFromDistance: publicProcedure
    .input(
      z.object({
        locationLng: z.number().default(LONGITUDE),
        locationLat: z.number().default(LATITUDE),
        range: z.number().max(100).default(25),
      }),
    )
    .query(async ({ input, ctx }) => {
      const bbox = calculateBBox(
        input.locationLng,
        input.locationLat,
        input.range,
      );
      const sites = await ctx.prisma.site.findMany({
        where: {
          AND: [
            { longitude: { gte: bbox?.[0]?.[0] ?? LONGITUDE } },
            { longitude: { lte: bbox?.[1]?.[0] ?? LONGITUDE } },
            { latitude: { gte: bbox?.[1]?.[1] ?? LATITUDE } },
            { latitude: { lte: bbox?.[0]?.[1] ?? LATITUDE } },
          ],
        },
        include: {
          club: {
            include: { activities: { include: { group: true } }, pages: true },
          },
        },
      });
      return sites
        .map((site) => ({
          ...site,
          distance: calculateDistance(
            input.locationLng,
            input.locationLat,
            site.longitude,
            site.latitude,
          ),
        }))
        .filter((c) => c.distance <= input.range);
    }),
});
