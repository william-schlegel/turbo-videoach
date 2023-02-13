import { authOptions } from "@auth/[...nextauth]";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { isCUID } from "@lib/checkValidity";
import createLink from "@lib/createLink";
import { formatDateLocalized } from "@lib/formatDate";
import { DAYS, useDayName } from "@lib/useDayName";
import {
  CreatePlanning,
  DeletePlanning,
  UpdatePlanning,
} from "@modals/managePlanning";
import type {
  Activity,
  DayName,
  Planning,
  Room,
  Site,
  UserCoach,
} from "@prisma/client";
import { PlanningActivity, Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import Confirmation from "@ui/confirmation";
import Spinner from "@ui/spinner";
import { isDate } from "date-fns";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";
// import { useHover } from "@lib/useHover";

const HHOUR = "h-12"; // 3rem 48px
const HHOUR_PX = 48;
const LEADINGHOUR = "leading-12";
const START_HOUR = 7;
const NB_HOUR = 15;
const HSITE = "h-[45rem]";

function ClubPlanning({
  userId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation("planning");
  const router = useRouter();
  const clubId = router.query.clubId as string;
  const planningId = router.query.planningId as string;
  const queryClubs = api.clubs.getClubsForManager.useQuery(userId, {
    onSuccess(data) {
      if (!clubId) router.push(createLink({ clubId: data[0]?.id, planningId }));
    },
  });
  const queryPlannings = api.plannings.getPlanningsForClub.useQuery(clubId, {
    enabled: isCUID(clubId),
    onSuccess(data) {
      if (!planningId)
        router.push(createLink({ clubId, planningId: data[0]?.id }));
    },
  });

  return (
    <Layout
      title={t("planning-management")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1 className="flex items-center">
        {t("planning-management")}
        <div className="ml-auto flex items-center gap-2">
          <label>{t("select-club")}</label>
          <select
            className="w-48 min-w-fit"
            value={clubId}
            onChange={(e) => {
              router.push(
                createLink({ clubId: e.target.value, planningId: undefined }),
              );
            }}
          >
            {queryClubs.data?.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
      </h1>
      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="min-w-fit space-y-2 lg:max-w-xs">
          <h4>{t("plannings")}</h4>
          <CreatePlanning clubId={clubId} />
          <ul className="menu rounded border border-secondary bg-base-100">
            {queryPlannings.data?.map((planning) => (
              <li key={planning.id}>
                <div
                  className={`flex ${
                    planningId === planning.id ? "active" : ""
                  }`}
                >
                  <button
                    onClick={() =>
                      router.push(
                        createLink({ clubId, planningId: planning.id }),
                      )
                    }
                    className="flex flex-1 items-center justify-between"
                  >
                    <PlanningName planning={planning} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        {planningId ? (
          <PlanningContent
            clubId={clubId}
            planningId={planningId}
            userId={userId}
          />
        ) : null}
      </div>
    </Layout>
  );
}

export default ClubPlanning;

/**
 * compose a planning name from name and dates
 * @param {Planning} planning data
 * @returns planning name component
 */
export function PlanningName({ planning }: { planning: Planning }) {
  const { t } = useTranslation("planning");
  return (
    <div className="flex w-full items-center justify-between gap-2">
      {planning.name ? <span>{planning.name}</span> : null}
      <span
        className={`${
          planning.name ? "badge badge-secondary" : ""
        } flex items-center gap-2`}
      >
        {!planning.name && <span>{t("from")}</span>}
        {formatDateLocalized(planning.startDate)}
        {isDate(planning.endDate) ? (
          <span className="space-x-2">
            <i className="bx bx-right-arrow-alt bx-xs" />
            <span>{formatDateLocalized(planning.endDate)}</span>
          </span>
        ) : null}
      </span>
    </div>
  );
}

type PlanningContentProps = {
  planningId: string;
  clubId: string;
  userId: string;
};

type DropData = {
  day: DayName;
  dayName: string;
  siteName: string;
  activityId: string;
  activityName: string;
  siteId: string;
  rooms: Room[];
};

type DropFormData = {
  startTime: string;
  duration: number;
  roomId: string;
  coachId: string;
};

type PopupData = {
  activityId: string | null;
  rect: DOMRectList;
};

const PlanningContent = ({
  planningId,
  clubId,
  userId,
}: PlanningContentProps) => {
  const queryPlanning = api.plannings.getPlanningById.useQuery(planningId);
  const { t } = useTranslation("planning");
  const queryClub = api.clubs.getClubById.useQuery(clubId);
  const queryActivities = api.activities.getActivitiesForClub.useQuery(
    {
      clubId,
      userId,
    },
    {
      enabled: isCUID(clubId) && isCUID(userId),
    },
  );
  const refModalDrop = useRef<HTMLInputElement>(null);
  const [dropData, setDropData] = useState<DropData>({
    day: "MONDAY",
    dayName: "",
    siteName: "",
    activityId: "",
    activityName: "",
    siteId: "",
    rooms: [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
  );
  const utils = api.useContext();
  const addActivity = api.plannings.addPlanningActivity.useMutation({
    onSuccess() {
      utils.plannings.getPlanningById.invalidate(planningId);
    },
  });
  const { getName } = useDayName();
  const [popupData, setPopupData] = useState<PopupData | null>(null);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;
    const day = over.data.current?.day as DayName | null;
    const dayName = getName(day);
    const siteId = (over.data.current?.site as string) ?? "";
    const site = queryClub.data?.sites?.find((s) => s.id === siteId);
    const siteName = site?.name ?? "?";
    const activityName =
      queryActivities.data?.activities.find((a) => a.id === active.id)?.name ??
      "?";
    const rooms = site?.rooms ?? [];
    // reset();
    setDropData({
      day: day ?? "MONDAY",
      dayName,
      siteName,
      activityName,
      siteId,
      rooms,
      activityId: active.id as string,
    });
    if (refModalDrop.current) refModalDrop.current.checked = true;
  }

  function handleSaveActivity(data: DropFormData) {
    addActivity.mutate({
      planningId,
      siteId: dropData.siteId,
      activityId: dropData.activityId,
      day: dropData.day,
      coachId: data.coachId ? data.coachId : undefined,
      roomId: data.roomId ? data.roomId : undefined,
      startTime: data.startTime,
      duration: data.duration,
    });
    if (refModalDrop.current) refModalDrop.current.checked = false;
  }

  function handleActivityIsActivated(
    activityId: string | null,
    rect: DOMRectList,
  ) {
    setPopupData({ activityId, rect });
  }

  if (queryPlanning.isLoading) return <Spinner />;
  return (
    <DndContext onDragEnd={handleDragEnd} sensors={sensors}>
      {popupData ? (
        <PopupActivityDetails
          popupData={popupData}
          onClose={() => setPopupData(null)}
          clubId={clubId}
        />
      ) : null}
      {/* add activity modal */}
      <input
        type="checkbox"
        id="modal-drop"
        className="modal-toggle"
        ref={refModalDrop}
      />
      <div className="modal">
        <div className="modal-box relative">
          <label
            htmlFor="modal-drop"
            className="btn btn-secondary btn-sm btn-circle absolute right-2 top-2"
          >
            <i className="bx bx-x bx-sm" />
          </label>
          <FormActivity
            clubId={clubId}
            handleSaveActivity={handleSaveActivity}
            {...dropData}
          />
        </div>
      </div>
      {/* planning content */}
      <article className="flex flex-grow flex-col gap-4">
        <section className="flex items-center justify-between">
          <h2>
            {queryPlanning.data ? (
              <PlanningName planning={queryPlanning.data} />
            ) : (
              "-"
            )}
          </h2>
          <div className="flex items-center gap-2">
            <UpdatePlanning clubId={clubId} planningId={planningId} />
            <UpdatePlanning clubId={clubId} planningId={planningId} duplicate />
            <DeletePlanning clubId={clubId} planningId={planningId} />
          </div>
        </section>
        <section className="grid grid-cols-[auto_1fr] gap-2">
          <aside className="flex flex-col gap-1 border border-secondary">
            <span className="bg-secondary px-4 text-center text-secondary-content">
              {t("activities")}
            </span>
            {queryActivities.data?.activities.map((activity) => (
              <DraggableActivity
                key={activity.id}
                id={activity.id}
                name={activity.name}
              />
            ))}
          </aside>

          <div className="grid grid-cols-[auto_1fr]">
            <div>
              <div className="h-12"></div>
              <div>
                <div className="flex w-10 shrink-0 flex-col border-r border-base-200 bg-base-100 text-center">
                  {Array.from(
                    { length: NB_HOUR },
                    (_, k) => k + START_HOUR,
                  ).map((hour) => (
                    <p
                      key={hour}
                      className={`${HHOUR} border-b border-base-200 text-xs ${LEADINGHOUR} text-base-300`}
                    >
                      {`0${hour}`.slice(-2)}:00
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex max-w-full gap-[1px] overflow-auto">
              {DAYS.map((day) => (
                <div key={day.value} className="shrink-0">
                  <div className="w-max-fit flex flex-shrink-0 flex-col">
                    <span className="h-6 bg-primary text-center leading-6 text-primary-content">
                      {t(`calendar:${day.label}`)}
                    </span>
                    <div
                      className={`grid gap-[1px]`}
                      style={{
                        gridTemplateColumns: `repeat(${
                          queryClub.data?.sites?.length ?? 1
                        }, minmax(0, 1fr)`,
                      }}
                    >
                      {queryClub.data?.sites?.map((site) => (
                        <div key={site.id}>
                          <div className="h-6 w-[12rem] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap bg-secondary px-2 text-center leading-6 text-secondary-content">
                            {site.name}
                          </div>
                          <DropSite
                            key={site.id}
                            id={`${day.value} ${site.id}`}
                            data={{ day: day.value, site: site.id }}
                          >
                            <PlanningActivities
                              activities={
                                queryPlanning.data?.planningActivities.filter(
                                  (pa) =>
                                    pa.day === day.value &&
                                    pa.siteId === site.id,
                                ) ?? []
                              }
                              onActivatePopup={handleActivityIsActivated}
                            />
                          </DropSite>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </article>
      <DragOverlay></DragOverlay>
    </DndContext>
  );
};

type PlanningActivityCompleted = PlanningActivity & {
  site: Site | null;
  room: Room | null;
  activity: Activity;
  coach: UserCoach | null;
};

type PlanningActivitiesProps = {
  activities: PlanningActivityCompleted[];
  onActivatePopup: (id: string | null, rect: DOMRectList) => void;
};

function PlanningActivities({
  activities,
  onActivatePopup,
}: PlanningActivitiesProps) {
  const HSlots =
    useMemo(() => {
      if (!activities) return [];
      const hs = activities.map((activity) => ({
        activity,
        position: 0,
        nbPosition: 1,
      }));

      for (let a = 0; a < hs.length; a++) {
        const hmA = hs[a]?.activity.startTime.split(":") ?? ["0", "0"];
        const startA = Number(hmA[0]) + Number(hmA[1]) / 60;
        const durationA = (hs[a]?.activity.duration ?? 0) / 60;
        for (let b = a + 1; b < hs.length; b++) {
          const hmB = hs[b]?.activity.startTime.split(":") ?? ["0", "0"];
          const startB = Number(hmB[0]) + Number(hmB[1]) / 60;
          const durationB = (hs[b]?.activity.duration ?? 0) / 60;
          if (
            (startB >= startA && startB < startA + durationA) ||
            (startB <= startA && startA < startB + durationB)
          ) {
            const elemB = hs[b];
            const elemA = hs[a];
            if (elemB && elemA) {
              elemB.position += 1;
              elemB.nbPosition += 1;
              elemA.nbPosition += 1;
            }
          }
        }
      }
      return hs;
    }, [activities]) ?? [];

  return (
    <>
      {HSlots.map((slot) => (
        <PlanningActivity
          key={slot.activity.id}
          planningActivity={slot.activity}
          onActivatePopup={onActivatePopup}
          position={slot.position}
          nbPosition={slot.nbPosition}
        />
      ))}
    </>
  );
}

type PlanningActivityProps = {
  planningActivity: PlanningActivityCompleted;
  onActivatePopup: (id: string | null, rect: DOMRectList) => void;
  position: number;
  nbPosition: number;
};

function PlanningActivity({
  planningActivity,
  onActivatePopup,
  position,
  nbPosition,
}: PlanningActivityProps) {
  const hm = planningActivity.startTime.split(":");
  const top = HHOUR_PX * (Number(hm[0]) - START_HOUR + Number(hm[1]) / 60);
  const height = HHOUR_PX * (planningActivity.duration / 60);
  const ref = useRef<HTMLButtonElement | null>(null);
  const w = 100 / nbPosition;
  return (
    <button
      className="absolute flex cursor-pointer items-center justify-center rounded border border-secondary bg-base-200 text-base-content"
      style={{ top, height, width: `${w}%`, left: `${position * w}%` }}
      onClick={(e) =>
        onActivatePopup(planningActivity.id, e.currentTarget.getClientRects())
      }
      ref={ref}
    >
      <div className="pointer-events-none text-xs">
        {planningActivity.activity.name} ({planningActivity.duration}
        {"'"})
      </div>
    </button>
  );
}

type PopupActivityDetailsProps = {
  popupData: PopupData;
  onClose: () => void;
  clubId: string;
};

function PopupActivityDetails({
  popupData,
  onClose,
  clubId,
}: PopupActivityDetailsProps) {
  const queryPlanning = api.plannings.getPlanningActivityById.useQuery(
    popupData.activityId,
    { enabled: popupData.activityId !== "" && popupData.activityId !== null },
  );
  const utils = api.useContext();
  const updatePlanning = api.plannings.updatePlanningActivity.useMutation({
    onSuccess(data) {
      utils.plannings.getPlanningById.invalidate(data.planningId);
    },
  });
  const deletePlanning = api.plannings.deletePlanningActivity.useMutation({
    onSuccess(data) {
      utils.plannings.getPlanningById.invalidate(data.planningId);
    },
  });
  const { getName } = useDayName();
  function handleSaveActivity(data: DropFormData) {
    if (popupData.activityId)
      updatePlanning.mutate({
        id: popupData.activityId,
        coachId: data.coachId ? data.coachId : undefined,
        roomId: data.roomId ? data.roomId : undefined,
        startTime: data.startTime,
        duration: data.duration,
      });
    onClose();
  }
  function handleDelete() {
    if (popupData.activityId) deletePlanning.mutate(popupData.activityId);
    onClose();
  }

  return (
    <div
      className="absolute z-20 mb-4 w-max min-w-fit rounded bg-base-200 p-2 shadow"
      style={{
        left: popupData.rect[0]?.left ?? 0,
        top: (popupData.rect[0]?.bottom ?? 0) + 5,
      }}
    >
      <button
        className="btn btn-secondary btn-sm btn-circle absolute right-1 top-1"
        onClick={onClose}
      >
        <i className="bx bx-x bx-sm" />
      </button>
      {queryPlanning.isLoading ? (
        <Spinner />
      ) : (
        <FormActivity
          clubId={clubId}
          activityName={queryPlanning.data?.activity.name ?? ""}
          dayName={getName(queryPlanning.data?.day)}
          handleSaveActivity={handleSaveActivity}
          rooms={queryPlanning.data?.site?.rooms ?? []}
          siteName={queryPlanning.data?.site?.name ?? ""}
          handleDelete={handleDelete}
          update
          initialData={{
            coachId: queryPlanning.data?.coachId ?? "",
            roomId: queryPlanning.data?.roomId ?? "",
            duration: queryPlanning.data?.duration ?? 0,
            startTime: queryPlanning.data?.startTime ?? "",
          }}
        />
      )}
    </div>
  );
}

function DraggableActivity({ id, name }: { id: string; name: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="pill z-10 mx-2 justify-center bg-base-100"
    >
      {name}
    </button>
  );
}

type DropSiteProps = {
  id: string;
  data: {
    day: string;
    site: string;
  };
  children: ReactNode;
};

function DropSite({ id, data, children }: DropSiteProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data });
  return (
    <div
      ref={setNodeRef}
      className={`relative ${HSITE} ${isOver ? "bg-base-200" : "bg-base-100"}`}
    >
      {children}
    </div>
  );
}

type FormActivityProps = {
  handleSaveActivity: SubmitHandler<DropFormData>;
  handleDelete?: () => void;
  clubId: string;
  dayName: string;
  siteName: string;
  activityName: string;
  rooms: Room[];
  update?: boolean;
  initialData?: DropFormData;
};

function FormActivity({
  handleSaveActivity,
  clubId,
  dayName,
  siteName,
  activityName,
  rooms,
  update = false,
  handleDelete,
  initialData,
}: FormActivityProps) {
  const { t } = useTranslation("planning");
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DropFormData>();
  const queryCoachs = api.coachs.getCoachsForClub.useQuery(clubId);

  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  return (
    <form onSubmit={handleSubmit(handleSaveActivity)}>
      <h3 className="text-lg font-bold">
        {t(update ? "update-course" : "new-course")}
      </h3>
      <h2 className="flex items-center gap-4">
        {t("day")}
        <span className="text-secondary">{dayName}</span>
      </h2>
      <div className="flex items-center gap-4">
        <label>{t("site")}</label>
        <span>{siteName}</span>
        <label>{t("activity")}</label>
        <span>{activityName}</span>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <label className="required">{t("start-hour")}</label>
        <div className="flex flex-col gap-2">
          <input
            type="time"
            {...register("startTime", {
              required: t("start-hour-mandatory") ?? true,
            })}
            className="input-bordered input w-fit self-start"
          />
          {errors.startTime && (
            <p className="text-sm text-error">{errors.startTime.message}</p>
          )}
        </div>
        <label className="required">{t("duration")}</label>
        <div className="flex flex-col gap-2">
          <div className="form-control">
            <div className="input-group">
              <input
                type="number"
                {...register("duration", {
                  valueAsNumber: true,
                  validate: (v) => Number(v) > 1,
                  required: t("duration-mandatory") ?? true,
                })}
                className="input-bordered input w-full"
              />
              <span>{t("minutes")}</span>
            </div>
          </div>
          {errors.duration && (
            <p className="text-sm text-error">{errors.duration.message}</p>
          )}
        </div>
        <label>{t("coach")}</label>
        <select className="w-full" {...register("coachId")}>
          {queryCoachs.data?.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.name}
            </option>
          ))}
        </select>
        <label>{t("room")}</label>
        <select className="w-full" {...register("roomId")}>
          {rooms?.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </div>
      <div className="modal-action">
        <label htmlFor="modal-drop">
          {update ? (
            <Confirmation
              title={t("activity-deletion")}
              message={t("activity-deletion-message")}
              textConfirmation={t("activity-deletion-confirmation")}
              onConfirm={() => {
                if (typeof handleDelete === "function") handleDelete();
              }}
              variant="Icon-Outlined-Secondary"
              buttonIcon={<i className="bx bx-trash bx-sm" />}
            />
          ) : null}
          <button className="btn btn-primary ml-2">
            {t(update ? "update" : "validation")}
          </button>
        </label>
      </div>
    </form>
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
        ["common", "planning", "calendar"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
