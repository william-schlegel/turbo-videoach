import { authOptions } from "@auth/[...nextauth]";
import { isCUID } from "@lib/checkValidity";
import createLink from "@lib/createLink";
import useUserInfo from "@lib/useUserInfo";
import { CreateRoomCalendar } from "@modals/manageCalendar";
import {
  CreateRoom,
  DeleteRoom,
  RESERVATIONS,
  UpdateRoom,
} from "@modals/manageRoom";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import Spinner from "@ui/spinner";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { useRouter } from "next/router";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import CalendarWeek from "~/components/calendarWeek";
import Layout from "~/components/layout";

const ManageRooms = ({
  clubId,
  siteId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const roomId = router.query.roomId as string;
  const siteQuery = api.sites.getSiteById.useQuery(siteId);
  const { features } = useUserInfo();
  const roomQuery = api.sites.getRoomsForSite.useQuery(siteId, {
    onSuccess(data) {
      if (!roomId) router.push(createLink({ roomId: data[0]?.id }));
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

  if (!features.includes("MANAGER_ROOM"))
    return (
      <div className="alert alert-error">
        {t("common:navigation.insufficient-plan")}
      </div>
    );

  return (
    <Layout
      title={t("room.manage-my-rooms", { count: roomQuery.data?.length ?? 0 })}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="flex items-center gap-4">
            {t("room.manage-my-rooms", { count: roomQuery.data?.length ?? 0 })}
            <span className="text-secondary">{siteQuery.data?.name}</span>
          </h1>
          <CreateRoom siteId={siteId} variant={"Primary"} />
        </div>
        <button
          className="btn-outline btn btn-primary"
          onClick={() => {
            const path = `/manager/${
              sessionData?.user?.id ?? ""
            }/${clubId}/sites?siteId=${siteId}`;
            router.push(path);
          }}
        >
          {t("room.back-to-sites")}
        </button>
      </div>
      <div className="flex gap-4">
        {roomQuery.isLoading ? (
          <Spinner />
        ) : (
          <ul className="menu w-1/4 overflow-hidden rounded bg-base-100">
            {roomQuery.data?.map((room) => (
              <li key={room.id}>
                <Link
                  href={createLink({ roomId: room.id })}
                  className={`flex items-center justify-between ${
                    roomId === room.id ? "active" : ""
                  }`}
                >
                  <span>{room.name}</span>
                  <span>
                    {room.reservation === "MANDATORY" && (
                      <i className="bx bx-calendar-exclamation bx-sm text-secondary" />
                    )}
                    {room.reservation === "POSSIBLE" && (
                      <i className="bx bx-calendar-alt bx-sm text-secondary" />
                    )}
                    {room.unavailable ? (
                      <span className="badge badge-error">
                        {t("room.closed")}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {roomId === "" ? null : (
          <RoomContent clubId={clubId} roomId={roomId} siteId={siteId} />
        )}
      </div>
    </Layout>
  );
};

export default ManageRooms;

type RoomContentProps = {
  clubId: string;
  siteId: string;
  roomId: string;
};

export function RoomContent({ clubId, siteId, roomId }: RoomContentProps) {
  const roomQuery = api.sites.getRoomById.useQuery(roomId, {
    enabled: isCUID(roomId),
  });
  const calendarQuery = api.calendars.getCalendarForRoom.useQuery(
    {
      roomId,
      siteId,
      clubId,
    },
    { enabled: isCUID(roomId) && isCUID(siteId) && isCUID(clubId) },
  );
  const { t } = useTranslation("club");

  if (roomQuery.isLoading) return <Spinner />;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2>{roomQuery.data?.name}</h2>
        {roomQuery.data?.unavailable ? (
          <div className="alert alert-error w-fit">
            <i className="bx bx-x bx-xs" />
            <span>{t("room.closed")}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <UpdateRoom siteId={siteId} roomId={roomId} />
          <CreateRoomCalendar roomId={roomId} clubId={clubId} siteId={siteId} />
          <DeleteRoom roomId={roomId} siteId={siteId} />
        </div>
      </div>
      <CalendarWeek
        calendar={calendarQuery.data}
        isLoading={calendarQuery.isLoading}
      />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="label">{t("room.reservation")}</label>
          <span>
            {t(
              RESERVATIONS.find((r) => r.value === roomQuery.data?.reservation)
                ?.label || "?",
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="label">{t("room.capacity")}</label>
          <span>{roomQuery.data?.capacity}</span>
        </div>
      </div>
      <div className="flex-1 rounded border border-primary p-4 ">
        Planning de la salle
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
        siteId: "",
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
      siteId: params?.siteId as string,
    },
  };
};
