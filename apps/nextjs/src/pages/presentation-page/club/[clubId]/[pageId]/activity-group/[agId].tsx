import { appRouter, createInnerTRPCContext } from "@acme/api";
import { isCUID } from "@lib/checkValidity";
import { ActivityGroupDisplayElement } from "@sections/activities";
import { ActivityDisplayCard } from "@sections/activity";
import PageNavigation from "@sections/pageNavigation";
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

function ActivityGroup(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  const queryClub = api.clubs.getClubPagesForNavByClubId.useQuery(
    props.clubId,
    {
      enabled: isCUID(props.clubId),
    },
  );

  return (
    <div data-theme={props.page.theme ?? "light"}>
      <Head>
        <title>{props.page.clubName}</title>
      </Head>
      <PageNavigation
        clubId={props.clubId}
        logoUrl={queryClub.data?.logoUrl}
        pages={queryClub.data?.pages ?? []}
      />
      <section className="min-h-screen w-full bg-base-200 p-4">
        <ActivityGroupDisplayElement elementId={props.agId} />
        <ActivityDisplayCard pageId={props.pageId} groupId={props.agId} />
      </section>
    </div>
  );
}
export default ActivityGroup;

export const getServerSideProps = async ({
  locale,
  params,
}: GetServerSidePropsContext) => {
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: await createInnerTRPCContext({ session: null }),
    transformer: superjson,
  });

  const agId = (params?.agId as string) ?? "";
  ssg.pages.getPageSectionElementById.prefetch(agId);
  const pageId = (params?.pageId as string) ?? "";
  const page = await ssg.pages.getClubPage.fetch(pageId);
  ssg.pages.getPageSectionElements.prefetch({ pageId, section: "ACTIVITIES" });
  const clubId = (params?.clubId as string) ?? "";
  ssg.clubs.getClubPagesForNavByClubId.prefetch(clubId);

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["pages"],
        nextI18nConfig,
      )),
      agId,
      pageId,
      page,
      clubId,
    },
  };
};
