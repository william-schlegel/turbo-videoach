import { authOptions } from "@acme/auth";
import { Role } from "@prisma/client";
import { type GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link.js";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";
import { api } from "~/utils/api";

const PageCreation = () => {
  const { data: sessionData } = api.auth.getSession.useQuery();
  const { t } = useTranslation();
  if (sessionData?.user?.role === Role.MANAGER_COACH)
    return (
      <Layout>
        <Link href={"/create-page/coach"}>{t("coach")}</Link>
        <Link href={"/create-page/manager"}>{t("manager")}</Link>
      </Layout>
    );
  return <div>You are not allowed to use this page</div>;
};

export default PageCreation;

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  let destination = "";
  if (session) {
    if (session.user?.role === Role.COACH) destination = `/create-page/coach`;
    if (session.user?.role === Role.MANAGER) destination = `/create-page/club`;
  }

  return {
    redirect: destination
      ? {
          destination,
          permanent: false,
        }
      : undefined,
    props: {
      session,
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "home"],
        nextI18nConfig,
      )),
    },
  };
};
