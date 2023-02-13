import { appRouter, createInnerTRPCContext } from "@acme/api";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import { api } from "@trpcclient/api";
import { Feature, FeatureContainer } from "@ui/features";
import { Pricing, PricingContainer } from "@ui/pricing";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import superjson from "superjson";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

/**
 *
 *  Manager presentation on Videoach page
 *
 */

function ManagerPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  const pricingQuery = api.pricings.getPricingForRole.useQuery("MANAGER");
  const { data } = pricingQuery;
  const { t } = useTranslation("home");

  return (
    <Layout>
      <section className="hero bg-base-100">
        <div className="hero-content py-48 text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">{t("manager-title")}</h1>
            <p className="py-6 text-lg">{t("manager-text")}</p>
          </div>
        </div>
      </section>
      <section className="bg-base-100">
        <div className="container mx-auto">
          <h2 className="pt-12">{t("features.manager")}</h2>
          <FeatureContainer>
            <Feature
              title={t("features.management.title")}
              description={t("features.management.description")}
            >
              <i className="bx bx-building bx-lg text-accent" />
            </Feature>
            <Feature
              title={t("features.communication.title")}
              description={t("features.communication.description")}
            >
              <i className="bx bx-bell bx-lg text-accent" />
            </Feature>
            <Feature
              title={t("features.page.title")}
              description={t("features.page.description")}
            >
              <i className="bx bx-windows bx-lg text-accent" />
            </Feature>
            <Feature
              title={t("features.mobile.title")}
              description={t("features.mobile.description")}
            >
              <i className="bx bx-mobile-alt bx-lg text-accent" />
            </Feature>
          </FeatureContainer>
        </div>
      </section>
      <section className="bg-base-200">
        <div className="container mx-auto">
          <h2 className="pt-12">{t("pricing.usage")}</h2>
          <p className="alert alert-info">{t("pricing.try-offer")}</p>
          <PricingContainer>
            {data?.map((pricing) => (
              <Pricing key={pricing.id} pricingId={pricing.id} />
            ))}
          </PricingContainer>
          <Link href="/user/signin">
            <button className="btn btn-accent btn-block my-4">
              {t("pricing.create-your-account")}
            </button>
          </Link>
        </div>
      </section>
    </Layout>
  );
}

export default ManagerPage;

export const getServerSideProps = async ({
  locale,
}: GetServerSidePropsContext) => {
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: await createInnerTRPCContext({ session: null }),
    transformer: superjson,
  });

  ssg.pricings.getPricingForRole.prefetch("MANAGER");

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "home"],
        nextI18nConfig,
      )),
      trpcState: ssg.dehydrate(),
    },
  };
};
