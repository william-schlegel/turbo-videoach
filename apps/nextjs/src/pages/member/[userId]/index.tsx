import { authOptions } from "@acme/auth";
import { isCUID } from "@lib/checkValidity";
import { formatDateLocalized } from "@lib/formatDate";
import { useDayName } from "@lib/useDayName";
import type {
  Activity,
  ActivityGroup,
  Club,
  DayOpeningTime,
  OpeningTime,
  PlanningActivity,
  Reservation,
  Room,
  RoomReservation,
  Site,
  UserCoach,
} from "@prisma/client";
import { Role, Subscription } from "@prisma/client";
import { api } from "@trpcclient/api";
import Confirmation from "@ui/confirmation";
import Modal, { getButtonSize } from "@ui/modal";
import { SelectDate } from "@ui/selectDay";
import Spinner from "@ui/spinner";
import {
  add,
  format,
  isBefore,
  isEqual,
  startOfDay,
  startOfToday,
} from "date-fns";
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
import { useDisplaySubscriptionInfo } from "../../manager/[userId]/[clubId]/subscription";

/***
 *
 *  Member dashboard
 *
 */

const MemberDashboard = ({
  userId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { t } = useTranslation("dashboard");
  const queryUser = api.users.getUserSubscriptionsById.useQuery(userId);
  const [day, setDay] = useState(startOfToday());
  const queryReservations = api.users.getReservationsByUserId.useQuery({
    userId,
    after: startOfToday(),
  });

  return (
    <Layout
      title={t("member.dashboard")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1 className="flex justify-between">
        {t("member.dashboard")}
        <Link
          className="btn-secondary btn"
          href={`/member/${userId}/subscribe`}
        >
          {t("member.new-subscription")}
        </Link>
      </h1>
      <h2>
        {t("member.my-subscription", {
          count: queryUser.data?.memberData?.subscriptions.length ?? 0,
        })}
      </h2>
      <section className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(20rem,30rem))] justify-center gap-4">
        {queryUser.data?.memberData?.subscriptions.map((sub) => (
          <Subscription key={sub.id} subscription={sub} />
        ))}
      </section>
      <section className="grid auto-rows-auto gap-2 lg:grid-cols-2">
        <article className="rounded-md border border-primary p-2">
          <div className="flex items-center justify-between">
            <h2>{t("member.my-planning")}</h2>
            <SelectDate day={day} onNewDay={(newDay) => setDay(newDay)} />
          </div>
          <DailyPlanning day={day} memberId={userId} />
        </article>
        <article className="rounded-md border border-primary p-2">
          <h2>{t("member.my-reservations")}</h2>
          <div className="grid grid-cols-[repeat(auto-fit,_minmax(10rem,_1fr))] gap-2">
            {queryReservations.data?.map((reservation) => (
              <MyReservation
                key={reservation.id}
                reservation={reservation}
                memberId={userId}
                day={day}
              />
            ))}
          </div>
        </article>
      </section>
    </Layout>
  );
};

export default MemberDashboard;

type MyReservationProps = {
  memberId: string;
  day: Date;
  reservation: Reservation & {
    room: Room | null;
    activity: Activity | null;
    planningActivity:
      | (PlanningActivity & {
          activity: Activity;
          coach: UserCoach | null;
          room: Room | null;
        })
      | null;
  };
};

