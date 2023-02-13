import { Role } from "@prisma/client";
import { type GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link.js";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";
import { authOptions } from "../api/auth/[...nextauth]";

const PlanningManagement = () => {
  const { data: sessionData } = useSession();
  const { t } = useTranslation("planning");
  if (sessionData?.user?.role === Role.MANAGER_COACH)
    return (
      <Layout>
        <Link href={"/planning-management/coach"}>{t("coach")}</Link>
        <Link href={"/planning-management/club"}>{t("club")}</Link>
      </Layout>
    );
  return <div>You are not allowed to use this page</div>;
};

export default PlanningManagement;

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  let destination = "";
  if (session) {
    if (session.user?.role === Role.COACH)
      destination = `/planning-management/coach`;
    if (session.user?.role === Role.MANAGER)
      destination = `/planning-management/club`;
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
        ["common", "planning"],
        nextI18nConfig,
      )),
    },
  };
};
