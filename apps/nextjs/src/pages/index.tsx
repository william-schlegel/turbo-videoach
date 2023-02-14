import { authOptions } from "@acme/auth";
import { Role } from "@prisma/client";
import { type GetServerSidePropsContext } from "next";
import { getServerSession } from "next-auth/next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import nextI18nConfig from "../../next-i18next.config.mjs";

export default function Index() {
  return <div>Videoach</div>;
}

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  let destination = "";
  if (session) {
    if (session.user?.role === Role.MEMBER)
      destination = `/member/${session.user.id}`;
    if (session.user?.role === Role.COACH)
      destination = `/coach/${session.user.id}`;
    if (session.user?.role === Role.MANAGER)
      destination = `/manager/${session.user.id}`;
    if (session.user?.role === Role.MANAGER_COACH)
      destination = `/manager-coach/${session.user.id}`;
    if (session.user?.role === Role.ADMIN)
      destination = `/admin/${session.user.id}`;
  }
  const redirect = destination
    ? {
        destination,
        permanent: false,
      }
    : {
        destination: "/videoach",
        permanent: true,
      };

  return {
    redirect,
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