function MyReservation({ reservation, memberId, day }: MyReservationProps) {
  const { t } = useTranslation("dashboard");
  const utils = api.useContext();
  const deleteReservation = api.plannings.deleteReservation.useMutation({
    onSuccess() {
      utils.users.getReservationsByUserId.invalidate({
        userId: memberId,
        after: day,
      });
      utils.plannings.getMemberDailyPlanning.invalidate({
        memberId,
        date: day,
      });
    },
  });

  function handleDeleteReservation() {
    deleteReservation.mutate(reservation.id);
  }

  return (
    <div className="rounded border border-primary bg-base-100">
      <div className="flex items-center justify-between gap-4 bg-primary px-3 py-1 text-center text-primary-content">
        <span>{formatDateLocalized(reservation.date, { withDay: true })}</span>
        <Confirmation
          message={t("member.reservation-delete-message")}
          title={t("member.delete-reservation")}
          buttonIcon={<i className={`bx bx-trash ${getButtonSize("xs")}`} />}
          onConfirm={() => handleDeleteReservation()}
          buttonSize="xs"
          variant="Icon-Only-Secondary"
        />
      </div>
      {reservation?.planningActivity ? (
        <div className="p-2">
          <div className="space-x-2 text-center">
            <span className="font-semibold">
              {reservation.planningActivity?.activity?.name}
            </span>
            {reservation.planningActivity?.coach?.publicName ? (
              <span className="text-xs">
                {"("}
                {reservation.planningActivity?.coach?.publicName}
                {")"}
              </span>
            ) : null}
          </div>
          <div className="flex justify-between">
            <span>{reservation.planningActivity?.startTime}</span>
            <span>{reservation.planningActivity?.room?.name}</span>
          </div>
        </div>
      ) : null}
      {reservation?.activity ? (
        <div className="p-2">
          <div className="space-x-2 text-center">
            <span className="font-semibold">{reservation.activity?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="space-x-2">
              <span>{format(reservation?.date, "HH:mm")}</span>
              <span className="text-xs">
                {"("}
                {reservation.activity.reservationDuration}
                {"')"}
              </span>
            </span>
            <span>{reservation.room?.name}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type DailyPlanningProps = {
  memberId: string;
  day: Date;
};

function DailyPlanning({ memberId, day }: DailyPlanningProps) {
  const { t } = useTranslation("dashboard");
  const planning = api.plannings.getMemberDailyPlanning.useQuery({
    date: day,
    memberId,
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
            {plan.activities.map((activity) => (
              <div
                key={activity.id}
                className="border border-base-300 bg-base-100 p-2"
              >
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
                <MakeReservation
                  room={activity.room}
                  reservations={activity.reservations}
                  memberId={memberId}
                  planningActivityId={activity.id}
                  day={day}
                />
              </div>
            ))}
            {plan.withNoCalendar.map((activity) => (
              <Wnc
                key={activity.id}
                activity={activity}
                day={day}
                memberId={memberId}
                reservations={activity.reservations}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type MakeReservationProps = {
  room: Room | null;
  reservations: { id: string; date: Date }[];
  planningActivityId: string;
  memberId: string;
  day: Date;
};
function MakeReservation({
  room,
  reservations,
  planningActivityId,
  memberId,
  day,
}: MakeReservationProps) {
  const { t } = useTranslation("dashboard");
  const utils = api.useContext();
  const createReservation = api.plannings.createPlanningReservation.useMutation(
    {
      onSuccess() {
        utils.users.getReservationsByUserId.invalidate({
          userId: memberId,
          after: day,
        });
        utils.plannings.getMemberDailyPlanning.invalidate({
          memberId,
          date: day,
        });
      },
    },
  );

  if (!room) return null;
  if (isBefore(day, startOfToday())) return null;

  const free =
    room.capacity > reservations.length
      ? room.capacity - reservations.length
      : 0;
  if (room.reservation === "NONE")
    return (
      <div className="text-center">
        <p className="btn-outline btn-disabled btn-xs btn">
          {t("member.free-access")}
        </p>
      </div>
    );

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs">
        {free
          ? t("member.remain", { free, capacity: room.capacity })
          : t("member.waiting-list")}
      </p>
      {reservations.find(
        (r) => r.id === planningActivityId && isEqual(day, r.date),
      ) ? (
        <span className="btn-accent btn-xs btn">{t("member.reserved")}</span>
      ) : (
        <button
          className="btn-primary btn-xs btn"
          onClick={() =>
            createReservation.mutate({
              planningActivityId,
              memberId,
              date: day,
            })
          }
        >
          {t("member.reserve")}
        </button>
      )}
    </div>
  );
}

type WncRoom = {
  id: string;
  name: string;
  capacity: number;
  reservation: RoomReservation;
};

type WncProps = {
  activity: Activity & {
    rooms: WncRoom[];
  };
  day: Date;
  memberId: string;
  reservations: { id: string; date: Date }[];
};

type TOpeningTime =
  | (DayOpeningTime & {
      workingHours: OpeningTime[];
    })
  | null;

function Wnc({ activity, day, memberId, reservations }: WncProps) {
  const { t } = useTranslation("dashboard");
  const { getDayForDate } = useDayName();
  const dayName = getDayForDate(day);
  const calClub = api.calendars.getCalendarForClub.useQuery(
    activity.clubId,

    { enabled: isCUID(activity.clubId) },
  );

  let openingText = "";
  let OT: TOpeningTime = null;
  if (calClub.data)
    OT = calClub.data.openingTime.find((d) => d.name === dayName) ?? null;

  if (OT?.wholeDay) openingText = t("member.all-day");
  else if (OT?.closed) openingText = t("member.closed");
  else {
    openingText =
      OT?.workingHours.map((wh) => `${wh.opening}-${wh.closing}`).join(" | ") ??
      "";
  }

  return (
    <>
      {activity.rooms.map((room) => (
        <div
          key={`${room?.name}-${activity.id}`}
          className="border border-base-300 bg-base-100 p-2"
        >
          <p>
            <span className="text-xs">{openingText}</span>&nbsp;
            <span>{activity.name}</span>
          </p>
          <p className="text-xs">
            {room?.name ? <span>{room.name}</span> : null}
          </p>
          <ReserveDuration
            activity={activity}
            room={room}
            reservations={reservations}
            day={day}
            memberId={memberId}
            workingHours={OT}
          />
        </div>
      ))}
    </>
  );
}

type ReserveDurationProps = {
  activity: Activity;
  room: WncRoom;
  reservations: { id: string; date: Date }[];
  day: Date;
  memberId: string;
  workingHours: TOpeningTime;
};

function ReserveDuration({
  room,
  activity,
  reservations,
  day,
  memberId,
  workingHours,
}: ReserveDurationProps) {
  const { t } = useTranslation("dashboard");
  const utils = api.useContext();
  const createReservation = api.plannings.createActivityReservation.useMutation(
    {
      onSuccess() {
        utils.users.getReservationsByUserId.invalidate({
          userId: memberId,
          after: day,
        });
        utils.plannings.getMemberDailyPlanning.invalidate({
          memberId,
          date: day,
        });
      },
    },
  );
  const [closeModal, setCloseModal] = useState(false);

  if (isBefore(day, startOfToday())) return null;

  const onSubmit = (slot: TSlot) => {
    const [hours, minutes] = getHour(setHour(slot.start));
    const date = add(startOfDay(day), { hours, minutes });
    createReservation.mutate({
      date,
      memberId,
      activityId: activity.id,
      roomId: room.id,
      activitySlot: slot.number,
    });
    setCloseModal(true);
  };

  if (room?.reservation === "NONE")
    return (
      <div className="text-center">
        <p className="btn-outline btn-disabled btn-xs btn">
          {t("member.free-access")}
        </p>
      </div>
    );
  const free =
    room.capacity > reservations.length
      ? room.capacity - reservations.length
      : 0;

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs">
        {free
          ? t("member.remain", { free, capacity: room.capacity })
          : t("member.waiting-list")}
      </p>
      {reservations.find(
        (r) => r.id === activity.id && isEqual(day, r.date),
      ) ? (
        <span className="btn-accent btn-xs btn">{t("member.reserved")}</span>
      ) : (
        <Modal
          title={t("member.reserve")}
          variant="Primary"
          buttonSize="xs"
          cancelButtonText=""
          closeModal={closeModal}
          onCloseModal={() => setCloseModal(false)}
        >
          <h3>{t("member.reserve")}</h3>
          <label>{t("club:activity.slot")}</label>
          <AvailableSlots
            workingHours={workingHours}
            duration={activity.reservationDuration}
            day={day}
            reservations={reservations}
            onSelect={(slot) => onSubmit(slot)}
          />
        </Modal>
      )}
    </div>
  );
}

type TSlot = {
  start: number;
  end: number;
  slot: string;
  number: number;
  available: boolean;
};
type AvailableSlotsProps = {
  workingHours: TOpeningTime;
  reservations: { id: string; date: Date }[];
  onSelect: (slot: TSlot) => void;
  duration: number;
  day: Date;
};

function getHour(workingHour: string | null | undefined) {
  if (workingHour == null || workingHour == undefined) return [0, 0];
  const hm = workingHour.split(":");
  if (hm.length < 2) return [0, 0];
  const h = Number(hm[0]);
  const m = Number(hm[1]);
  return [h, m];
}

function setHour(hm: number) {
  const h = Math.floor(hm);
  const m = (hm - h) * 60;
  return `${`0${h}`.slice(-2)}:${`0${m}`.slice(-2)}`;
}

function AvailableSlots({
  workingHours,
  reservations,
  duration,
  onSelect,
  day,
}: AvailableSlotsProps) {
  const { t } = useTranslation("dashboard");
  const slots: Array<TSlot> = [];
  if (!workingHours) return <span>{t("club:activity.no-slot")}</span>;
  const [hs, ms] = getHour(workingHours.workingHours[0]?.opening);
  let hStart = (hs ?? 0) + (ms ?? 0) / 60;
  const [he, me] = getHour(workingHours.workingHours[0]?.closing);
  const hEnd = (he ?? 0) + (me ?? 0) / 60;
  const durationDec = duration / 60;

  function checkAvailability(start: number) {
    const [hours, minutes] = getHour(setHour(start));
    const dtStart = add(startOfDay(day), { hours, minutes });
    const dtEnd = add(startOfDay(day), {
      hours,
      minutes: minutes ?? 0 + duration,
    });
    const reserved = reservations.find(
      (r) => r.date >= dtStart && r.date <= dtEnd,
    );
    return !reserved;
  }

  while (hStart < hEnd) {
    const end = Math.min(hStart + durationDec, hEnd);
    slots.push({
      start: hStart,
      end,
      slot: `${setHour(hStart)} : ${setHour(end)}`,
      available: checkAvailability(hStart),
      number: slots.length,
    });
    hStart += durationDec;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2">
      {slots.map((slot, idx) => (
        <span
          key={idx}
          className={`btn-sm btn ${
            slot.available ? "btn-primary" : "btn-disabled"
          }`}
          onClick={() => onSelect(slot)}
        >
          {slot.slot}
        </span>
      ))}
    </div>
  );
}

type SubscriptionProps = {
  subscription: Subscription & {
    sites: Site[];
    activities: Activity[];
    rooms: Room[];
    activitieGroups: ActivityGroup[];
    club: Club;
  };
};

function Subscription({ subscription }: SubscriptionProps) {
  const { shortInfo, sites, rooms, activityGroups, activities } =
    useDisplaySubscriptionInfo(
      subscription.mode,
      subscription.restriction,
      subscription.activitieGroups.map((ag) => ag.id),
      subscription.activities.map((ag) => ag.id),
      subscription.sites.map((ag) => ag.id),
      subscription.rooms.map((ag) => ag.id),
    );
  return (
    <div className="card w-full bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h3 className="card-title text-primary">{subscription.name}</h3>
          <span className="badge-primary badge">{subscription.club.name}</span>
        </div>
        {shortInfo ? <p>{shortInfo}</p> : ""}
        <div className="flex gap-2">
          <List label="sites" items={sites} />
          <List label="rooms" items={rooms} />
          <List label="activity-groups" items={activityGroups} />
          <List label="activities" items={activities} />
        </div>
      </div>
    </div>
  );
}

type ListProps = {
  label: string;
  items: string[];
};

export function List({ label, items }: ListProps) {
  const { t } = useTranslation("dashboard");
  if (!items.length) return null;
  return (
    <div className="flex flex-1 flex-col">
      <h4>{t(label, { count: items.length })}</h4>
      <ul>
        {items.map((item, idx) => (
          <li key={`ITEM-${idx}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  console.log("session?.user?.role", session?.user?.role);
  if (
    session?.user?.role !== Role.MEMBER &&
    session?.user?.role !== Role.ADMIN
  ) {
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
      props: {
        userId: "",
      },
    };
  }

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "dashboard", "club", "calendar"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
