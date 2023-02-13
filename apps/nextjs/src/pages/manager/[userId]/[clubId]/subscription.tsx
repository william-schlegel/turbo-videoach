import { authOptions } from "@auth/[...nextauth]";
import { isCUID } from "@lib/checkValidity";
import createLink from "@lib/createLink";
import { formatDateLocalized } from "@lib/formatDate";
import { formatMoney } from "@lib/formatNumber";
import {
  CreateSubscription,
  DeleteSubscription,
  UpdateSubscription,
  useSubscriptionMode,
  useSubscriptionRestriction,
} from "@modals/manageSubscription";
import type { SubscriptionMode, SubscriptionRestriction } from "@prisma/client";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import Spinner from "@ui/spinner";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import { i18n, useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

const ManageSubscriptions = ({
  clubId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const subscriptionId = router.query.subscriptionId as string;
  const clubQuery = api.clubs.getClubById.useQuery(clubId, {
    enabled: isCUID(clubId),
  });
  const siteQuery = api.subscriptions.getSubscriptionsForClub.useQuery(clubId, {
    enabled: isCUID(clubId),
    onSuccess(data) {
      if (!subscriptionId)
        router.push(createLink({ subscriptionId: data[0]?.id }));
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
      title={t("subscription.manage-my-subscriptions", {
        count: siteQuery.data?.length ?? 0,
      })}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="flex items-center gap-4">
            {t("subscription.manage-my-subscriptions", {
              count: siteQuery.data?.length ?? 0,
            })}
            <span className="text-secondary">{clubQuery.data?.name}</span>
          </h1>
          <CreateSubscription clubId={clubId} />
        </div>
        <button
          className="btn-outline btn-primary btn"
          onClick={() => {
            const path = `/manager/${
              sessionData?.user?.id ?? ""
            }/clubs?clubId=${clubId}`;
            router.push(path);
          }}
        >
          {t("subscription.back-to-clubs")}
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
                  href={createLink({ subscriptionId: site.id })}
                  className={`w-full text-center ${
                    subscriptionId === site.id ? "active" : ""
                  }`}
                >
                  {site.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {subscriptionId === "" ? null : (
          <SubscriptionContent
            clubId={clubId}
            subscriptionId={subscriptionId}
          />
        )}
      </div>
    </Layout>
  );
};

export default ManageSubscriptions;

type SubscriptionContentProps = {
  clubId: string;
  subscriptionId: string;
};

export function SubscriptionContent({
  clubId,
  subscriptionId,
}: SubscriptionContentProps) {
  const { t } = useTranslation("club");

  const { getModeName } = useSubscriptionMode();
  const { getRestrictionName } = useSubscriptionRestriction();
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedActivityGroups, setSelectedActivityGroups] = useState<
    string[]
  >([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const subQuery = api.subscriptions.getSubscriptionById.useQuery(
    subscriptionId,
    {
      onSuccess(data) {
        setSelectedSites(data?.sites.map((s) => s.id) ?? []);
        setSelectedRooms(data?.rooms.map((s) => s.id) ?? []);
        setSelectedActivityGroups(data?.activitieGroups.map((s) => s.id) ?? []);
        setSelectedActivities(data?.activities.map((s) => s.id) ?? []);
      },
      enabled: isCUID(subscriptionId),
    },
  );

  const { info } = useDisplaySubscriptionInfo(
    subQuery.data?.mode ?? "ALL_INCLUSIVE",
    subQuery.data?.restriction ?? "CLUB",
    selectedActivityGroups,
    selectedActivities,
    selectedSites,
    selectedRooms,
  );

  const userCount = subQuery.data?.users.length ?? 0;

  const undateSelection =
    api.subscriptions.updateSubscriptionSelection.useMutation({
      onSuccess() {
        toast.success(t("subscription.selection-success"));
      },
      onError(error) {
        toast.error(error.message);
      },
    });

  function handleSaveSelection() {
    undateSelection.mutate({
      subscriptionId,
      activities: selectedActivities,
      activityGroups: selectedActivityGroups,
      sites: selectedSites,
      rooms: selectedRooms,
    });
  }

  function handleSelectSite(id: string) {
    if (selectedSites.includes(id))
      setSelectedSites((sel) => sel.filter((s) => s !== id));
    else setSelectedSites((sel) => sel.concat(id));
  }
  function handleSelectRoom(id: string) {
    if (selectedRooms.includes(id))
      setSelectedRooms((sel) => sel.filter((s) => s !== id));
    else setSelectedRooms((sel) => sel.concat(id));
  }
  function handleSelectActivityGroup(id: string) {
    if (selectedActivityGroups.includes(id))
      setSelectedActivityGroups((sel) => sel.filter((s) => s !== id));
    else setSelectedActivityGroups((sel) => sel.concat(id));
  }
  function handleSelectActivity(id: string) {
    if (selectedActivities.includes(id))
      setSelectedActivities((sel) => sel.filter((s) => s !== id));
    else setSelectedActivities((sel) => sel.concat(id));
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2>{subQuery.data?.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <UpdateSubscription clubId={clubId} subscriptionId={subscriptionId} />
          <DeleteSubscription clubId={clubId} subscriptionId={subscriptionId} />
        </div>
      </div>
      <section className="flex items-start gap-2">
        <div className="stats w-fit shadow">
          <div className="stat w-fit">
            <div className="stat-figure text-primary">
              <i className="bx bx-user bx-lg" />
            </div>
            <div className="stat-title">
              {t("subscription.users", { count: userCount })}
            </div>
            <div className="stat-value text-primary">{userCount}</div>
          </div>
        </div>
        <div className="grid flex-1 self-stretch rounded border border-primary p-2 md:grid-cols-2 lg:grid-cols-4">
          <DataCell
            label={t("subscription.start-date")}
            value={formatDateLocalized(subQuery.data?.startDate)}
          />
          <DataCell
            label={t("subscription.description")}
            value={subQuery.data?.description}
          />
          <DataCell
            label={t("subscription.selected-mode")}
            value={getModeName(subQuery.data?.mode)}
          />
          <DataCell
            label={t("subscription.selected-restriction")}
            value={getRestrictionName(subQuery.data?.restriction)}
          />
          <DataCell
            label={t("subscription.monthly")}
            value={formatMoney(subQuery.data?.monthly)}
          />
          <DataCell
            label={t("subscription.yearly")}
            value={formatMoney(subQuery.data?.yearly)}
          />
          <DataCell
            label={t("subscription.inscription-fee")}
            value={formatMoney(subQuery.data?.inscriptionFee)}
          />
          <DataCell
            label={t("subscription.cancelation-fee")}
            value={formatMoney(subQuery.data?.cancelationFee)}
          />
        </div>
      </section>
      <section className="flex-1">
        <h3>{t("subscription.subscription-content")}</h3>
        <div className="flex gap-2">
          <div className="rounded border border-secondary pb-2">
            <SelectRestriction
              clubId={clubId}
              restriction={subQuery.data?.restriction ?? "CLUB"}
              siteIds={selectedSites}
              roomIds={selectedRooms}
              onSelectSite={(id) => handleSelectSite(id)}
              onSelectRoom={(id) => handleSelectRoom(id)}
            />
          </div>
          <div className="rounded border border-secondary pb-2">
            <SelectDataForMode
              clubId={clubId}
              restriction={subQuery.data?.restriction ?? "CLUB"}
              mode={subQuery.data?.mode ?? "ALL_INCLUSIVE"}
              siteIds={selectedSites}
              roomIds={selectedRooms}
              activityGroupIds={selectedActivityGroups}
              activityIds={selectedActivities}
              onSelectActivityGroup={(id) => handleSelectActivityGroup(id)}
              onSelectActivity={(id) => handleSelectActivity(id)}
            />
          </div>
          <div className="flex-1 rounded border border-primary p-4">
            <div className="alert alert-info justify-center font-bold">
              {info}
            </div>
            <button
              className="btn-primary btn-block btn mt-4"
              onClick={handleSaveSelection}
            >
              {t("subscription.validate-selection")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

type SelectRestrictionProps = {
  clubId: string;
  restriction: SubscriptionRestriction;
  siteIds: string[];
  roomIds: string[];
  onSelectSite: (siteId: string) => void;
  onSelectRoom: (roomId: string) => void;
};
function SelectRestriction({
  clubId,
  restriction,
  siteIds,
  roomIds,
  onSelectSite,
  onSelectRoom,
}: SelectRestrictionProps) {
  const club = api.clubs.getClubById.useQuery(clubId);
  const { t } = useTranslation("club");

  if (club.isLoading) return <Spinner />;
  return (
    <div className="flex flex-col gap-1">
      <span className="bg-secondary p-2 text-center text-secondary-content">
        {t("subscription.club")}&nbsp;{club.data?.name}
      </span>
      {restriction === "SITE"
        ? club.data?.sites?.map((site) => (
            <SelectableItem
              key={site.id}
              state={siteIds.includes(site.id)}
              item={{ id: site.id, name: site.name }}
              onClick={(id) => onSelectSite(id)}
            />
          ))
        : null}
      {restriction === "ROOM"
        ? club.data?.sites?.map((site) => (
            <div
              key={site.id}
              className="mx-1 flex flex-col gap-1 rounded border border-primary pb-2"
            >
              <span className="bg-primary p-2 text-center text-primary-content">
                {site.name}
              </span>

              {site.rooms.map((room) => (
                <SelectableItem
                  key={room.id}
                  state={roomIds.includes(room.id)}
                  item={{ id: room.id, name: room.name }}
                  onClick={(id) => onSelectRoom(id)}
                />
              ))}
            </div>
          ))
        : null}
    </div>
  );
}

type SelectableItemProps = {
  state: boolean;
  item: { id: string; name: string };
  onClick: (id: string) => void;
};

function SelectableItem({ state, item, onClick }: SelectableItemProps) {
  return (
    <button
      className="btn-outline btn mx-1 mt-1 flex items-center gap-4"
      onClick={() => onClick(item.id)}
    >
      <i className={`bx ${state ? "bx-check-square" : "bx-checkbox"} bx-sm`} />
      <span className="flex-1">{item.name}</span>
    </button>
  );
}

type SelectDataForModeProps = {
  clubId: string;
  siteIds: string[];
  roomIds: string[];
  activityGroupIds: string[];
  activityIds: string[];
  restriction: SubscriptionRestriction;
  mode: SubscriptionMode;
  onSelectActivityGroup: (id: string) => void;
  onSelectActivity: (id: string) => void;
};

function SelectDataForMode({
  clubId,
  siteIds,
  roomIds,
  activityGroupIds,
  activityIds,
  restriction,
  mode,
  onSelectActivity,
  onSelectActivityGroup,
}: SelectDataForModeProps) {
  const { t } = useTranslation("club");
  const choices = api.subscriptions.getPossibleChoice.useQuery({
    clubId,
    mode,
    restriction,
    roomIds,
    siteIds,
  });

  if (choices.isLoading) return <Spinner />;
  if (!choices.data?.activityGroups && !choices.data?.activities) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="bg-secondary p-2 text-center text-secondary-content">
        {t(
          mode === "ACTIVITY_GROUP"
            ? "subscription.mode.activity-group"
            : "subscription.mode.activity",
        )}
      </span>
      {choices.data?.activityGroups
        ? choices.data.activityGroups.map((ag) => (
            <SelectableItem
              key={ag.id}
              state={activityGroupIds.includes(ag.id)}
              item={{ id: ag.id, name: ag.name }}
              onClick={(id) => onSelectActivityGroup(id)}
            />
          ))
        : null}
      {choices.data?.activities
        ? choices.data.activities.map((ag) => (
            <SelectableItem
              key={ag.id}
              state={activityIds.includes(ag.id)}
              item={{ id: ag.id, name: ag.name }}
              onClick={(id) => onSelectActivity(id)}
            />
          ))
        : null}
    </div>
  );
}

export function useDisplaySubscriptionInfo(
  mode: SubscriptionMode | undefined,
  restriction: SubscriptionRestriction | undefined,
  activityGroupIds: string[],
  activityIds: string[],
  siteIds: string[],
  roomIds: string[],
) {
  const { t } = useTranslation("club");

  const { data } = api.subscriptions.getDataNames.useQuery(
    {
      siteIds,
      roomIds,
      activityGroupIds,
      activityIds,
    },
    { enabled: mode != undefined && restriction != undefined },
  );
  let info = "";
  let shortInfo = "";

  if (!data)
    return {
      info: "",
      sites: [],
      rooms: [],
      activityGroups: [],
      activities: [],
    };

  const sites = data.sites.map((s) => s.name);
  const rooms = data.rooms.map((s) => s.name);
  const activityGroups = data.activityGroups.map((s) => s.name);
  const activities = data.activities.map((s) => s.name);

  const listFormatter = new Intl.ListFormat(i18n?.language);

  switch (mode) {
    case "ALL_INCLUSIVE":
      shortInfo = t("subscription.mode.all-inclusive-select");
      break;
    case "ACTIVITY_GROUP":
      info = t("subscription.mode.activity-group-select", {
        count: data.activityGroups.length,
      });
      info = info.concat(listFormatter.format(activityGroups));
      break;
    case "ACTIVITY":
      info = t("subscription.mode.activity-select", {
        count: data.activities.length,
      });
      info = info.concat(listFormatter.format(activities));
      break;
    case "DAY":
      shortInfo = t("subscription.mode.day-select");
      break;
    default:
  }
  info = info.concat(" ");
  switch (restriction) {
    case "CLUB":
      info = info.concat(t("subscription.restriction.club-select"));
      break;
    case "SITE":
      info = info.concat(
        t("subscription.restriction.site-select", { count: data.sites.length }),
      );
      info = info.concat(listFormatter.format(sites));
      break;
    case "ROOM":
      info = info.concat(
        t("subscription.restriction.room-select", { count: data.rooms.length }),
      );
      info = info.concat(listFormatter.format(rooms));
      break;
    default:
  }

  return {
    shortInfo,
    info: shortInfo.concat(info),
    sites,
    rooms,
    activityGroups,
    activities,
  };
}

function DataCell({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-x-2">
      <span className="font-semibold text-primary">{label}</span>
      <span>{value ?? ""}</span>
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
        ["common", "club"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
      clubId: params?.clubId as string,
    },
  };
};
