import { TRPCError } from "@trpc/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";
import { createToken, streamchatClient } from "../streamchat";
import { getDocUrl } from "./files";
import bcrypt from "bcrypt";

const UserFilter = z
  .object({
    name: z.string(),
    email: z.string(),
    role: z.nativeEnum(Role),
    dueDate: z.date(),
    dateOperation: z.enum(["gt", "lt"]),
  })
  .partial();

type Filter = {
  name?: object;
  email?: object;
  role?: Role;
  dueDate?: object;
};
// Partial<Record<keyof z.infer<typeof UserFilter>, object | Role| string>>;

export const userRouter = createTRPCRouter({
  getUserById: publicProcedure
    .input(z.string().cuid())
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input },
        include: {
          coachData: {
            include: {
              coachingActivities: true,
            },
          },
          pricing: {
            include: {
              features: true,
            },
          },
          paiements: true,
          accounts: true,
        },
      });
      if (user?.id && !user?.chatToken) {
        const token = createToken(user.id);
        user.chatToken = token;
        await ctx.prisma.user.update({
          where: { id: input },
          data: { chatToken: token },
        });
      }
      let profileImageUrl = user?.image ?? "/images/dummy.jpg";
      if (user?.profileImageId) {
        profileImageUrl = await getDocUrl(user.id, user.profileImageId);
      }
      return { ...user, profileImageUrl };
    }),
  getUserSubscriptionsById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      return ctx.prisma.user.findUnique({
        where: { id: input },
        include: {
          memberData: {
            include: {
              subscriptions: {
                include: {
                  activitieGroups: true,
                  activities: true,
                  sites: true,
                  rooms: true,
                  club: true,
                },
              },
            },
          },
        },
      });
    }),
  getReservationsByUserId: protectedProcedure
    .input(z.object({ userId: z.string().cuid(), after: z.date() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.reservation.findMany({
        where: { userId: input.userId, date: { gte: input.after } },
        orderBy: { date: "asc" },
        include: {
          room: true,
          activity: true,
          planningActivity: {
            include: {
              activity: true,
              coach: true,
              room: true,
            },
          },
        },
      });
    }),
  getUserFullById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) => {
      if (ctx.session.user?.role !== Role.ADMIN)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only an admin user can acceed full",
        });
      return ctx.prisma.user.findUnique({
        where: { id: input },
        include: {
          pricing: true,
          paiements: true,
          managerData: {
            include: {
              managedClubs: {
                select: { _count: true },
              },
            },
          },
          coachData: {
            include: {
              certifications: true,
              page: true,
              clubs: true,
            },
          },
        },
      });
    }),
  getAllUsers: protectedProcedure
    .input(
      z.object({
        filter: UserFilter,
        skip: z.number(),
        take: z.number(),
      })
    )
    .query(({ ctx, input }) => {
      if (ctx.session.user?.role !== Role.ADMIN)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only an admin user can acceed users",
        });
      const filter: Filter = {};
      if (input.filter?.name) filter.name = { contains: input.filter.name };
      if (input.filter?.email) filter.email = { contains: input.filter.email };
      if (input.filter?.role) filter.role = input.filter.role;
      if (input.filter?.dueDate)
        filter.dueDate = {
          [input.filter.dateOperation ?? "lt"]: input.filter.dueDate,
        };
      return ctx.prisma.$transaction([
        ctx.prisma.user.count({ where: filter }),
        ctx.prisma.user.findMany({
          where: filter,
          take: input.take,
          skip: input.skip,
        }),
      ]);
    }),

  updateUser: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        role: z.nativeEnum(Role).optional(),
        pricingId: z.string().cuid().optional(),
        monthlyPayment: z.boolean().optional(),
        cancelationDate: z.date().optional(),
        profileImageId: z.string().optional(),
        // coach data
        longitude: z.number().optional(),
        latitude: z.number().optional(),
        searchAddress: z.string().optional(),
        range: z.number().min(0).max(100).optional(),
        description: z.string().optional(),
        publicName: z.string().optional(),
        aboutMe: z.string().optional(),
        coachingActivities: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.role === Role.ADMIN && ctx.session.user?.role !== Role.ADMIN)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only an admin user can give admin access",
        });
      if (input.role === Role.COACH || input.role === Role.MANAGER_COACH) {
        await ctx.prisma.coachingActivity.deleteMany({
          where: { coachId: input.id },
        });
        await ctx.prisma.userCoach.upsert({
          where: { userId: input.id },
          update: {
            longitude: input.longitude,
            latitude: input.latitude,
            searchAddress: input.searchAddress,
            range: input.range,
            publicName: input.publicName,
            aboutMe: input.aboutMe,
            description: input.description,
            coachingActivities: Array.isArray(input.coachingActivities)
              ? {
                  create: input.coachingActivities?.map((a) => ({ name: a })),
                }
              : undefined,
          },
          create: {
            userId: input.id,
            longitude: input.longitude,
            latitude: input.latitude,
            searchAddress: input.searchAddress,
            range: input.range,
            publicName: input.publicName,
            aboutMe: input.aboutMe,
            description: input.description,
            coachingActivities: Array.isArray(input.coachingActivities)
              ? {
                  create: input.coachingActivities?.map((a) => ({ name: a })),
                }
              : undefined,
          },
        });
      }

      // update role in stream chat if admin
      if (input.role === "ADMIN") {
        await streamchatClient.partialUpdateUser({
          id: input.id,
          set: { role: "admin" },
        });
      }

      return ctx.prisma.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: input.address,
          role: input.role,
          profileImageId: input.profileImageId,
          pricingId: input.pricingId,
          monthlyPayment: input.monthlyPayment,
          cancelationDate: input.cancelationDate,
        },
      });
    }),
  deleteUser: protectedProcedure
    .input(z.string())
    .mutation(({ ctx, input }) => {
      if (ctx.session.user?.role !== Role.ADMIN)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only an admin user can delete a user",
        });
      return ctx.prisma.user.delete({ where: { id: input } });
    }),
  updatePaymentPeriod: protectedProcedure
    .input(z.object({ userId: z.string().cuid(), monthlyPayment: z.boolean() }))
    .mutation(({ ctx, input }) => {
      if (
        ctx.session.user?.id !== input.userId &&
        ctx.session.user?.role !== Role.ADMIN
      )
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Only an admin or actual user can change periodicity",
        });
      return ctx.prisma.user.update({
        where: { id: input.userId },
        data: { monthlyPayment: input.monthlyPayment },
      });
    }),
  addSubscriptionWithValidation: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        subscriptionId: z.string().cuid(),
        monthly: z.boolean().default(true),
        online: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // notify the club manager
      const sub = await ctx.prisma.subscription.findUnique({
        where: { id: input.subscriptionId },
        include: { club: true },
      });
      console.log("sub", sub);
      const managerId = sub?.club.managerId;
      console.log("managerId", managerId);
      if (managerId) {
        await ctx.prisma.userNotification.create({
          data: {
            userFromId: input.userId,
            userToId: managerId,
            type: "NEW_SUBSCRIPTION",
            message: "",
            data: {
              subscriptionId: input.subscriptionId,
              monthly: input.monthly,
              online: input.online,
            },
          },
        });
      }
      // const member = await ctx.prisma.userMember.findUnique({
      //   where: { userId: input.userId },
      // });
      // if (!member) {
      //   return ctx.prisma.userMember.create({
      //     data: {
      //       userId: input.userId,
      //       subscriptions: {
      //         connect: {
      //           id: input.subscriptionId,
      //         },
      //       },
      //     },
      //   });
      // }
      // return ctx.prisma.userMember.update({
      //   where: { userId: input.userId },
      //   data: {
      //     subscriptions: {
      //       connect: {
      //         id: input.subscriptionId,
      //       },
      //     },
      //   },
      // });
    }),
  deleteSubscription: protectedProcedure
    .input(
      z.object({ userId: z.string().cuid(), subscriptionId: z.string().cuid() })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.userMember.update({
        where: { userId: input.userId },
        data: {
          subscriptions: {
            disconnect: {
              id: input.subscriptionId,
            },
          },
        },
      })
    ),
  createUserWithCredentials: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // check if user exist with email
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (user)
        throw new TRPCError({
          code: "CONFLICT",
          message: "email already in use",
        });
      // encrypt password
      const encPwd = await bcrypt.hash(input.password, 12);
      // create user
      return ctx.prisma.user.create({
        data: {
          email: input.email,
          password: encPwd,
          name: input.name,
        },
      });
    }),
  getUserByCredentials: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "wrong credentials",
        });
      const pwdOk = await bcrypt.compare(input.password, user.password ?? "");
      if (!pwdOk)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "wrong credentials",
        });
      return user;
    }),
});
