import type { GetServerSidePropsContext } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

function Page404() {
  const { t } = useTranslation("common");
  return (
    <Layout
      title={t("error-404")}
      className="grid h-screen w-full items-center bg-neutral"
    >
      <div className="flex items-center justify-center gap-4">
        <span className="text-3xl font-bold text-primary">404</span>
        <span className="text-secondary">{t("error-404")}</span>
      </div>
    </Layout>
  );
}

export default Page404;

export async function getStaticProps({ locale }: GetServerSidePropsContext) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common"],
        nextI18nConfig,
      )),
    },
  };
}
