import { Role } from "@prisma/client";
import { type GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import { authOptions } from "../api/auth/[...nextauth]";
// import { useTranslation } from "next-i18next";
// import { useSession } from "next-auth/react";
// import Link from "next/link.js";
// import Layout from "~/components/layout";

const CoachManagement = () => {
  // const { data: sessionData } = useSession();
  // const { t } = useTranslation("planning");
  // if (sessionData?.user?.role === Role.MANAGER_COACH)
  //   return (
  //     <Layout>
  //       <Link href={"/planning-management/coach"}>{t("coach")}</Link>
  //       <Link href={"/planning-management/club"}>{t("club")}</Link>
  //     </Layout>
  //   );
  return <div>You are not allowed to use this page</div>;
};

export default CoachManagement;

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  let destination = "";
  if (session) {
    if (
      session.user?.role === Role.MANAGER ||
      session.user?.role === Role.MANAGER_COACH
    )
      destination = `/coach-management/club`;
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
        ["common"],
        nextI18nConfig,
      )),
    },
  };
};
