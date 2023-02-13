import { authOptions } from "@auth/[...nextauth]";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Data,
  type DragEndEvent,
} from "@dnd-kit/core";
import { isCUID } from "@lib/checkValidity";
import createLink from "@lib/createLink";
import useUserInfo from "@lib/useUserInfo";
import AddActivity from "@modals/manageActivity";
import { CreateClubCalendar } from "@modals/manageCalendar";
import { CreateClub, DeleteClub, UpdateClub } from "@modals/manageClub";
import { Role, type ActivityGroup } from "@prisma/client";
import { api } from "@trpcclient/api";
import ButtonIcon from "@ui/buttonIcon";
import CollapsableGroup from "@ui/collapsableGroup";
import LockedButton from "@ui/lockedButton";
import Spinner from "@ui/spinner";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, type ReactNode } from "react";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import CalendarWeek from "~/components/calendarWeek";
import Layout from "~/components/layout";

const ManageClubs = ({
  userId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const clubId = router.query.clubId as string;
  const clubQuery = api.clubs.getClubsForManager.useQuery(userId, {
    onSuccess(data) {
      if (!clubId) router.push(createLink({ clubId: data[0]?.id }));
    },
  });
  const { features } = useUserInfo(userId);
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
      title={t("club.manage-my-club", { count: clubQuery.data?.length ?? 0 })}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center gap-4">
        <h1>
          {t("club.manage-my-club", { count: clubQuery.data?.length ?? 0 })}
        </h1>
        {features.includes("MANAGER_MULTI_CLUB") || !clubQuery.data?.length ? (
          <CreateClub />
        ) : (
          <LockedButton label={t("club.create-new")} limited />
        )}
      </div>
      <div className="flex gap-4">
        {clubQuery.isLoading ? (
          <Spinner />
        ) : (
          <ul className="menu w-1/4 overflow-hidden rounded bg-base-100">
            {clubQuery.data?.map((club) => (
              <li key={club.id}>
                <Link
                  href={createLink({ clubId: club.id })}
                  className={`w-full text-center ${
                    clubId === club.id ? "active" : ""
                  }`}
                >
                  {club.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {clubId === "" ? null : <ClubContent userId={userId} clubId={clubId} />}
      </div>
    </Layout>
  );
};

export default ManageClubs;

type ClubContentProps = {
  userId: string;
  clubId: string;
};

export function ClubContent({ userId, clubId }: ClubContentProps) {
  const clubQuery = api.clubs.getClubById.useQuery(clubId, {
    onSuccess(data) {
      const groups = new Map();
      for (const act of data?.activities || [])
        groups.set(act.group.id, act.group);
      setGroups(Array.from(groups.values()));
    },
    enabled: isCUID(clubId),
  });
  const calendarQuery = api.calendars.getCalendarForClub.useQuery(clubId, {
    enabled: isCUID(clubId),
  });
  const addActivity = api.activities.affectToRoom.useMutation({
    onSuccess() {
      utils.clubs.getClubById.invalidate(clubId);
    },
  });
  const removeActivity = api.activities.removeFromRoom.useMutation({
    onSuccess() {
      utils.clubs.getClubById.invalidate(clubId);
    },
  });
  const [groups, setGroups] = useState<ActivityGroup[]>([]);
  const utils = api.useContext();
  const { t } = useTranslation("club");
  const { features } = useUserInfo(userId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const roomId = e.over?.id.toString();
    const activityId = e.active.data.current?.activityId as string | null;
    const actualRoom = e.active.data.current?.roomId as string | null;
    if (actualRoom === roomId) return;
    if (actualRoom && actualRoom !== roomId && activityId)
      removeActivity.mutate({ activityId, roomId: actualRoom });
    if (roomId && activityId) addActivity.mutate({ activityId, roomId });
  }

  function handledeleteActivity(roomId: string, activityId: string) {
    removeActivity.mutate({ activityId, roomId });
  }

  if (clubQuery.isLoading) return <Spinner />;
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {clubQuery.data?.logoUrl ? (
            <div className="h-12">
              <Image
                src={clubQuery.data.logoUrl}
                alt="club logo"
                width={200}
                height={200}
                className="h-full w-fit object-contain"
              />
            </div>
          ) : null}
          <h2>{clubQuery.data?.name}</h2>
          {/* <p>({clubQuery.data?.address})</p> */}
        </div>
        <div className="flex items-center gap-2">
          <UpdateClub clubId={clubId} />
          <CreateClubCalendar clubId={clubId} />
          <DeleteClub clubId={clubId} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        {features.includes("MANAGER_COACH") ? (
          <Link href={`/manager/${userId}/${clubId}/coach`}>
            <ButtonIcon
              iconComponent={<i className="bx bx-user bx-sm" />}
              title={t("club.manage-coachs")}
              buttonVariant="Icon-Primary"
              buttonSize="md"
              fullButton
            />
          </Link>
        ) : (
          <LockedButton label={t("club.manage-coachs")} limited />
        )}
        <Link href={`/manager/${userId}/${clubId}/subscription`}>
          <ButtonIcon
            iconComponent={<i className="bx bx-euro bx-sm" />}
            title={t("subscription.manage-subscriptions")}
            buttonVariant="Icon-Primary"
            buttonSize="md"
            fullButton
          />
        </Link>
      </div>
      <CalendarWeek
        calendar={calendarQuery.data}
        isLoading={calendarQuery.isLoading}
      />
      <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 rounded border border-primary p-4 ">
            <div className="flex flex-row items-center justify-between gap-4">
              <h3>
                {t("site.site", { count: clubQuery?.data?.sites?.length ?? 0 })}
              </h3>
              <Link
                className="btn btn-secondary"
                href={`/manager/${userId}/${clubId}/sites`}
              >
                {t("site.manage")}
              </Link>
            </div>
            {clubQuery?.data?.sites?.map((site) => (
              <div key={site.id} className="my-2 flex items-center gap-4">
                <span>
                  {site.name} ({site.address})
                </span>
                <div className="pill">
                  {site.rooms.length > 0 && (
                    <span className="mr-2 text-lg text-primary">
                      {site.rooms.length}
                    </span>
                  )}
                  {t("room.room", { count: site.rooms.length })}
                </div>
              </div>
            ))}
          </div>
          <div className="flex-1 rounded border border-primary p-4 ">
            <div className="mb-4 flex flex-row items-center justify-between gap-4">
              <h3>
                {t("activity.activity", {
                  count: clubQuery?.data?.activities?.length ?? 0,
                })}
              </h3>
              <AddActivity
                clubId={clubId}
                userId={userId}
                onSuccess={() => {
                  utils.clubs.getClubById.invalidate(clubId);
                }}
                withAdd
                withUpdate
              />
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              {groups.map((gp) => (
                <CollapsableGroup key={gp.id} groupName={gp.name}>
                  {clubQuery.data?.activities
                    ?.filter((a) => a.groupId === gp.id)
                    ?.map((a) => (
                      <DraggableElement
                        key={a.id}
                        elementId={a.id}
                        data={{ activityId: a.id, roomId: "" }}
                      >
                        <span>
                          {a.name}
                          {a.noCalendar ? (
                            <i className="bx bx-calendar-x bx-xs ml-2 text-primary" />
                          ) : null}
                        </span>
                      </DraggableElement>
                    ))}
                </CollapsableGroup>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded border border-primary p-4">
          <div className="flex items-center gap-4">
            <h3>{t("activity.manage-club-activities")}</h3>
            <p>{t("activity.manage-club-activities-help")}</p>
          </div>
          <div className="flex flex-col gap-2">
            {clubQuery.data?.sites?.map((site) => (
              <div
                key={site.id}
                className="collapse-arrow rounded-box collapse border border-secondary bg-base-100"
              >
                <input type="checkbox" defaultChecked={true} />
                <h4 className="collapse-title">{site.name}</h4>
                <div className="collapse-content">
                  {site.rooms?.map((room) => (
                    <DroppableArea
                      key={room.id}
                      areaId={room.id}
                      title={room.name}
                    >
                      {room.activities?.map((a) => (
                        <DraggableElement
                          key={a.id}
                          elementId={`${a.id} ${room.id}`}
                          data={{ activityId: a.id, roomId: room.id }}
                        >
                          {a.name}
                          {a.noCalendar ? (
                            <i className="bx bx-calendar-x bx-xs text-primary" />
                          ) : null}
                          <div
                            className="tooltip"
                            data-tip={t("activity.remove")}
                          >
                            <i
                              className="bx bx-x bx-sm cursor-pointer rounded-full bg-base-100 text-secondary hover:bg-secondary hover:text-secondary-content"
                              onClick={(e) => {
                                e.stopPropagation();
                                handledeleteActivity(room.id, a.id);
                              }}
                            />
                          </div>
                        </DraggableElement>
                      ))}
                    </DroppableArea>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

type DroppableAreaProps = {
  areaId: string;
  title: string;
  children?: ReactNode;
};

function DroppableArea({ areaId, title, children }: DroppableAreaProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: areaId,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-16 relative m-1 flex flex-wrap items-center gap-2 rounded border border-neutral p-2 ${
        isOver ? "bg-base-300" : "bg-base-100"
      }`}
    >
      <span className="absolute right-4 text-secondary opacity-70">
        {title}
      </span>
      {children}
    </div>
  );
}

type DraggableElementProps = {
  elementId: string;
  data: Data<{ activityId: string; roomId: string }>;
  children: ReactNode;
};

function DraggableElement({
  elementId,
  children,
  data,
}: DraggableElementProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: elementId,
    data,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={`z-50 ${
        transform ? "cursor-grabbing" : "cursor-grab"
      } flex items-center gap-2 rounded-full border border-neutral bg-base-100 px-4 py-1`}
      style={style}
      {...listeners}
      {...attributes}
    >
      {children}
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
    },
  };
};
