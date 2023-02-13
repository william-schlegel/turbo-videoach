import { appRouter, createInnerTRPCContext } from "@acme/api";
import { isCUID } from "@lib/checkValidity";
import { CoachOfferPage } from "@sections/coachOffer";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import superjson from "superjson";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

function OfferPage(
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  return (
    <Layout>
      <section className="bg-base-100 py-48">
        <div className="container mx-auto">
          <CoachOfferPage offerId={props.offerId} />
        </div>
      </section>
    </Layout>
  );
}

export default OfferPage;

export const getServerSideProps = async ({
  locale,
  params,
}: GetServerSidePropsContext) => {
  const offerId = params?.offerId as string;
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: createInnerTRPCContext({ session: null }),
    transformer: superjson,
  });

  if (isCUID(offerId)) ssg.coachs.getOfferWithDetails.prefetch(offerId);

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "home", "coach"],
        nextI18nConfig,
      )),
      trpcState: ssg.dehydrate(),
      offerId,
    },
  };
};
