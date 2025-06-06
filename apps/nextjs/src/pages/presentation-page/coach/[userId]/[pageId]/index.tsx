import { appRouter, createInnerTRPCContext } from "@acme/api";
import { CoachDisplay } from "@sections/coach";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import superjson from "superjson";
import nextI18nConfig from "~/../next-i18next.config.mjs";

function CoachPresentation(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  return <CoachDisplay pageId={props.pageId} userId={props.coachId} />;
}

export default CoachPresentation;

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
  const coachId = (params?.userId as string) ?? "";
  ssg.pages.getCoachPage.prefetch(pageId);

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["pages", "coach", "common"],
        nextI18nConfig,
      )),
      pageId,
      coachId,
    },
  };
};
