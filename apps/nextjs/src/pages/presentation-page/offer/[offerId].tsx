import { appRouter, createInnerTRPCContext } from "@acme/api";
import { isCUID } from "@lib/checkValidity";
import { CoachOfferPage } from "@sections/coachOffer";
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

function Offer(props: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const offerData = api.coachs.getOfferWithDetails.useQuery(props.offerId, {
    enabled: isCUID(props.offerId),
  });

  return (
    <div
      data-theme={offerData.data?.coach?.pageStyle ?? "light"}
      className="flex min-h-screen flex-col items-center justify-center"
    >
      <Head>
        <title>{offerData.data?.coach?.publicName ?? ""}</title>
      </Head>
      <CoachOfferPage offerId={props.offerId} />
    </div>
  );
}
export default Offer;

export const getServerSideProps = async ({
  locale,
  params,
}: GetServerSidePropsContext) => {
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: createInnerTRPCContext({ session: null }),
    transformer: superjson,
  });

  const offerId = (params?.offerId as string) ?? "";
  ssg.coachs.getOfferWithDetails.prefetch(offerId);

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["pages", "coach"],
        nextI18nConfig,
      )),
      offerId,
    },
  };
};
