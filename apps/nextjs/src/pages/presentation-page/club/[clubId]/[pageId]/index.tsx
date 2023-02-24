import { appRouter, createInnerTRPCContext } from "@acme/api";
import { isCUID } from "@lib/checkValidity";
import { ActivityGroupDisplayCard } from "@sections/activities";
import { HeroDisplay } from "@sections/hero";
import { OfferDisplayCard } from "@sections/offers";
import PageNavigation from "@sections/pageNavigation";
import { PlanningDisplayCard } from "@sections/planning";
import { TitleDisplay } from "@sections/title";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import { api } from "@trpcclient/api";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import superjson from "superjson";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Spinner from "~/components/ui/spinner";

function ClubPresentation(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  const queryPage = api.pages.getClubPage.useQuery(props.pageId, {
    enabled: isCUID(props.pageId),
  });
  const queryClub = api.clubs.getClubPagesForNavByClubId.useQuery(
    props.clubId,
    {
      enabled: isCUID(props.clubId),
    },
  );
  if (queryPage.isLoading || queryClub.isLoading) return <Spinner />;
  const managerId = queryClub.data?.managerId ?? "";

  return (
    <div data-theme={queryPage.data?.theme ?? "light"}>
      <Head>
        <title>{queryPage.data?.clubName ?? ""}</title>
      </Head>
      <PageNavigation
        clubId={props.clubId}
        logoUrl={queryClub.data?.logoUrl}
        pages={queryClub.data?.pages ?? []}
      />
      {queryPage.data?.sections.map((section) =>
        section.model === "HERO" ? (
          <HeroDisplay
            key={section.id}
            clubId={queryPage.data.clubId}
            pageId={props.pageId}
            userId={managerId}
          />
        ) : section.model === "ACTIVITY_GROUPS" ? (
          <ActivityGroupDisplayCard
            key={section.id}
            pageId={props.pageId}
            userId={managerId}
          />
        ) : section.model === "TITLE" ? (
          <TitleDisplay
            key={section.id}
            clubId={queryPage.data.clubId}
            pageId={props.pageId}
          />
        ) : section.model === "PLANNINGS" ? (
          <PlanningDisplayCard key={section.id} pageId={props.pageId} />
        ) : section.model === "OFFERS" ? (
          <OfferDisplayCard
            key={section.id}
            pageId={props.pageId}
            clubId={props.clubId}
          />
        ) : null,
      )}
    </div>
  );
}

export default ClubPresentation;

export const getServerSideProps = async ({
  locale,
  params,
}: GetServerSidePropsContext) => {
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: createInnerTRPCContext({ session: null }),
    transformer: superjson,
  });

  const pageId = (params?.pageId as string) ?? "";
  ssg.pages.getClubPage.prefetch(pageId);
  const clubId = (params?.clubId as string) ?? "";
  ssg.clubs.getClubPagesForNavByClubId.prefetch(clubId);

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["pages", "dashboard", "club"],
        nextI18nConfig,
      )),
      pageId,
      clubId,
    },
  };
};
