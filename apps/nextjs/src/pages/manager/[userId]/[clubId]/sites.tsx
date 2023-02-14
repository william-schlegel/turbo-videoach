import { authOptions } from "@acme/auth";
import { isCUID } from "@lib/checkValidity";
import createLink from "@lib/createLink";
import useUserInfo from "@lib/useUserInfo";
import { CreateSiteCalendar } from "@modals/manageCalendar";
import { CreateSite, DeleteSite, UpdateSite } from "@modals/manageSite";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import LockedButton from "@ui/lockedButton";
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
import CalendarWeek from "~/components/calendarWeek";
import Layout from "~/components/layout";

const ManageSites = ({
  userId,
  clubId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: sessionData } = api.auth.getSession.useQuery();
  const clubQuery = api.clubs.getClubById.useQuery(clubId, {
    enabled: isCUID(clubId),
  });
  const router = useRouter();
  const siteId = router.query.siteId as string;
  const siteQuery = api.sites.getSitesForClub.useQuery(clubId, {
    onSuccess(data) {
      if (!siteId) router.push(createLink({ siteId: data[0]?.id }));
    },
    enabled: isCUID(clubId),
  });
  const { t } = useTranslation("club");
  const { features } = useUserInfo(userId);

  if (
    sessionData &&
    !([Role.MANAGER, Role.MANAGER_COACH, Role.ADMIN] as Array<Role>).includes(
      sessionData.user?.role,
    )
  )
    return <div>{t("manager-only")}</div>;

  return (
    <Layout
      title={t("site.manage-my-sites", { count: siteQuery.data?.length ?? 0 })}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="flex items-center gap-4">
            {t("site.manage-my-sites", { count: siteQuery.data?.length ?? 0 })}
            <span className="text-secondary">{clubQuery.data?.name}</span>
          </h1>
          {features.includes("MANAGER_MULTI_SITE") ||
          !siteQuery.data?.length ? (
            <CreateSite clubId={clubId} />
          ) : (
            <LockedButton label={t("site.create")} limited />
          )}
        </div>
        <button
          className="btn-outline btn btn-primary ml-4"
          onClick={() => {
            const path = `/manager/${
              sessionData?.user?.id ?? ""
            }/clubs?clubId=${clubId}`;
            router.push(path);
          }}
        >
          {t("site.back-to-clubs")}
        </button>
      </div>
      <div className="flex gap-4">
        {siteQuery.isLoading ? (
          <Spinner />
        ) : (
          <ul className="menu w-1/4 overflow-hidden rounded bg-base-100">
            {siteQuery.data?.map((site) => (
              <li key={site.id}>
                <Link
                  href={createLink({ siteId: site.id })}
                  className={`w-full text-center ${
                    siteId === site.id ? "active" : ""
                  }`}
                >
                  {site.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {siteId === "" ? null : (
          <SiteContent userId={userId} clubId={clubId} siteId={siteId} />
        )}
      </div>
    </Layout>
  );
};

export default ManageSites;

type SiteContentProps = {
  userId: string;
  clubId: string;
  siteId: string;
};

export function SiteContent({ clubId, siteId }: SiteContentProps) {
  const siteQuery = api.sites.getSiteById.useQuery(siteId, {
    onSuccess(data) {
      if (!actualRoom && data?.rooms?.length)
        setRoomId(data?.rooms?.[0]?.id ?? "");
    },
    enabled: isCUID(siteId),
  });
  const calendarQuery = api.calendars.getCalendarForSite.useQuery(
    {
      siteId,
      clubId,
    },
    { enabled: isCUID(clubId) && isCUID(siteId) },
  );

  const { t } = useTranslation("club");
  const { features } = useUserInfo();
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const actualRoom = siteQuery.data?.rooms?.find((r) => r.id === roomId);

  const root = router.asPath.split("/");
  root.pop();
  const path = root.reduce((a, r) => a.concat(`${r}/`), "");

  if (siteQuery.isLoading) return <Spinner />;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2>{siteQuery.data?.name}</h2>
          <p>({siteQuery.data?.address})</p>
        </div>
        <div className="flex items-center gap-2">
          <UpdateSite clubId={clubId} siteId={siteId} />
          <CreateSiteCalendar siteId={siteId} clubId={clubId} />
          <DeleteSite clubId={clubId} siteId={siteId} />
        </div>
      </div>
      <CalendarWeek
        calendar={calendarQuery.data}
        isLoading={calendarQuery.isLoading}
      />
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 rounded border border-primary p-4 ">
          <div className="mb-4 flex flex-row items-center justify-between gap-4">
            <h3>
              {t("room.room", { count: siteQuery?.data?.rooms?.length ?? 0 })}
            </h3>
            {features.includes("MANAGER_ROOM") ? (
              <Link
                className="btn btn-secondary"
                href={`${path}${siteId}/rooms`}
              >
                {t("room.manage")}
              </Link>
            ) : (
              <LockedButton label={t("room.manage")} />
            )}
          </div>
          {features.includes("MANAGER_ROOM") ? (
            <div className="flex gap-4">
              <ul className="menu w-1/4 overflow-hidden rounded bg-base-100">
                {siteQuery?.data?.rooms?.map((room) => (
                  <li key={room.id}>
                    <button
                      className={`flex w-full items-center justify-between text-center ${
                        roomId === room.id ? "active" : ""
                      }`}
                      onClick={() => setRoomId(room.id)}
                    >
                      <span>{room.name}</span>
                      {room.reservation === "MANDATORY" && (
                        <i className="bx bx-calendar-exclamation bx-sm text-secondary" />
                      )}
                      {room.reservation === "POSSIBLE" && (
                        <i className="bx bx-calendar-alt bx-sm text-secondary" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex-1 rounded border border-primary p-4 ">
                Planning des activités
              </div>
              {actualRoom?.reservation !== "NONE" ? (
                <div className="flex-1 rounded border border-primary p-4 ">
                  Planning de réservation
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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
        ["common", "club", "calendar"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
      clubId: params?.clubId as string,
    },
  };
};
