import { NotificationType } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getDocUrl } from "./files";

// export type GetNotificationByIdReturn =
//   | (Omit<UserNotification, "userTo" | "userFrom"> & {
//       userFrom: {
//         name: string;
//         imageUrl: string;
//       };
//       userTo: {
//         name: string;
//         imageUrl: string;
//       };
//     })
//   | null;

export const notificationRouter = createTRPCRouter({
  getNotificationById: protectedProcedure
    .input(
      z.object({
        notificationId: z.string().cuid(),
        updateViewDate: z.boolean().default(true).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      //<GetNotificationByIdReturn>
      const notification = await ctx.prisma.userNotification.findUnique({
        where: { id: input.notificationId },
        include: {
          userFrom: {
            select: {
              id: true,
              name: true,
              image: true,
              profileImageId: true,
            },
          },
          userTo: {
            select: {
              id: true,
              name: true,
              image: true,
              profileImageId: true,
            },
          },
        },
      });
      if (notification && !notification?.viewDate && input.updateViewDate) {
        const updated = await ctx.prisma.userNotification.update({
          where: { id: input.notificationId },
          data: {
            viewDate: new Date(Date.now()),
          },
        });
        notification.viewDate = updated.viewDate;
      }
      let urlFrom = notification?.userFrom?.image;
      if (notification?.userFrom && notification.userFrom.profileImageId)
        urlFrom = await getDocUrl(
          notification.userFrom.id,
          notification.userFrom.profileImageId,
        );
      let urlTo = notification?.userTo?.image;
      if (notification?.userTo && notification.userTo.profileImageId)
        urlTo = await getDocUrl(
          notification.userTo.id,
          notification.userTo.profileImageId,
        );

      if (!notification) return null;
      return {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        viewDate: notification.viewDate,
        date: notification.date,
        data: notification.data,
        answered: notification.answered,
        answer: notification.answer,
        linkedNotification: notification.linkedNotification,
        userFromId: notification.userFromId,
        userToId: notification.userToId,
        userFrom: {
          name: notification.userFrom.name ?? "",
          imageUrl: urlFrom ?? "/images/dummy?jpg",
        },
        userTo: {
          name: notification.userTo.name ?? "",
          imageUrl: urlTo ?? "/images/dummy?jpg",
        },
      };
    }),
  updateNotification: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        answered: z.date(),
        answer: z.string(),
        linkedNotification: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.userNotification.update({
        where: { id: input.id },
        data: {
          answered: input.answered,
          answer: input.answer,
          linkedNotification: input.linkedNotification,
        },
      }),
    ),
  getNotificationFromUser: protectedProcedure
    .input(
      z.object({
        userFromId: z.string().cuid(),
        take: z.number().default(10),
        skip: z.number().default(0),
        unreadOnly: z.boolean().default(false),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.userNotification.findMany({
        where: { userFromId: input.userFromId },
        take: input.take,
        skip: input.skip,
      }),
    ),
  getNotificationToUser: protectedProcedure
    .input(
      z.object({
        userToId: z.string().cuid().optional(),
        userFromId: z.string().cuid().optional(),
        take: z.number().default(10).optional(),
        skip: z.number().default(0).optional(),
        unreadOnly: z.boolean().default(false).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const total = await ctx.prisma.userNotification.count({
        where: { userToId: input.userToId, userFromId: input.userFromId },
      });
      const unread = await ctx.prisma.userNotification.count({
        where: {
          userToId: input.userToId,
          userFromId: input.userFromId,
          viewDate: null,
        },
      });
      const notifications = await ctx.prisma.userNotification.findMany({
        where: { userToId: input.userToId, userFromId: input.userFromId },
        take: input.take,
        skip: input.skip,
        orderBy: { date: "desc" },
      });
      return { notifications, unread, total };
    }),
  createNotificationToUsers: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(NotificationType),
        from: z.string().cuid(),
        to: z.array(z.string().cuid()),
        message: z.string(),
        data: z.string().optional(),
        linkedNotification: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = input.data ? JSON.parse(input.data) : {};
      return ctx.prisma.userNotification.createMany({
        data: input.to.map((to) => ({
          type: input.type,
          userFromId: input.from,
          userToId: to,
          message: input.message,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data,
          linkedNotification: input.linkedNotification,
        })),
      });
    }),
  createNotificationToUser: protectedProcedure
    .input(
      z.object({
        type: z.nativeEnum(NotificationType),
        from: z.string().cuid(),
        to: z.string().cuid(),
        message: z.string(),
        data: z.string().optional(),
        linkedNotification: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = input.data ? JSON.parse(input.data) : {};
      return ctx.prisma.userNotification.create({
        data: {
          type: input.type,
          userFromId: input.from,
          userToId: input.to,
          message: input.message,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data,
          linkedNotification: input.linkedNotification,
        },
      });
    }),
});
