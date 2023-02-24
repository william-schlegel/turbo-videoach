import { Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createToken, streamchatClient } from "../streamchat";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { getDocUrl } from "./files";

export const clubRouter = createTRPCRouter({
  getClubById: protectedProcedure
    .input(z.string().cuid())
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
      const take: number | undefined = user?.pricing?.features.find(
        (f) => f.feature === "MANAGER_MULTI_SITE",
      )
        ? undefined
        : 1;
      const myClub = await ctx.prisma.club.findUnique({
        where: { id: input },
        include: {
          sites: {
            take,
            include: {
              rooms: {
                include: {
                  activities: true,
                },
              },
            },
          },
          activities: { include: { group: true } },
          logo: true,
        },
      });
      let logoUrl = "";
      if (myClub?.logoId) {
        logoUrl = await getDocUrl(myClub.managerId, myClub.logoId);
      }
      return { ...myClub, logoUrl };
    }),
  getClubPagesForNavByClubId: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const myClub = await ctx.prisma.club.findUnique({
        where: { id: input },
        include: {
          pages: {
            where: { published: true },
            include: {
              sections: true,
            },
          },
        },
      });
      let logoUrl = "";
      if (myClub?.logoId) {
        logoUrl = await getDocUrl(myClub.managerId, myClub.logoId);
      }
      if (!myClub) return { pages: [], logoUrl };
      return {
        managerId: myClub.managerId,
        pages: myClub.pages.map((p) => ({
          id: p.id,
          name: p.name,
          target: p.target,
          sections: p.sections.map((s) => ({
            id: s.id,
            model: s.model,
            title: s.title,
          })),
        })),
        logoUrl,
      };
    }),
  getClubsForManager: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input },
        include: {
          pricing: {
            include: {
              features: true,
            },
          },
        },
      });
      const take = user?.pricing?.features.find(
        (f) => f.feature === "MANAGER_MULTI_CLUB",
      )
        ? undefined
        : 1;
      return ctx.prisma.club.findMany({
        where: { managerId: input },
        orderBy: { name: "asc" },
        take,
      });
    }),
  getAllClubs: publicProcedure.query(({ ctx }) =>
    ctx.prisma.club.findMany({
      orderBy: { name: "asc" },
      include: { activities: { include: { group: true } }, pages: true },
    }),
  ),
  createClub: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        address: z.string(),
        userId: z.string().cuid(),
        searchAddress: z.string(),
        longitude: z.number(),
        latitude: z.number(),
        logoId: z.string().cuid().optional(),
        isSite: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== Role.ADMIN &&
        ctx.session.user.id !== input.userId
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to create a club for this user",
        });

      const club = await ctx.prisma.club.create({
        data: {
          name: input.name,
          address: input.address,
          managerId: input.userId,
          sites: input.isSite
            ? {
                create: {
                  name: input.name,
                  address: input.address,
                  searchAddress: input.searchAddress,
                  longitude: input.longitude,
                  latitude: input.latitude,
                },
              }
            : undefined,
          logoId: input.logoId ? input.logoId : undefined,
        },
      });

      // create the channel for the club

      const channel = streamchatClient.channel("messaging", club.id, {
        name: input.name,
        created_by_id: input.userId,
      });
      await channel.create();

      return club;
    }),
  updateClub: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string(),
        address: z.string(),
        logoId: z.string().cuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const club = await ctx.prisma.club.findFirst({
        where: { id: input.id },
        include: {
          manager: {
            include: {
              user: true,
            },
          },
        },
      });
      if (
        ctx.session.user.role !== Role.ADMIN &&
        ctx.session.user.id !== club?.managerId
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to modify this club",
        });
      const initialLogoId = club?.logoId;
      const data: {
        name: string;
        address: string;
        logoId: string | null;
      } = {
        name: input.name,
        address: input.address,
        logoId: input.logoId,
      };

      const updated = await ctx.prisma.club.update({
        where: { id: input.id },
        data,
      });
      if (initialLogoId && !input.logoId) {
        ctx.prisma.userDocument.delete({ where: { id: initialLogoId } });
      }

      if (club) {
        // create the channel for the club
        let token = club.manager.user.chatToken;
        if (!token) {
          token = createToken(club.managerId);
          await ctx.prisma.user.update({
            where: { id: club.managerId },
            data: { chatToken: token },
          });
        }
        await streamchatClient.connectUser({ id: club.managerId }, token);
        const channel = streamchatClient.channel("messaging", club.id, {
          name: input.name,
          created_by_id: club.managerId,
        });
        await channel.create();
      }
      return updated;
    }),
  updateClubCalendar: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        calendarId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.club.update({
        where: { id: input.id },
        data: {
          calendars: { connect: { id: input.calendarId } },
        },
      });
    }),
  deleteClub: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx, input }) => {
      const club = await ctx.prisma.club.findFirst({
        where: { id: input },
      });
      if (
        ctx.session.user.role !== Role.ADMIN &&
        ctx.session.user.id !== club?.managerId
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to delete this club",
        });
      return ctx.prisma.club.delete({ where: { id: input } });
    }),
  updateClubActivities: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        activities: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const club = await ctx.prisma.club.findFirst({
        where: { id: input.id },
      });
      if (
        ctx.session.user.role !== Role.ADMIN &&
        ctx.session.user.id !== club?.managerId
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to modify this club",
        });

      return ctx.prisma.club.update({
        where: { id: input.id },
        data: {
          activities: { connect: input.activities.map((id) => ({ id })) },
        },
      });
    }),
  updateClubCoach: protectedProcedure
    .input(
      z.object({
        clubId: z.string().cuid(),
        coachUserId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // const club = await ctx.prisma.club.findFirst({
      //   where: { id: input.clubId },
      // });
      // if (
      //   ctx.session.user.role !== Role.ADMIN &&
      //   ctx.session.user.id !== club?.managerId
      // )
      //   throw new TRPCError({
      //     code: "UNAUTHORIZED",
      //     message: "You are not authorized to modify this club",
      //   });

      return ctx.prisma.userCoach.update({
        where: { userId: input.coachUserId },
        data: {
          clubs: {
            connect: {
              id: input.clubId,
            },
          },
        },
      });
    }),
});
