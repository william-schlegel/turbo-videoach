import {
  type CoachingLevel,
  type CoachingPrice,
  PageSectionElementType,
  PageSectionModel,
  PageTarget,
} from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { getDocUrl } from "./files";

const PageObject = z.object({
  id: z.string().cuid(),
  name: z.string(),
  clubId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  target: z.nativeEnum(PageTarget),
});

const PageSectionObject = z.object({
  id: z.string().cuid(),
  model: z.nativeEnum(PageSectionModel),
  pageId: z.string().cuid(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
});

const PageSectionElementObject = z.object({
  id: z.string().cuid(),
  images: z.array(z.string().cuid()).optional().default([]),
  title: z.string().optional(),
  subTitle: z.string().optional(),
  elementType: z.nativeEnum(PageSectionElementType),
  content: z.string().optional(),
  link: z.string().url().optional(),
  pageId: z.string().cuid().optional(),
  pageSection: z.nativeEnum(PageSectionModel).optional(),
  sectionId: z.string().cuid(),
  optionValue: z.string().optional(),
});

type GetCoachDataForPageReturn = {
  certifications: { id: string; name: string }[];
  activities: { id: string; name: string }[];
  offers: (CoachingPrice & {
    coachingLevel: CoachingLevel[];
  })[];
};

export const pageRouter = createTRPCRouter({
  getPagesForManager: protectedProcedure
    .input(z.string())
    .query(({ ctx, input }) => {
      return ctx.prisma.page.findMany({
        where: {
          club: { managerId: input },
        },
        include: {
          club: true,
        },
      });
    }),
  getPagesForClub: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.page.findMany({
        where: { clubId: input },
      })
    ),
  getPageForCoach: protectedProcedure
    .input(z.string().cuid())
    .query(async ({ ctx, input }) => {
      const page = await ctx.prisma.page.findFirst({
        where: { coachId: input },
      });
      if (page) return page;
      const user = await ctx.prisma.user.findUnique({ where: { id: input } });
      if (!user)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error fetching user ${input}`,
        });
      return ctx.prisma.page.create({
        data: {
          name: user.name ?? "coach",
          target: "HOME",
          coach: {
            connect: {
              userId: input,
            },
          },
          sections: {
            create: {
              model: "HERO",
              elements: {
                create: {
                  elementType: "HERO_CONTENT",
                  title: user.name,
                },
              },
            },
          },
        },
      });
    }),
  getPageById: protectedProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.prisma.page.findUnique({
        where: { id: input },
        include: {
          sections: {
            include: {
              elements: {
                include: { images: true },
              },
            },
          },
        },
      })
    ),
  getPageSection: publicProcedure
    .input(
      z.object({
        pageId: z.string().cuid(),
        section: z.nativeEnum(PageSectionModel),
      })
    )
    .query(async ({ ctx, input }) => {
      const section = await ctx.prisma.pageSection.findFirst({
        where: {
          pageId: input.pageId,
          model: input.section,
        },
        include: {
          elements: {
            include: { images: true },
          },
          page: { include: { club: true } },
        },
      });
      const images: {
        elemId: string;
        docId: string;
        userId: string;
        url: string;
      }[] = [];
      const userId = section?.page.club?.managerId ?? "";
      for (const elem of section?.elements ?? []) {
        for (const doc of elem.images) {
          const url = await getDocUrl(userId, doc.id);
          if (url)
            images.push({
              elemId: elem.id,
              docId: doc.id,
              userId: doc.userId,
              url,
            });
        }
      }
      if (!section) return null;
      return {
        id: section.id,
        title: section.title,
        subTitle: section.subTitle,
        elements: section.elements.map((e) => ({
          id: e.id,
          title: e.title,
          subTitle: e.subTitle,
          content: e.content,
          elementType: e.elementType,
          link: e.link,
          optionValue: e.optionValue,
          pageId: e.pageId,
          sectionId: e.sectionId,
          pageSection: e.pageSection,
          images: images
            .filter((i) => i.elemId === e.id)
            .map((i) => ({ docId: i.docId, userId: i.userId, url: i.url })),
        })),
      };
    }),
  getPageSectionElements: publicProcedure
    .input(
      z.object({
        pageId: z.string().cuid(),
        section: z.nativeEnum(PageSectionModel),
      })
    )
    .query(async ({ ctx, input }) => {
      const section = await ctx.prisma.pageSection.findFirst({
        where: {
          pageId: input.pageId,
          model: input.section,
        },
        include: {
          elements: true,
        },
      });
      if (!section) return null;
      return section.elements;
    }),
  getPageSectionElementById: protectedProcedure
    .input(z.string().cuid())
    .query(async ({ ctx, input }) => {
      const elem = await ctx.prisma.pageSectionElement.findUnique({
        where: { id: input },
        include: {
          images: true,
        },
      });
      const images: {
        docId: string;
        userId: string;
        url: string;
      }[] = [];
      for (const doc of elem?.images ?? []) {
        const url = await getDocUrl(doc.userId, doc.id);
        if (url)
          images.push({
            docId: doc.id,
            userId: doc.userId,
            url,
          });
      }
      if (!elem) return null;
      return {
        id: elem.id,
        title: elem.title,
        subTitle: elem.subTitle,
        content: elem.content,
        elementType: elem.elementType,
        link: elem.link,
        optionValue: elem.optionValue,
        pageId: elem.pageId,
        sectionId: elem.sectionId,
        pageSection: elem.pageSection,
        images,
      };
    }),
  createPage: protectedProcedure
    .input(PageObject.omit({ id: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.page.create({
        data: input,
      })
    ),
  updatePage: protectedProcedure
    .input(PageObject.omit({ clubId: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.page.update({
        where: { id: input.id },
        data: {
          name: input.name,
        },
      })
    ),
  deletePage: protectedProcedure.input(z.string()).mutation(({ ctx, input }) =>
    ctx.prisma.page.delete({
      where: { id: input },
    })
  ),
  createPageSection: protectedProcedure
    .input(PageSectionObject.omit({ id: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.pageSection.create({
        data: {
          model: input.model,
          pageId: input.pageId,
          title: input.title,
          subTitle: input.subtitle,
        },
      })
    ),
  updatePageSection: protectedProcedure
    .input(PageSectionObject.partial())
    .mutation(({ ctx, input }) =>
      ctx.prisma.pageSection.update({
        where: {
          id: input.id,
        },
        data: {
          model: input.model,
          pageId: input.pageId,
          title: input.title,
          subTitle: input.subtitle,
        },
      })
    ),
  deletePageSection: protectedProcedure
    .input(
      z.object({ pageId: z.string().cuid(), sectionId: z.string().cuid() })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.pageSection.delete({
        where: { id: input.sectionId },
        include: {
          elements: true,
        },
      });
    }),
  createPageSectionElement: protectedProcedure
    .input(PageSectionElementObject.omit({ id: true }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.pageSectionElement.create({
        data: {
          content: input.content,
          elementType: input.elementType,
          images: {
            connect: input.images.map((imageId) => ({ id: imageId })),
          },
          link: input.link,
          pageId: input.pageId,
          pageSection: input.pageSection,
          title: input.title,
          subTitle: input.subTitle,
          sectionId: input.sectionId,
          optionValue: input.optionValue,
        },
      })
    ),
  updatePageSectionElement: protectedProcedure
    .input(
      PageSectionElementObject.omit({ sectionId: true, elementType: true })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.pageSectionElement.update({
        where: { id: input.id },
        data: {
          content: input.content,
          images: {
            connect: input.images.map((imageId) => ({ id: imageId })),
          },
          link: input.link,
          pageId: input.pageId,
          pageSection: input.pageSection,
          title: input.title,
          subTitle: input.subTitle,
          optionValue: input.optionValue,
        },
      })
    ),
  deletePageSectionElement: protectedProcedure
    .input(z.string())
    .mutation(({ ctx, input }) =>
      ctx.prisma.pageSectionElement.delete({
        where: { id: input },
        include: {
          images: true,
        },
      })
    ),
  getClubPage: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const page = await ctx.prisma.page.findFirst({
        where: { id: input, published: true },
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
      });
      const clubId = page?.clubId ?? "";
      const allPages = await ctx.prisma.page.findMany({
        where: { clubId, published: true },
      });
      const club = await ctx.prisma.club.findUnique({ where: { id: clubId } });
      return {
        clubId,
        sections: page?.sections ?? [],
        pages: allPages.map((p) => p.target),
        theme: club?.pageStyle ?? "light",
        clubName: club?.name ?? "",
      };
    }),
  getCoachPage: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const pageData = await ctx.prisma.user.findFirst({
        where: {
          coachData: { page: { id: input, target: "HOME", published: true } },
        },
        include: {
          pricing: {
            include: {
              features: true,
            },
          },
          coachData: {
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
              certifications: {
                include: {
                  modules: true,
                },
              },
              coachingActivities: true,
              coachingPrices: {
                include: {
                  coachingLevel: true,
                },
              },
            },
          },
        },
      });

      const image = pageData?.coachData?.page?.sections
        .find((s) => s.model === "HERO")
        ?.elements.find((e) => e.elementType === "HERO_CONTENT")?.images?.[0];
      const hero = pageData?.coachData?.page?.sections
        .find((s) => s.model === "HERO")
        ?.elements.find((e) => e.elementType === "HERO_CONTENT");
      const options = new Map(
        pageData?.coachData?.page?.sections
          .find((s) => s.model === "HERO")
          ?.elements.filter((e) => e.elementType === "OPTION")
          .map((o) => [o.title, o.optionValue])
      );
      const activities =
        pageData?.coachData?.coachingActivities.map((a) => ({
          id: a.id,
          name: a.name,
        })) ?? [];
      const features = pageData?.pricing?.features ?? [];
      const certificationOk = !!features.find(
        (f) => f.feature === "COACH_CERTIFICATION"
      );

      const certifications = certificationOk
        ? pageData?.coachData?.certifications.map((c) => ({
            id: c.id,
            name: c.name,
          })) ?? []
        : [];
      const offersOk = !!features.find((f) => f.feature === "COACH_OFFER");
      const offerCompaniesOk = !!features.find(
        (f) => f.feature === "COACH_OFFER_COMPANY"
      );
      const offers = offersOk
        ? pageData?.coachData?.coachingPrices.filter((c) =>
            offerCompaniesOk ? true : c.target === "INDIVIDUAL"
          ) ?? []
        : [];

      return {
        email: pageData?.email,
        phone: pageData?.phone,
        searchAddress: pageData?.coachData?.searchAddress,
        longitude: pageData?.coachData?.longitude,
        latitude: pageData?.coachData?.latitude,
        range: pageData?.coachData?.range,
        hero,
        options,
        activities,
        certifications,
        pageStyle: pageData?.coachData?.pageStyle,
        publicName: pageData?.coachData?.publicName,
        offers,
        image,
      };
    }),
  getCoachDataForPage: publicProcedure
    .input(z.string())
    .query<GetCoachDataForPageReturn>(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input },
        include: {
          pricing: {
            include: {
              features: true,
            },
          },
          coachData: {
            include: {
              certifications: {
                include: {
                  modules: true,
                },
              },
              coachingActivities: true,
              coachingPrices: {
                include: {
                  coachingLevel: true,
                },
              },
            },
          },
        },
      });
      const features = user?.pricing?.features ?? [];
      const certificationOk = !!features.find(
        (f) => f.feature === "COACH_CERTIFICATION"
      );
      const certifications = certificationOk
        ? user?.coachData?.certifications.map((c) => ({
            id: c.id,
            name: c.name,
          })) ?? []
        : [];

      const offersOk = !!features.find((f) => f.feature === "COACH_OFFER");
      const offerCompaniesOk = !!features.find(
        (f) => f.feature === "COACH_OFFER_COMPANY"
      );
      const offers = offersOk
        ? user?.coachData?.coachingPrices.filter((c) =>
            offerCompaniesOk ? true : c.target === "INDIVIDUAL"
          ) ?? []
        : [];
      return {
        certifications,
        activities:
          user?.coachData?.coachingActivities.map((a) => ({
            id: a.id,
            name: a.name,
          })) ?? [],
        offers,
      };
    }),
  updatePagePublication: protectedProcedure
    .input(z.object({ pageId: z.string().cuid(), published: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.prisma.page.update({
        where: { id: input.pageId },
        data: { published: input.published },
      })
    ),
  updatePageStyleForCoach: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        pageStyle: z.string(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.userCoach.update({
        where: { userId: input.userId },
        data: {
          pageStyle: input.pageStyle,
        },
      })
    ),
  updatePageStyleForClub: protectedProcedure
    .input(
      z.object({
        clubId: z.string().cuid(),
        pageStyle: z.string(),
      })
    )
    .mutation(({ ctx, input }) =>
      ctx.prisma.club.update({
        where: { id: input.clubId },
        data: {
          pageStyle: input.pageStyle,
        },
      })
    ),
});
