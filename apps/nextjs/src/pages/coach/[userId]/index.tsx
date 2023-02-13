import { authOptions } from "@auth/[...nextauth]";
import { useDayName } from "@lib/useDayName";
import useUserInfo from "@lib/useUserInfo";
import type { DayName } from "@prisma/client";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import LockedButton from "@ui/lockedButton";
import SelectDay from "@ui/selectDay";
import Spinner from "@ui/spinner";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { useState } from "react";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

const CoachDashboard = ({
  userId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { getToday } = useDayName();
  const [day, setDay] = useState(getToday());

  const coachQuery = api.dashboards.getCoachDataForUserId.useQuery(userId);
  const { t } = useTranslation("dashboard");
  const clubCount = coachQuery.data?.coachData?.clubs?.length ?? 0;
  const certificationCount =
    coachQuery.data?.coachData?.certifications?.length ?? 0;
  const activityCount = coachQuery.data?.coachData?.activityGroups?.length ?? 0;
  const offerCount = coachQuery.data?.coachData?.coachingPrices?.length ?? 0;
  const { features } = useUserInfo(userId);

  if (coachQuery.isLoading) return <Spinner />;

  const published = coachQuery.data?.coachData?.page?.published;
  return (
    <Layout
      title={t("coach-dashboard")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1 className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <span>{t("coach-dashboard")}</span>
          <span
            className={`rounded px-4 py-2 text-sm ${
              published
                ? "bg-success text-success-content"
                : "bg-warning text-warning-content"
            }`}
          >
            {t(published ? "pages:page-published" : "pages:page-unpublished")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          {features.includes("COACH_CERTIFICATION") ? (
            <Link
              className="btn btn-secondary"
              href={`${userId}/certifications`}
            >
              {t("manage-certifications")}
            </Link>
          ) : (
            <LockedButton label={t("manage-certifications")} />
          )}
        </div>
      </h1>
      <section className="stats w-full shadow">
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-building bx-lg" />
          </div>
          <div className="stat-title">{t("clubs", { count: clubCount })}</div>
          <div className="stat-value text-primary">{clubCount}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-award bx-lg" />
          </div>
          <div className="stat-title">
            {t("certifications", { count: certificationCount })}
          </div>
          <div className="stat-value text-primary">{certificationCount}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-cycling bx-lg" />
          </div>
          <div className="stat-title">
            {t("activities", { count: activityCount })}
          </div>
          <div className="stat-value text-primary">{activityCount}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-dollar bx-lg" />
          </div>
          <div className="stat-title">{t("offers", { count: offerCount })}</div>
          <div className="stat-value text-primary">{offerCount}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-primary">
            <i className="bx bx-star bx-lg" />
          </div>
          <div className="stat-title">{t("dashboard:rating")}</div>
          <div className="stat-value text-primary">
            {coachQuery.data?.coachData?.rating?.toFixed(1) ?? t("unrated")}
          </div>
        </div>
      </section>
      <section className="grid auto-rows-auto gap-2 lg:grid-cols-2">
        <article className="rounded-md border border-primary p-2">
          <div className="flex items-center justify-between">
            <h2>{t("planning")}</h2>
            <SelectDay day={day} onNewDay={(nd) => setDay(nd)} />
          </div>
          <DailyPlanning coachId={userId} day={day} />
        </article>
        <article className="rounded-md border border-primary p-2">
          <h2>{t("schedule")}</h2>
          {features.includes("COACH_MEETING") ? (
            <div></div>
          ) : (
            <div className="alert alert-error">
              {t("common:navigation.insufficient-plan")}
            </div>
          )}
        </article>
        <article className="col-span-full rounded-md border border-primary p-2">
          <h2>{t("chat-members")}</h2>
        </article>
      </section>
    </Layout>
  );
};

export default CoachDashboard;

function DailyPlanning({ coachId, day }: { coachId: string; day: DayName }) {
  const { t } = useTranslation("dashboard");
  const planning = api.plannings.getCoachDailyPlanning.useQuery({
    coachId,
    day,
  });
  if (planning.isInitialLoading) return <Spinner />;
  if (!planning.data) return <div>{t("no-planning")}</div>;
  return (
    <div className="flex flex-col gap-2">
      {planning.data.map((plan) => (
        <div
          key={plan.id}
          className="flex flex-col items-center rounded border border-secondary bg-base-100"
        >
          <div className="w-full  bg-secondary text-center text-secondary-content">
            {plan.club.name}
          </div>
          <div className="flex shrink-0 flex-wrap items-start gap-2 p-2">
            {plan.planningActivities.map((activity) => (
              <div key={activity.id} className="border border-base-300 p-2">
                <p>
                  <span className="text-xs">{activity.startTime}</span>
                  {" ("}
                  <span className="text-xs">{activity.duration}</span>
                  {"') "}
                  <span>{activity.activity.name}</span>
                </p>
                <p className="text-xs">
                  <span>{activity.site?.name}</span>
                  {" - "}
                  <span>{activity.room?.name}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.role !== Role.COACH && session?.user?.role !== Role.ADMIN)
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
        ["common", "dashboard", "pages", "calendar"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
