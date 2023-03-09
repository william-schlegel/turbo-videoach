import { getServerSession } from "@acme/auth";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import Spinner from "@ui/spinner";
import { type GetServerSidePropsContext } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useMemo } from "react";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

const AdminDashboard = () => {
  const adminQuery = api.dashboards.getAdminData.useQuery();
  const { t } = useTranslation("dashboard");
  const siteCount = useMemo(
    () =>
      adminQuery.data?.clubs?.reduce(
        (acc, c) => {
          acc.sites += c.sites.length;
          acc.rooms += c.sites.reduce((ss, s) => (ss += s._count.rooms), 0);
          return acc;
        },
        { sites: 0, rooms: 0 },
      ) ?? { sites: 0, rooms: 0 },
    [adminQuery.data],
  );
  const memberCount = adminQuery.data?.members ??0;
  const messageCount = adminQuery.data?.messages ??0;

  if (adminQuery.isLoading) return <Spinner />;

  return (
    <Layout
      title={t("admin-dashboard")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1 className="flex justify-between">{t("admin-dashboard")}</h1>
      <section className="stats shadow">
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-building bx-lg" />
          </div>
          <div className="stat-title">
            {t("clubs", { count: adminQuery.data?.clubs?.length ?? 0 })}
          </div>
          <div className="stat-value text-primary">
            {adminQuery.data?.clubs?.length}
          </div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-map-pin bx-lg" />
          </div>
          <div className="stat-title">
            {t("sites", { count: siteCount.sites })}
          </div>
          <div className="stat-value text-primary">{siteCount.sites}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-home bx-lg" />
          </div>
          <div className="stat-title">
            {t("rooms", { count: siteCount.rooms })}
          </div>
          <div className="stat-value text-primary">{siteCount.rooms}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-user bx-lg" />
          </div>
          <div className="stat-title">
            {t("members", { count: memberCount })}
          </div>
          <div className="stat-value text-primary">{memberCount}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-message bx-lg" />
          </div>
          <div className="stat-title">
            {t("messages", { count: messageCount })}
          </div>
          <div className="stat-value text-primary">{messageCount}</div>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-2">
        <article className="rounded-md border border-primary p-2">
          <h2>{t("subscriptions")}</h2>
        </article>
        <article className="rounded-md border border-primary p-2">
          <h2>{t("kpi")}</h2>
        </article>
      </section>
    </Layout>
  );
};

export default AdminDashboard;

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession({ req, res });
  if (session?.user?.role !== Role.ADMIN)
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
      props: {
        userId: "",
      },
    };

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "dashboard"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
