import { appRouter, createInnerTRPCContext } from "@acme/api";
import { authOptions } from "@acme/auth";
import { createProxySSGHelpers } from "@trpc/react-query/ssg";
import { api } from "@trpcclient/api";
import { Feature, FeatureContainer } from "@ui/features";
import { Pricing, PricingContainer } from "@ui/pricing";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import superjson from "superjson";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

function CoachPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  const pricingQuery = api.pricings.getPricingForRole.useQuery("COACH");
  const { data } = pricingQuery;
  const { t } = useTranslation("home");
  const { data: sessionData } = api.auth.getSession.useQuery();

  return (
    <Layout title={t("coach-title")}>
      <section className="hero bg-base-100">
        <div className="hero-content py-48 text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">{t("coach-title")}</h1>
            <p className="py-6 text-lg">{t("coach-text")}</p>
          </div>
        </div>
      </section>
      <section className="bg-base-100">
        <div className="container mx-auto">
          <h2 className="pt-12">{t("features.coach")}</h2>
          <FeatureContainer>
            <Feature
              title={t("features.coaching.title")}
              description={t("features.coaching.description")}
            >
              <i className="bx bx-user-check bx-lg text-accent" />
            </Feature>
            <Feature
              title={t("features.coach-communication.title")}
              description={t("features.coach-communication.description")}
            >
              <i className="bx bx-bell bx-lg text-accent" />
            </Feature>
            <Feature
              title={t("features.video.title")}
              description={t("features.video.description")}
            >
              <i className="bx bx-video bx-lg text-accent" />
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
          {sessionData?.user?.id ? (
            <div className="text-center">
              {t("pricing.go-to-account")}{" "}
              <Link href={`/user/${sessionData?.user?.id}/account`}>
                <button className="btn btn-accent my-4">
                  {t("pricing.my-account")}
                </button>
              </Link>
            </div>
          ) : (
            <Link href="/user/signin">
              <button className="btn btn-accent btn-block my-4">
                {t("pricing.create-your-account")}
              </button>
            </Link>
          )}
        </div>
      </section>
    </Layout>
  );
}

export default CoachPage;

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  const ssg = createProxySSGHelpers({
    router: appRouter,
    ctx: createInnerTRPCContext({ session }),
    transformer: superjson,
  });

  ssg.pricings.getPricingForRole.prefetch("COACH");

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
