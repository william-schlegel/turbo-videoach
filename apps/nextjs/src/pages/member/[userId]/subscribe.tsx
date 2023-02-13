import { isCUID } from "@lib/checkValidity";
import FindClub from "@sections/findClub";
import { api } from "@trpcclient/api";
import { type GetServerSidePropsContext } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

function Subscribe() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const userId = router.query.userId as string;
  const userQuery = api.users.getUserById.useQuery(userId, {
    enabled: isCUID(userId),
  });
  return (
    <Layout
      title={t("new-subscription")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1 className="flex justify-between">{t("new-subscription")}</h1>
      <h2>{t("find-club")}</h2>
      <p>{t("how-to-subscribe")}</p>
      <FindClub address={userQuery.data?.address ?? ""} />
    </Layout>
  );
}
export default Subscribe;

export const getServerSideProps = async ({
  locale,
}: GetServerSidePropsContext) => {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "auth", "home"],
        nextI18nConfig,
      )),
    },
  };
};
