import { CoachingLevelList, CoachingTarget, Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { LATITUDE, LONGITUDE } from "../lib/defaultValues";
import { calculateBBox, calculateDistance } from "../lib/distance";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { getDocUrl } from "./files";

const CertificationData = z.object({
  id: z.string().cuid(),
  name: z.string(),
  obtainedIn: z.date(),
  documentId: z.string().cuid().optional(),
  userId: z.string().cuid(),
  modules: z.array(z.string().cuid()),
  activityGroups: z.array(z.string().cuid()),
});

const OfferData = z.object({
  coachId: z.string().cuid(),
  id: z.string().cuid(),
  name: z.string(),
  target: z.nativeEnum(CoachingTarget),
  excludingTaxes: z.boolean(),
  description: z.string(),
  startDate: z.date(),
  physical: z.boolean().default(false),
  inHouse: z.boolean().default(false),
  myPlace: z.boolean().default(false),
  publicPlace: z.boolean().default(false),
  perHourPhysical: z.number().min(0),
  perDayPhysical: z.number().min(0),
  travelFee: z.number().min(0),
  travelLimit: z.number().min(0),
  webcam: z.boolean().default(false),
  perHourWebcam: z.number().min(0),
  perDayWebcam: z.number().min(0),
  freeHours: z.number().min(0),
  levels: z.array(z.nativeEnum(CoachingLevelList)),
  packs: z.array(
    z.object({
      nbHours: z.number().min(0),
      packPrice: z.number().min(0),
    }),
  ),
});

export const coachRouter = createTRPCRouter({
  getCoachById: protectedProcedure
    .input(z.string().cuid())
    .query(async ({ ctx, input }) => {
      const coach = await ctx.prisma.user.findUnique({
        where: { id: input },
        include: {
          coachData: {
            include: {
              activityGroups: {
                include: {
                  activities: true,
                },
              },
              certifications: {
                include: {
                  modules: true,
                  document: true,
                },
              },
              clubs: true,
              page: { select: { id: true } },
            },
          },
        },
      });
      const imageData = await ctx.prisma.page.findFirst({
        where: {
          coachId: coach?.id,
          target: "HOME",
          sections: {
            some: {
              model: "HERO",
              elements: { some: { elementType: "HERO_CONTENT" } },
            },
          },
        },
        select: {
          sections: { select: { elements: { select: { images: true } } } },
        },
      });
      const imgData = imageData?.sections[0]?.elements[0]?.images[0];
      let imageUrl = coach?.image;
      if (imgData) {
        imageUrl = await getDocUrl(imgData.userId, imgData.id);
      }
      return { ...coach, imageUrl: imageUrl ?? "/images/dummy.jpg" };
    }),
  getCoachsFromDistance: publicProcedure
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
      const coachs = await ctx.prisma.userCoach.findMany({
        where: {
          AND: [
            { longitude: { gte: bbox?.[0]?.[0] ?? LONGITUDE } },
            { longitude: { lte: bbox?.[1]?.[0] ?? LONGITUDE } },
            { latitude: { gte: bbox?.[1]?.[1] ?? LATITUDE } },
            { latitude: { lte: bbox?.[0]?.[1] ?? LATITUDE } },
          ],
        },
        include: { page: true, certifications: true, coachingActivities: true },
      });
      return coachs
        .map((coach) => ({
          ...coach,
          distance: calculateDistance(
            input.locationLng,
            input.locationLat,
            coach.longitude,
            coach.latitude,
          ),
        }))
        .filter((c) => c.distance <= input.range && c.distance <= c.range);
    }),
  createCertification: protectedProcedure
    .input(CertificationData.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const certif = await ctx.prisma.certification.create({
        data: {
          name: input.name,
          obtainedIn: input.obtainedIn,
          coach: {
            connect: {
              userId: input.userId,
            },
          },
          modules: {
            connect: input.modules.map((m) => ({ id: m })),
          },
          activityGroups: {
            connect: input.activityGroups.map((a) => ({ id: a })),
          },
        },
      });
      if (input.documentId) {
        await ctx.prisma.certification.update({
          where: { id: certif.id },
          data: {
            document: {
              connect: {
                id: input.documentId,
              },
            },
          },
        });
      }
      return certif;
    }),
  updateCertification: protectedProcedure
    .input(CertificationData.partial())
    .mutation(({ ctx, input }) =>
      ctx.prisma.certification.update({
        where: { id: input.id },
        data: {
          name: input.name,
          obtainedIn: input.obtainedIn,
          coachId: input.userId,
          modules: input.modules
            ? {
                connect: input.modules.map((m) => ({ id: m })),
              }
            : undefined,
          activityGroups: input.activityGroups
            ? {
                connect: input.activityGroups.map((a) => ({ id: a })),
              }
            : undefined,
        },
      }),
    ),
  deleteCertification: protectedProcedure
    .input(z.string())
    .mutation(({ ctx, input }) =>
      ctx.prisma.certification.delete({ where: { id: input } }),
    ),
  getAllCoachs: publicProcedure.query(({ ctx }) =>
    ctx.prisma.user.findMany({
      where: { role: { in: ["COACH", "MANAGER_COACH"] } },
      include: {
        coachData: {
          include: {
            certifications: true,
            page: true,
          },
        },
      },
    }),
  ),
  getCoachsForClub: publicProcedure
    .input(z.string().cuid())
    .query(async ({ input, ctx }) => {
      const club = await ctx.prisma.club.findUnique({
        where: { id: input },
        include: {
          coachs: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      return club?.coachs.map((c) => c.user) ?? [];
    }),

  getCertificationsForCoach: protectedProcedure
    .input(z.string())
    .query(({ ctx, input }) =>
      ctx.prisma.userCoach.findUnique({
        where: { userId: input },
        include: {
          certifications: {
            include: {
              modules: true,
              activityGroups: true,
            },
          },
        },
      }),
    ),
  getCertificationById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.certification.findUnique({
        where: { id: input },
        include: {
          activityGroups: true,
          modules: true,
        },
      }),
    ),
  getCertificationGroups: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.certificationGroup.findMany({
      include: { modules: { include: { activityGroups: true } } },
    }),
  ),
  getCertificationGroupById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.certificationGroup.findUnique({
        where: {
          id: input,
        },
        include: { modules: { include: { activityGroups: true } } },
      }),
    ),
  createGroup: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        modules: z.array(
          z.object({
            name: z.string(),
            activityIds: z.array(z.string().cuid()),
          }),
        ),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.$transaction(async (tx) => {
        const group = await tx.certificationGroup.create({
          data: {
            name: input.name,
          },
        });
        for (const mod of input.modules) {
          await tx.certificationModule.create({
            data: {
              name: mod.name,
              certificationGroupId: group.id,
              activityGroups: {
                connect: mod.activityIds.map((id) => ({ id })),
              },
            },
          });
        }
        return group;
      }),
    ),
  updateGroup: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.certificationGroup.update({
        where: { id: input.id },
        data: {
          name: input.name,
        },
      }),
    ),
  updateActivitiesForModule: protectedProcedure
    .input(
      z.object({
        moduleId: z.string().cuid(),
        activityIds: z.array(z.string().cuid()),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.certificationModule.update({
        where: { id: input.moduleId },
        data: {
          activityGroups: {
            connect: input.activityIds.map((a) => ({ id: a })),
          },
        },
      }),
    ),

  deleteGroup: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== Role.ADMIN)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not authorized to delete this group",
        });

      return ctx.prisma.certificationGroup.delete({
        where: { id: input },
      });
    }),
  createModule: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        groupId: z.string().cuid(),
        activityIds: z.array(z.string().cuid()),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.certificationModule.create({
        data: {
          name: input.name,
          certificationGroupId: input.groupId,
          activityGroups: {
            connect: input.activityIds.map((id) => ({ id })),
          },
        },
      }),
    ),
  updateModule: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string(),
        activityIds: z.array(z.string().cuid()),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.certificationModule.update({
        where: { id: input.id },
        data: {
          name: input.name,
          activityGroups: {
            connect: input.activityIds.map((id) => ({ id })),
          },
        },
      }),
    ),
  deleteModule: protectedProcedure
    .input(z.string().cuid())
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.certificationModule.delete({
        where: { id: input },
      });
    }),
  getCoachData: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.userCoach.findUnique({
        where: { userId: input },
        include: {
          coachingActivities: true,
          coachingPrices: {
            include: {
              packs: true,
              coachingLevel: true,
            },
          },
        },
      }),
    ),
  getOfferById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.coachingPrice.findUnique({
        where: { id: input },
        include: {
          packs: true,
          coachingLevel: true,
        },
      }),
    ),
  getOffersForCompanies: publicProcedure
    .input(
      z.object({
        locationLng: z.number().default(LONGITUDE),
        locationLat: z.number().default(LATITUDE),
        activityName: z.string().optional(),
        range: z.number().max(100).default(25),
        priceMin: z.number().min(0).default(0),
        priceMax: z.number().max(1000).default(1000),
      }),
    )
    .query(({ input, ctx }) => {
      const bbox = calculateBBox(
        input.locationLng,
        input.locationLat,
        input.range,
      );
      return ctx.prisma.coachingPrice.findMany({
        where: {
          target: "COMPANY",
          coach: {
            coachingActivities: input?.activityName
              ? {
                  some: { name: { contains: input.activityName } },
                }
              : undefined,
            AND: [
              { longitude: { gte: bbox?.[0]?.[0] ?? LONGITUDE } },
              { longitude: { lte: bbox?.[1]?.[0] ?? LONGITUDE } },
              { latitude: { gte: bbox?.[1]?.[1] ?? LATITUDE } },
              { latitude: { lte: bbox?.[0]?.[1] ?? LATITUDE } },
            ],
          },
          AND: [
            { perHourPhysical: { gte: input.priceMin } },
            { perHourPhysical: { lte: input.priceMax } },
          ],
        },
      });
    }),
  getOfferWithDetails: publicProcedure
    .input(z.string().cuid())
    .query(async ({ ctx, input }) => {
      const offer = await ctx.prisma.coachingPrice.findUnique({
        where: {
          id: input,
        },
        include: {
          coach: {
            include: {
              page: {
                include: {
                  sections: {
                    include: {
                      elements: {
                        include: {
                          images: true,
                        },
                      },
                    },
                  },
                },
              },
              user: true,
              coachingActivities: true,
            },
          },
          coachingLevel: true,
          packs: true,
        },
      });
      const pageImage =
        offer?.coach.page?.sections?.[0]?.elements?.[0]?.images?.[0]?.id;
      let imageUrl = offer?.coach.user.image ?? "/images/dummy.jpg";
      if (pageImage) {
        const img = await getDocUrl(offer?.coach.user.id, pageImage);
        if (img) imageUrl = img;
      }
      return { ...offer, imageUrl };
    }),
  getCoachOffers: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.coachingPrice.findMany({
        where: { coachId: input },
        include: {
          coachingLevel: true,
        },
      }),
    ),
  createCoachOffer: protectedProcedure
    .input(OfferData.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const pricing = await ctx.prisma.pricing.findFirst({
        where: {
          users: {
            some: {
              id: input.coachId,
            },
          },
        },
        include: {
          features: true,
        },
      });
      const target: CoachingTarget = pricing?.features.find(
        (f) => f.feature === "COACH_OFFER_COMPANY",
      )
        ? input.target
        : "INDIVIDUAL";
      return ctx.prisma.coachingPrice.create({
        data: {
          name: input.name,
          description: input.description,
          target,
          excludingTaxes: input.excludingTaxes,
          coachId: input.coachId,
          inHouse: input.inHouse,
          physical: input.physical,
          myPlace: input.myPlace,
          publicPlace: input.publicPlace,
          startDate: input.startDate,
          webcam: input.webcam,
          freeHours: input.freeHours,
          perDayPhysical: input.perDayPhysical,
          perDayWebcam: input.perDayWebcam,
          perHourPhysical: input.perHourPhysical,
          perHourWebcam: input.perHourWebcam,
          travelFee: input.travelFee,
          travelLimit: input.travelLimit,
          packs: {
            createMany: {
              data: input.packs.map((pack) => ({
                nbHours: pack.nbHours,
                packPrice: pack.packPrice,
              })),
            },
          },
          coachingLevel: {
            createMany: {
              data: input.levels.map((level) => ({
                level,
              })),
            },
          },
        },
      });
    }),
  updateCoachOffer: protectedProcedure
    .input(OfferData.partial())
    .mutation(async ({ ctx, input }) => {
      const pricing = await ctx.prisma.pricing.findFirst({
        where: {
          users: {
            some: {
              id: input.coachId,
            },
          },
        },
        include: {
          features: true,
        },
      });
      const target: CoachingTarget = pricing?.features.find(
        (f) => f.feature === "COACH_OFFER_COMPANY",
      )
        ? input.target ?? "INDIVIDUAL"
        : "INDIVIDUAL";
      await ctx.prisma.coachingPricePack.deleteMany({
        where: {
          coachingPriceId: input.id,
        },
      });
      await ctx.prisma.coachingLevel.deleteMany({
        where: {
          offerId: input.id,
        },
      });
      return ctx.prisma.coachingPrice.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          target,
          excludingTaxes: input.excludingTaxes,
          coachId: input.coachId,
          inHouse: input.inHouse,
          physical: input.physical,
          myPlace: input.myPlace,
          publicPlace: input.publicPlace,
          startDate: input.startDate,
          webcam: input.webcam,
          freeHours: input.freeHours,
          perDayPhysical: input.perDayPhysical,
          perDayWebcam: input.perDayWebcam,
          perHourPhysical: input.perHourPhysical,
          perHourWebcam: input.perHourWebcam,
          travelFee: input.travelFee,
          travelLimit: input.travelLimit,
          packs: {
            createMany: {
              data:
                input?.packs?.map((pack) => ({
                  nbHours: pack.nbHours,
                  packPrice: pack.packPrice,
                })) ?? [],
            },
          },
          coachingLevel: {
            createMany: {
              data:
                input?.levels?.map((level) => ({
                  level,
                })) ?? [],
            },
          },
        },
      });
    }),
  deleteCoachOffer: protectedProcedure
    .input(z.string().cuid())
    .mutation(({ ctx, input }) =>
      ctx.prisma.coachingPrice.delete({ where: { id: input } }),
    ),
  getOfferActivityByName: publicProcedure
    .input(z.string())
    .query(({ ctx, input }) =>
      ctx.prisma.coachingActivity.findMany({
        where: { name: { contains: input } },
        take: 25,
        distinct: "name",
      }),
    ),
});
