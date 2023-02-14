import { isCUID } from "@lib/checkValidity";
import { formatDateLocalized } from "@lib/formatDate";
import { formatMoney } from "@lib/formatNumber";
import { api } from "@trpcclient/api";
import type { GetServerSidePropsContext } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";
import { useDisplaySubscriptionInfo } from "../../manager/[userId]/[clubId]/subscription";
import { List } from "../../member/[userId]";

export default function Profile() {
  const router = useRouter();
  const { clubId, offerId } = router.query;
  const myClubId = (Array.isArray(clubId) ? clubId[0] : clubId) || "";
  const myOfferId = (Array.isArray(offerId) ? offerId[0] : offerId) || "";
  const { data: sessionData } = api.auth.getSession.useQuery();
  const [monthly, setMonthly] = useState(true);
  const [online, setOnline] = useState(false);

  const offerQuery = api.subscriptions.getSubscriptionById.useQuery(myOfferId, {
    enabled: isCUID(myOfferId),
  });
  const clubQuery = api.clubs.getClubById.useQuery(myClubId, {
    enabled: isCUID(myClubId),
  });
  const { shortInfo, sites, rooms, activityGroups, activities } =
    useDisplaySubscriptionInfo(
      offerQuery.data?.mode,
      offerQuery.data?.restriction,
      offerQuery.data?.activitieGroups.map((ag) => ag.id) ?? [],
      offerQuery.data?.activities.map((ag) => ag.id) ?? [],
      offerQuery.data?.sites.map((ag) => ag.id) ?? [],
      offerQuery.data?.rooms.map((ag) => ag.id) ?? [],
    );

  const updateUser = api.users.addSubscriptionWithValidation.useMutation({
    onSuccess() {
      toast.success(t("subscription.subscription-added"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("club");

  function handleSubscribe() {
    if (!sessionData?.user?.id || !myOfferId) return;
    updateUser.mutate({
      userId: sessionData.user.id,
      subscriptionId: myOfferId,
      monthly,
      online,
    });
    cancel();
  }

  function cancel() {
    router.back();
  }

  return (
    <Layout
      title={t("subscription.new-subscription")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1>{t("subscription.new-subscription")}</h1>
      <div className="card w-96 max-w-full bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <h3 className="card-title text-primary">{offerQuery.data?.name}</h3>
            <span className="badge-primary badge">{clubQuery.data?.name}</span>
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
      <div className="space-y-2 rounded border border-primary p-4">
        <h2>{t("subscription.payment")}</h2>
        {offerQuery.data?.inscriptionFee ? (
          <label className="w-fit gap-4">
            {t("subscription.inscription-fee")}
            <span>{formatMoney(offerQuery.data.inscriptionFee)}</span>
          </label>
        ) : null}
        <div className="space-x-4">
          {offerQuery.data?.monthly ? (
            <button
              type="button"
              className={`btn btn-secondary ${monthly ? "" : "btn-outline"}`}
              onClick={() => setMonthly(true)}
            >
              {t("subscription.select-monthly", {
                price: formatMoney(offerQuery.data.monthly),
              })}
            </button>
          ) : null}
          {offerQuery.data?.yearly ? (
            <button
              type="button"
              className={`btn btn-secondary ${monthly ? "btn-outline" : ""}`}
              onClick={() => setMonthly(false)}
            >
              {t("subscription.select-yearly", {
                price: formatMoney(offerQuery.data.yearly),
                date: formatDateLocalized(null, { dateFormat: "month-year" }),
              })}
            </button>
          ) : null}
        </div>
        <div className="space-x-4">
          <button
            type="button"
            className={`btn btn-secondary ${online ? "" : "btn-outline"}`}
            onClick={() => setOnline(true)}
          >
            {t("subscription.payment-online")}
          </button>
          <button
            type="button"
            className={`btn btn-secondary ${online ? "btn-outline" : ""}`}
            onClick={() => setOnline(false)}
          >
            {t("subscription.payment-club")}
          </button>
        </div>
      </div>
      <div className="flex gap-4">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubscribe}
        >
          {t("subscription.subscribe")}
        </button>
        <button
          type="button"
          className="btn-outline btn btn-secondary"
          onClick={cancel}
        >
          {t("subscription.cancel")}
        </button>
      </div>
    </Layout>
  );
}

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "club", "dashboard"],
        nextI18nConfig,
      )),
    },
  };
}
