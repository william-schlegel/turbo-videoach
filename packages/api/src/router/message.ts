import { ChannelType, MessageReactionType, Role } from "@acme/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isCUID } from "../lib/checkValidity";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { deleteDocument, getDocUrl } from "./files";

const NB_MESSAGE_PER_PAGE = 20;

type TChannelListItem = {
  id: string;
  name: string;
  imageUrl: string;
  owner: boolean;
  type: ChannelType;
};

type TChannelList = TChannelListItem[];

export const messageRouter = createTRPCRouter({
  getChannelList: protectedProcedure
    .input(z.object({ userId: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const myChannels = await ctx.prisma.messageChannel.findMany({
        where: {
          OR: [
            { ownerId: input.userId },
            {
              users: {
                some: {
                  id: input.userId,
                },
              },
            },
          ],
        },
        include: {
          club: {
            include: {
              logo: {
                select: {
                  userId: true,
                  id: true,
                },
              },
            },
          },
          coach: {
            include: {
              user: {
                select: {
                  id: true,
                  image: true,
                  profileImageId: true,
                },
              },
            },
          },
          groupImage: {
            select: {
              userId: true,
              id: true,
            },
          },
          owner: {
            select: {
              id: true,
              image: true,
              profileImageId: true,
            },
          },
        },
      });
      const channels: TChannelList = [];
      for (const channel of myChannels) {
        let imgUrl = "/images/channel.png";
        if (channel.type === "CLUB") {
          if (channel.club?.logo?.userId && channel.club?.logo?.id) {
            const url = await getDocUrl(
              channel.club.logo.userId,
              channel.club.logo.id,
            );
            if (url) imgUrl = url;
          }
        }
        if (channel.type === "COACH") {
          if (channel.coach?.user?.profileImageId && channel.coach?.user?.id) {
            const url = await getDocUrl(
              channel.coach.user.id,
              channel.coach.user.profileImageId,
            );
            if (url) imgUrl = url;
          } else if (channel.coach?.user.image) {
            imgUrl = channel.coach.user.image;
          }
        }
        if (channel.type === "GROUP") {
          if (channel.groupImage?.id && channel.groupImage.userId) {
            const url = await getDocUrl(
              channel.groupImage.userId,
              channel.groupImage.id,
            );
            if (url) imgUrl = url;
          }
        }
        if (channel.type === "PRIVATE") {
          if (channel.owner?.profileImageId && channel.owner?.id) {
            const url = await getDocUrl(
              channel.owner.id,
              channel.owner.profileImageId,
            );
            if (url) imgUrl = url;
          } else if (channel.owner?.image) {
            imgUrl = channel.owner.image;
          }
        }

        channels.push({
          id: channel.id,
          name: channel.name,
          imageUrl: imgUrl,
          owner: channel.ownerId === input.userId,
          type: channel.type,
        });
      }
      return channels;
    }),
  getMessagesForUser: protectedProcedure
    .input(
      z.object({
        channelId: z.string().cuid(),
        userId: z.string().cuid(),
        page: z.number().default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const messages = await ctx.prisma.message.findMany({
        where: {
          channelId: input.channelId,
        },
        include: {
          reactions: true,
          from: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input.page * NB_MESSAGE_PER_PAGE,
      });
      const messageView = await ctx.prisma.messageView.findFirst({
        where: {
          channelId: input.channelId,
          userId: input.userId,
        },
      });
      const lastView = messageView?.lastView ?? new Date(0);
      return { messages, lastView };
    }),
  getMessageById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.message.findUnique({
        where: {
          id: input,
        },
        include: {
          from: {
            select: {
              name: true,
            },
          },
        },
      }),
    ),
  createMessage: protectedProcedure
    .input(
      z.object({
        from: z.string().cuid(),
        channelId: z.string().cuid(),
        message: z.string(),
        messageRefId: z.string().cuid().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.message.create({
        data: {
          channelId: input.channelId,
          fromId: input.from,
          message: input.message,
          messageRefId: input.messageRefId,
        },
      }),
    ),
  addReaction: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        messageId: z.string().cuid(),
        reaction: z.nativeEnum(MessageReactionType),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.messageReaction.create({
        data: {
          fromId: input.userId,
          messageId: input.messageId,
          reaction: input.reaction,
        },
      }),
    ),
  getGroupById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.messageChannel.findUnique({
        where: { id: input },
        include: {
          users: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ),
  createGroup: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        name: z.string(),
        imageId: z.string().optional(),
        users: z.array(z.string().cuid()),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.messageChannel.create({
        data: {
          name: input.name,
          groupImageId: input.imageId,
          ownerId: input.userId,
          type: "GROUP",
          users: {
            connect: input.users.map((u) => ({ id: u })),
          },
        },
      }),
    ),
  updateGroup: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string(),
        imageId: z.string().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.messageChannel.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          groupImageId: input.imageId,
        },
      }),
    ),
  deleteGroup: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx, input }) => {
      const channel = await ctx.prisma.messageChannel.findUnique({
        where: { id: input },
      });
      if (!channel) return null;
      if (
        ctx.session.user.role !== Role.ADMIN &&
        ctx.session.user.id !== channel?.ownerId
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to delete this channel",
        });
      if (
        channel?.ownerId &&
        channel?.groupImageId &&
        isCUID(channel?.groupImageId)
      )
        await deleteDocument(`${channel.ownerId}/${channel.groupImageId}`);

      return ctx.prisma.messageChannel.delete({ where: { id: input } });
    }),
});
