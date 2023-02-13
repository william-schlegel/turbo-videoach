/* eslint-disable @next/next/no-img-element */
import { authOptions } from "@auth/[...nextauth]";
import { isCUID } from "@lib/checkValidity";
import createLink from "@lib/createLink";
import { formatDateLocalized } from "@lib/formatDate";
import { formatMoney } from "@lib/formatNumber";
import { NotificationType, UserNotification } from "@prisma/client";
import { api } from "@trpcclient/api";
import Pagination from "@ui/pagination";
import Spinner from "@ui/spinner";
import { isDate } from "date-fns";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment, useEffect, useState } from "react";
import { toast } from "react-toastify";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

const PER_PAGE = 20;

type FromTo = "from" | "to";

const ManageNotifications = ({
  userId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const fromTo = (router.query.fromTo ?? "to") as FromTo;
  const notificationId = router.query.notificationId as string;
  const notificationQuery = api.notifications.getNotificationToUser.useQuery(
    {
      userToId: fromTo === "to" ? userId : undefined,
      userFromId: fromTo === "from" ? userId : undefined,
      skip: page * PER_PAGE,
      take: PER_PAGE,
    },
    {
      onSuccess(data) {
        if (!notificationId)
          router.push(
            createLink({
              notificationId: data.notifications[0]?.id,
              page: page.toString(),
            }),
          );
      },
    },
  );
  const { t } = useTranslation("auth");

  useEffect(() => {
    if (!notificationQuery.data?.notifications) return;
    const notif = notificationQuery.data.notifications.find(
      (n) => n.id === notificationId,
    );
    if (fromTo === "to" && notif && !notif.viewDate) {
      notificationQuery.refetch();
    }
  }, [
    fromTo,
    notificationId,
    notificationQuery,
    notificationQuery.data?.notifications,
  ]);

  return (
    <Layout
      title={t("notification.my-notification", {
        count: notificationQuery.data?.notifications.length ?? 0,
      })}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center gap-4">
        <h1>
          {t("notification.my-notification", {
            count: notificationQuery.data?.notifications.length ?? 0,
          })}
        </h1>
      </div>
      <div className="flex gap-4">
        {notificationQuery.isLoading ? (
          <Spinner />
        ) : (
          <div className="w-1/4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                className={`btn btn-primary ${
                  fromTo === "to" ? "" : "btn-outline"
                }`}
                href={createLink({
                  notificationId: "",
                  page: "0",
                  fromTo: "to",
                })}
              >
                {t("notification.to")}
              </Link>
              <Link
                className={`btn btn-primary ${
                  fromTo === "from" ? "" : "btn-outline"
                }`}
                href={createLink({
                  notificationId: "",
                  page: "0",
                  fromTo: "from",
                })}
              >
                {t("notification.from")}
              </Link>
            </div>
            <ul className="menu w-full overflow-hidden rounded bg-base-100">
              {notificationQuery.data?.notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={createLink({
                      notificationId: notification.id,
                      page: page.toString(),
                      fromTo,
                    })}
                    className={`flex items-center justify-between ${
                      notificationId === notification.id ? "active" : ""
                    } ${
                      notification.viewDate ? "" : "font-bold text-secondary"
                    }`}
                  >
                    <div>
                      {formatDateLocalized(notification.date, {
                        dateFormat: "short",
                        withTime: true,
                      })}
                    </div>
                    <div className="space-x-2">
                      {notification.type === "COACH_ACCEPT" ||
                      notification.type === "CLUB_ACCEPT" ||
                      notification.type === "SUBSCRIPTION_VALIDATED" ||
                      notification.type === "REQUEST_VALIDATED" ? (
                        <i className="bx bx-happy-heart-eyes bx-xs rounded-full bg-success p-2 text-success-content" />
                      ) : null}
                      {notification.type === "COACH_REFUSE" ||
                      notification.type === "CLUB_REFUSE" ||
                      notification.type === "SUBSCRIPTION_REJECTED" ||
                      notification.type === "REQUEST_REJECTED" ? (
                        <i className="bx bx-x bx-xs rounded-full bg-error p-2 text-error-content" />
                      ) : null}
                      {notification.type === "SEARCH_COACH" ||
                      notification.type === "SEARCH_CLUB" ? (
                        <i className="bx bx-question-mark bx-xs rounded-full bg-secondary p-2 text-secondary-content" />
                      ) : null}
                      {notification.type === "NEW_SUBSCRIPTION" ? (
                        <i className="bx bx-dollar bx-xs rounded-full bg-secondary p-2 text-secondary-content" />
                      ) : null}
                      {notification.answered ? (
                        <i className="bx bx-check bx-xs rounded-full bg-success p-2 text-success-content" />
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination
              actualPage={page}
              count={notificationQuery.data?.total ?? 0}
              onPageClick={(page) => setPage(page)}
              perPage={PER_PAGE}
            />
          </div>
        )}
        {notificationId === "" ? null : (
          <NotificationContent
            notificationId={notificationId}
            fromTo={fromTo}
          />
        )}
      </div>
    </Layout>
  );
};

export default ManageNotifications;

type NotificationContentProps = {
  notificationId: string;
  fromTo: FromTo;
};

export function NotificationContent({
  notificationId,
  fromTo,
}: NotificationContentProps) {
  const notification = api.notifications.getNotificationById.useQuery(
    { notificationId, updateViewDate: fromTo === "to" },
    { enabled: isCUID(notificationId) },
  );
  const { t } = useTranslation("auth");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span>
          {fromTo === "from"
            ? t("notification.from-user")
            : t("notification.to-user")}
        </span>
        <div className="avatar">
          <div className="w-16 rounded">
            <img
              src={
                (fromTo === "to"
                  ? notification.data?.userFrom.imageUrl
                  : notification.data?.userTo.imageUrl) ?? "/images/dummy.jpg"
              }
              alt={
                (fromTo === "to"
                  ? notification.data?.userFrom.name
                  : notification.data?.userTo.name) ?? ""
              }
            />
          </div>
        </div>
        <span className="text-lg font-bold text-secondary">
          {(fromTo === "to"
            ? notification.data?.userFrom.name
            : notification.data?.userTo.name) ?? ""}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <h2>
          {formatDateLocalized(notification.data?.date, {
            dateFormat: "long",
            withDay: true,
            withTime: true,
          })}
        </h2>
        {notification.data?.viewDate ? (
          <span>
            {t("notification.viewed", {
              date: formatDateLocalized(notification.data?.viewDate, {
                dateFormat: "long",
                withTime: true,
              }),
            })}
          </span>
        ) : null}
      </div>
      <div className="space-y-4 rounded border border-primary p-4">
        {notification.data ? (
          <NotificationMessage
            notification={notification.data}
            fromTo={fromTo}
          />
        ) : null}
      </div>
    </div>
  );
}
type NotificationMessageProps = {
  fromTo: FromTo;
  notification:
    | (Omit<UserNotification, "userTo" | "userFrom"> & {
        userFrom: {
          name: string;
          imageUrl: string;
        };
        userTo: {
          name: string;
          imageUrl: string;
        };
      })
    | null;
};

function NotificationMessage({
  notification,
  fromTo,
}: NotificationMessageProps) {
  const utils = api.useContext();
  const { t } = useTranslation("auth");
  const { getName } = useNotificationType();
  if (!notification) return null;
  const notificationId = notification.id;

  async function handleClick(link: string | null, id: string) {
    if (!link) return;
    const sp = new URLSearchParams({ notificationId: id });
    const url = link.concat("?", sp.toString());
    console.log("url", url);
    const res = await fetch(url);
    const json = (await res.json()) as {
      trpcerror: boolean;
      error: string;
      success: string;
    };
    if (json.trpcerror) {
      toast.error(json.error);
    } else if (json.error) {
      toast.error(t(json.error));
    } else if (json.success) {
      toast.success(t(json.success));
      if (notification)
        utils.notifications.getNotificationById.invalidate({
          notificationId,
        });
    }
  }
  const Elem: JSX.Element[] = [];
  Elem.push(
    <div className="badge badge-info">
      {t("notification.notification-type", {
        type: getName(notification.type),
      })}
    </div>,
  );
  Elem.push(<p>{notification.message}</p>);
  if (isDate(notification.answered))
    Elem.push(
      <div className="flex items-center gap-2">
        <span>
          {t("notification.answered", {
            date: formatDateLocalized(notification.answered, {
              dateFormat: "long",
              withTime: true,
            }),
          })}
        </span>
        <span className="badge badge-primary">
          {t(notification.answer ?? "")}
        </span>
      </div>,
    );
  if (
    (notification.type === "NEW_SUBSCRIPTION" ||
      notification.type === "SUBSCRIPTION_REJECTED" ||
      notification.type === "SUBSCRIPTION_VALIDATED") &&
    typeof notification.data === "object"
  ) {
    const sData = notification.data as {
      subscriptionId: string;
      monthly: boolean;
      online: boolean;
    };
    Elem.push(<SubscriptionInfo data={sData} />);
  }

  if (fromTo === "to" && !notification.answered) {
    if (notification.type === "SEARCH_COACH")
      Elem.push(
        <div className="flex items-center gap-2">
          <button
            className="btn btn-success"
            type="button"
            onClick={() =>
              handleClick(
                "/api/notification/acceptSearchCoach",
                notification.id,
              )
            }
          >
            {t("notification.accept")}
          </button>
          <button
            className="btn btn-error"
            type="button"
            onClick={() =>
              handleClick(
                "/api/notification/refuseSearchCoach",
                notification.id,
              )
            }
          >
            {t("notification.refuse")}
          </button>
        </div>,
      );
    if (notification.type === "NEW_SUBSCRIPTION")
      Elem.push(
        <div className="flex items-center gap-2">
          <button
            className="btn btn-success"
            type="button"
            onClick={() =>
              handleClick(
                "/api/notification/validateSubscription",
                notification.id,
              )
            }
          >
            {t("notification.validate")}
          </button>
          <button
            className="btn btn-error"
            type="button"
            onClick={() =>
              handleClick(
                "/api/notification/cancelSubscription",
                notification.id,
              )
            }
          >
            {t("notification.cancel")}
          </button>
        </div>,
      );
  }
  return (
    <>
      {Elem.map((e, idx) => (
        <Fragment key={idx}>{e}</Fragment>
      ))}
    </>
  );
}

type SubscriptionInfoProps = {
  data: { subscriptionId: string; monthly: boolean; online: boolean };
};

function SubscriptionInfo({ data }: SubscriptionInfoProps) {
  const sub = api.subscriptions.getSubscriptionById.useQuery(
    data.subscriptionId,
    { enabled: isCUID(data.subscriptionId) },
  );
  const { t } = useTranslation("auth");

  if (sub.isLoading) return <Spinner />;
  const nextPayment = data.monthly
    ? sub.data?.monthly ?? 0
    : sub.data?.yearly ?? 0;
  const firstPayment = (sub.data?.inscriptionFee ?? 0) + nextPayment;

  return (
    <div>
      <h3>{sub.data?.name}</h3>
      <div>
        {data.monthly ? t("notification.monthly") : t("notification.yearly")}
      </div>
      <div>
        {t(`notification.${data.online ? "payment-online" : "payment-club"}`, {
          firstPayment: formatMoney(firstPayment),
          nextPayment: formatMoney(nextPayment),
        })}
      </div>
    </div>
  );
}

const NOTIFICATION_TYPES: readonly {
  readonly value: NotificationType;
  readonly label: string;
}[] = [
  {
    value: NotificationType.SEARCH_COACH,
    label: "notification.type.search-coach",
  },
  {
    value: NotificationType.COACH_ACCEPT,
    label: "notification.type.coach-accept",
  },
  {
    value: NotificationType.COACH_REFUSE,
    label: "notification.type.coach-refuse",
  },
  {
    value: NotificationType.SEARCH_CLUB,
    label: "notification.type.search-club",
  },
  {
    value: NotificationType.CLUB_ACCEPT,
    label: "notification.type.club-accept",
  },
  {
    value: NotificationType.CLUB_REFUSE,
    label: "notification.type.club-refuse",
  },
  {
    value: NotificationType.NEW_MESSAGE,
    label: "notification.type.new-message",
  },
  {
    value: NotificationType.NEW_SUBSCRIPTION,
    label: "notification.type.new-subscription",
  },
  {
    value: NotificationType.NEW_REQUEST,
    label: "notification.type.new-request",
  },
  {
    value: NotificationType.SUBSCRIPTION_VALIDATED,
    label: "notification.type.subscription-validated",
  },
  {
    value: NotificationType.SUBSCRIPTION_REJECTED,
    label: "notification.type.subscription-rejected",
  },
  {
    value: NotificationType.REQUEST_VALIDATED,
    label: "notification.type.request-validated",
  },
  {
    value: NotificationType.REQUEST_REJECTED,
    label: "notification.type.request-rejected",
  },
];

function useNotificationType() {
  const { t } = useTranslation("auth");
  function getName(type: NotificationType | undefined) {
    if (!type) return "?";
    const nt = NOTIFICATION_TYPES.find((t) => t.value === type);
    return nt?.label ? t(nt.label) : "?";
  }
  function getList() {
    return NOTIFICATION_TYPES.map((nt) => ({
      value: nt.value,
      label: t(nt.label),
    }));
  }
  return { getName, getList };
}

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user)
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
        ["common", "auth"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
