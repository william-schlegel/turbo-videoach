import { authOptions } from "@auth/[...nextauth]";
import { formatDateLocalized } from "@lib/formatDate";
import { useDayName } from "@lib/useDayName";
import useUserInfo from "@lib/useUserInfo";
import {
  CreateEvent,
  DeleteEvent,
  ShowEventCard,
  UpdateEvent,
} from "@modals/manageEvent";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import Spinner from "@ui/spinner";
import { startOfToday } from "date-fns";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

/***
 *
 *  Manager dashboard
 *
 */

const ManagerClubs = ({
  userId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const managerQuery = api.dashboards.getManagerDataForUserId.useQuery(userId);
  const { t } = useTranslation("dashboard");
  const { features } = useUserInfo(userId);

  if (managerQuery.isLoading) return <Spinner />;

  return (
    <Layout
      title={t("manager-dashboard")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1 className="flex justify-between">
        {t("manager-dashboard")}
        <Link className="btn btn-secondary" href={`${userId}/clubs`}>
          {t("manage-club")}
        </Link>
      </h1>
      <section className="stats shadow">
        <Link className="stat" href={`${userId}/clubs`}>
          <div className="stat-figure text-primary">
            <i className="bx bx-building bx-lg" />
          </div>
          <div className="stat-title">
            {t("clubs", { count: managerQuery.data?.clubCount ?? 0 })}
          </div>
          <div className="stat-value text-primary">
            {managerQuery.data?.clubCount ?? 0}
          </div>
        </Link>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-map-pin bx-lg" />
          </div>
          <div className="stat-title">
            {t("sites", { count: managerQuery.data?.sites ?? 0 })}
          </div>
          <div className="stat-value text-primary">
            {managerQuery.data?.sites ?? 0}
          </div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-home bx-lg" />
          </div>
          <div className="stat-title">
            {t("rooms", { count: managerQuery.data?.rooms ?? 0 })}
          </div>
          <div className="stat-value text-primary">
            {managerQuery.data?.rooms ?? 0}
          </div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-cycling bx-lg" />
          </div>
          <div className="stat-title">
            {t("activities", { count: managerQuery.data?.activities ?? 0 })}
          </div>
          <div className="stat-value text-primary">
            {managerQuery.data?.activities ?? 0}
          </div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-euro bx-lg" />
          </div>
          <div className="stat-title">
            {t("subscriptions", {
              count: managerQuery.data?.subscriptions ?? 0,
            })}
          </div>
          <div className="stat-value text-primary">
            {managerQuery.data?.subscriptions ?? 0}
          </div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-user bx-lg" />
          </div>
          <div className="stat-title">
            {t("members", { count: managerQuery.data?.members ?? 0 })}
          </div>
          <div className="stat-value text-primary">
            {managerQuery.data?.members ?? 0}
          </div>
        </div>
      </section>
      <section className="grid auto-rows-auto gap-2 lg:grid-cols-2">
        <article className="rounded-md border border-primary p-2">
          <div className="flex items-center justify-between gap-4">
            <h2>{t("planning")}</h2>
            <span className="rounded-full bg-primary px-8 text-primary-content">
              {formatDateLocalized(startOfToday(), {
                dateFormat: "long",
                withDay: "long",
              })}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {managerQuery.data?.clubs?.map((club) => (
              <DailyPlanning key={club.id} clubId={club.id} />
            ))}
          </div>
        </article>
        <article className="rounded-md border border-primary p-2">
          <h2>{t("event")}</h2>
          {features.includes("MANAGER_EVENT") ? (
            <div className="space-y-2">
              {managerQuery.data?.clubs?.map((club) => (
                <div
                  key={club.id}
                  className="rounded border border-secondary p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3>{club.name}</h3>
                    <CreateEvent clubId={club.id} />
                  </div>
                  <div className="flex gap-2">
                    {club.events.map((event) => (
                      <div key={event.id} className="border border-primary p-1">
                        <p className="text-center font-bold text-primary">
                          {event.name}
                        </p>
                        <p>
                          {formatDateLocalized(event.startDate, {
                            dateFormat: "number",
                            withTime: true,
                          })}
                        </p>
                        <div className="flex items-center justify-between gap-4">
                          <UpdateEvent clubId={club.id} eventId={event.id} />
                          <DeleteEvent clubId={club.id} eventId={event.id} />
                          <ShowEventCard eventId={event.id} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-error">
              {t("common:navigation.insufficient-plan")}
            </div>
          )}
        </article>
      </section>
    </Layout>
  );
};

export default ManagerClubs;

function DailyPlanning({ clubId }: { clubId: string }) {
  const { t } = useTranslation("dashboard");
  const { getToday } = useDayName();
  const day = getToday();
  const planning = api.plannings.getClubDailyPlanning.useQuery({
    clubId,
    day,
  });
  if (planning.isInitialLoading) return <Spinner />;
  if (!planning.data) return <div>{t("no-planning")}</div>;
  return (
    <div className="flex flex-col items-center rounded border border-secondary bg-base-100">
      <div className="w-full  bg-secondary text-center text-secondary-content">
        {planning.data?.club?.name}
      </div>
      <div className="flex shrink-0 flex-wrap items-start gap-2 p-2">
        {planning.data.planningActivities.map((activity) => (
          <div key={activity.id} className="border border-base-300 p-2">
            <p>
              <span className="text-xs">{activity.startTime}</span>
              {" ("}
              <span className="text-xs">{activity.duration}</span>
              {"') "}
              <span>{activity.activity.name}</span>
            </p>
            <p className="text-xs">
              <span>{activity.room?.name}</span>
              {" - "}
              <span>{activity.coach?.user.name}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  if (
    session?.user?.role !== Role.MANAGER &&
    session?.user?.role !== Role.ADMIN
  )
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
        ["common", "dashboard", "club"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
