import { authOptions } from "@acme/auth";
import { isCUID } from "@lib/checkValidity";
import createLink from "@lib/createLink";
import { useDayName } from "@lib/useDayName";
import { AddCoachToClub, CoachDataPresentation } from "@modals/manageClub";
import type {
  Activity,
  DayName,
  PlanningActivity,
  Room,
  Site,
  UserCoach,
} from "@prisma/client";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import Spinner from "@ui/spinner";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

const ManageCoachs = ({
  clubId,
  userId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: sessionData } = api.auth.getSession.useQuery();
  const router = useRouter();
  const coachId = router.query.coachId as string;
  const clubQuery = api.clubs.getClubById.useQuery(clubId, {
    enabled: isCUID(clubId),
  });
  const coachsQuery = api.coachs.getCoachsForClub.useQuery(clubId, {
    enabled: isCUID(clubId),
    onSuccess(data) {
      if (!coachId) router.push(createLink({ coachId: data[0]?.id }));
    },
  });
  const { t } = useTranslation("club");

  if (
    sessionData &&
    !([Role.MANAGER, Role.MANAGER_COACH, Role.ADMIN] as Array<Role>).includes(
      sessionData.user?.role,
    )
  )
    return <div>{t("manager-only")}</div>;

  return (
    <Layout
      title={t("coach.manage-my-coachs", {
        count: coachsQuery.data?.length ?? 0,
      })}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <header className="mb-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="space-x-2">
            <span className="text-secondary">{clubQuery.data?.name}</span>
            <span>
              {t("coach.manage-my-coachs", {
                count: coachsQuery.data?.length ?? 0,
              })}
            </span>
          </h1>
        </div>
        <div className="flex gap-4">
          <AddCoachToClub clubId={clubId} userId={userId} />
          <button
            className="btn-outline btn btn-primary"
            onClick={() => {
              const path = `/manager/${
                sessionData?.user?.id ?? ""
              }/clubs?clubId=${clubId}`;
              router.push(path);
            }}
          >
            {t("coach.back-to-clubs")}
          </button>
        </div>
      </header>
      <aside className="flex gap-4">
        {coachsQuery.isLoading ? (
          <Spinner />
        ) : (
          <ul className="menu w-1/4 overflow-hidden rounded bg-base-100">
            {coachsQuery.data?.map((coach) => (
              <li key={coach.id}>
                <Link
                  href={createLink({ coachId: coach.id })}
                  className={`w-full text-center ${
                    coachId === coach.id ? "active" : ""
                  }`}
                >
                  {coach.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {coachId === "" ? null : (
          <CoachContent clubId={clubId} coachId={coachId} />
        )}
      </aside>
    </Layout>
  );
};

export default ManageCoachs;

type CoachContentProps = {
  clubId: string;
  coachId: string;
};

export function CoachContent({ coachId, clubId }: CoachContentProps) {
  const { t } = useTranslation("club");
  const queryCoach = api.coachs.getCoachById.useQuery(coachId, {
    enabled: isCUID(coachId),
  });
  if (queryCoach.isLoading) return <Spinner />;
  if (!queryCoach.data) return <div>{t("coach.coach-unknown")}</div>;
  return (
    <section className="w-full space-y-4">
      <article className="flex gap-4">
        <CoachDataPresentation
          url={queryCoach.data.imageUrl}
          activityGroups={
            queryCoach.data.coachData?.activityGroups?.map((ag) => ({
              id: ag.id,
              name: ag.name,
            })) ?? []
          }
          certifications={
            queryCoach.data.coachData?.certifications?.map((cert) => ({
              id: cert.id,
              name: cert.name,
              modules: cert.modules.map((mod) => ({
                id: mod.id,
                name: mod.name,
              })),
            })) ?? []
          }
          rating={queryCoach.data.coachData?.rating ?? 0}
          id={queryCoach.data.id ?? ""}
          pageId={queryCoach.data.coachData?.page?.id}
        />
      </article>
      <article className="rounded-md border border-primary p-2">
        <h2>{t("coach.weekly-planning")}</h2>
        <CoachPlanning coachId={coachId} clubId={clubId} />
      </article>
    </section>
  );
}

type PaData = PlanningActivity & {
  coach: UserCoach | null;
  site: Site;
  room: Room | null;
  activity: Activity;
};
type WeekDayActivity = { day: DayName; dayOrder: number; activities: PaData[] };

type ClubData = {
  id: string;
  name: string;
  activities: WeekDayActivity[];
};

function CoachPlanning({
  coachId,
  clubId,
}: {
  coachId: string;
  clubId: string;
}) {
  const { t } = useTranslation("club");
  const [weekData, setWeekData] = useState<ClubData>();
  const { getName, getDayNumber } = useDayName();

  const planning = api.plannings.getCoachPlanningForClub.useQuery(
    { coachId, clubId },
    {
      enabled: isCUID(coachId),
      onSuccess(data) {
        if (data) {
          const week: ClubData = {
            id: data.clubId,
            name: data.name ?? "",
            activities: [],
          };
          const activities = new Map<DayName, PaData[]>();
          for (const pa of data.planningActivities)
            activities.set(pa.day, [...(activities.get(pa.day) ?? []), pa]);
          const wa: WeekDayActivity[] = [];
          for (const dn of activities.keys()) {
            const pa = activities.get(dn);
            wa.push({
              day: dn,
              dayOrder: getDayNumber(dn),
              activities: pa ?? [],
            });
          }
          week.activities = wa.sort((a, b) => a.dayOrder - b.dayOrder);
          setWeekData(week);
        }
      },
    },
  );
  if (planning.isInitialLoading) return <Spinner />;
  if (!planning.data || !weekData) return <div>{t("coach.no-planning")}</div>;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-start gap-2 p-2">
        {weekData.activities.map((day) => (
          <div
            key={day.day}
            className="rounded border border-primary bg-base-100"
          >
            <div className="bg-primary py-1 text-center text-primary-content">
              {getName(day.day)}
            </div>
            <div className="space-y-2 p-2">
              {day.activities.map((activity) => (
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
    </div>
  );
}

export const getServerSideProps = async ({
  locale,
  req,
  res,
  params,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  if (
    session?.user?.role !== Role.MANAGER &&
    session?.user?.role !== Role.MANAGER_COACH &&
    session?.user?.role !== Role.ADMIN
  )
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
      props: {
        userId: "",
        clubId: "",
      },
    };

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "club", "calendar", "home"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
      clubId: params?.clubId as string,
    },
  };
};
