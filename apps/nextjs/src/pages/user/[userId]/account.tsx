import { isCUID } from "@lib/checkValidity";
import { LATITUDE, LONGITUDE } from "@lib/defaultValues";
import { remainingDays } from "@lib/formatDate";
import { formatMoney } from "@lib/formatNumber";
import hslToHex from "@lib/hslToHex";
import useLocalStorage from "@lib/useLocalstorage";
import { ROLE_LIST } from "@lib/useUserInfo";
import { SubscriptionForm } from "@modals/manageUser";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import turfCircle from "@turf/circle";
import AddressSearch from "@ui/addressSearch";
import Confirmation from "@ui/confirmation";
import Modal from "@ui/modal";
import { isDate, startOfToday } from "date-fns";
import type { GetServerSidePropsContext } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { Layer, Map as MapComponent, Marker, Source } from "react-map-gl";
import { toast } from "react-toastify";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";
import { type TThemes } from "~/components/themeSelector";

type FormValues = {
  searchAddress: string;
  longitude: number;
  latitude: number;
  role: Role;
  range: number;
  description: string;
  aboutMe: string;
  coachingActivities: string[];
  publicName: string;
  pricingId: string;
  monthlyPayment: boolean;
  cancelationDate: Date | null;
};

export default function Account() {
  const router = useRouter();
  const { userId } = router.query;
  const [theme] = useLocalStorage<TThemes>("theme", "cupcake");
  const myUserId = (Array.isArray(userId) ? userId[0] : userId) || "";
  const [newActivity, setNewActivity] = useState("");

  const userQuery = api.users.getUserById.useQuery(myUserId, {
    enabled: isCUID(myUserId),
    onSuccess: (data) => {
      reset({
        searchAddress: data?.coachData?.searchAddress ?? "",
        longitude: data?.coachData?.longitude ?? LONGITUDE,
        latitude: data?.coachData?.latitude ?? LATITUDE,
        role: data?.role ?? Role.MEMBER,
        range: data?.coachData?.range ?? 10,
        description: data?.coachData?.description ?? "",
        aboutMe: data?.coachData?.aboutMe ?? "",
        publicName: data?.coachData?.publicName ?? "",
        coachingActivities: data?.coachData?.coachingActivities.map(
          (a) => a.name,
        ),
        pricingId: "",
        monthlyPayment: true,
        cancelationDate: null,
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    setError,
    clearErrors,
  } = useForm<FormValues>();
  const fields = useWatch({
    control,
    defaultValue: {
      role: "MEMBER",
      coachingActivities: [],
    },
  });

  const newPricing = api.pricings.getPricingById.useQuery(
    fields?.pricingId ?? "",
    {
      enabled: isCUID(fields.pricingId),
    },
  );

  const utils = api.useContext();
  const updateUser = api.users.updateUser.useMutation({
    onSuccess() {
      utils.users.getUserById.invalidate(myUserId);
      toast.success(t("user-updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("auth");
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (!isCUID(data.pricingId) && !isCUID(userQuery.data?.pricingId)) {
      setError("pricingId", {
        type: "required",
        message: t("account.pricing-mandatory") ?? "",
      });
      return;
    } else clearErrors("pricingId");
    updateUser.mutate({
      id: myUserId,
      searchAddress: data.searchAddress,
      longitude: data.longitude,
      latitude: data.latitude,
      role: data.role,
      range: Number(data.range),
      description: data.description,
      aboutMe: data.aboutMe,
      coachingActivities: data.coachingActivities,
      publicName: data.publicName,
      pricingId: data.pricingId || (userQuery.data?.pricingId ?? ""),
      monthlyPayment: data.monthlyPayment,
      cancelationDate: data.cancelationDate ?? undefined,
    });
  };

  const circle = useMemo(() => {
    const center = [fields.longitude ?? LONGITUDE, fields.latitude ?? LATITUDE];
    return turfCircle(center, fields.range ?? 10, {
      steps: 64,
      units: "kilometers",
      properties: {},
    });
  }, [fields.latitude, fields.longitude, fields.range]);

  function handleAddActivity() {
    if (newActivity)
      setValue(
        `coachingActivities.${fields.coachingActivities?.length ?? 0}`,
        newActivity,
      );
    setNewActivity("");
  }

  function handleDeleteActivity(idx: number) {
    setValue(
      `coachingActivities`,
      fields.coachingActivities?.filter((_, i) => i !== idx) ?? [],
    );
  }

  return (
    <Layout
      title={t("account.your-account")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="flex items-center justify-between">
        <h1>{t("account.your-account")}</h1>
        <Modal
          title={t("account.payments")}
          buttonIcon={<i className="bx bx-euro bx-sm" />}
          variant="Secondary"
        >
          <h3>{t("account.payments")}</h3>
        </Modal>
      </div>
      <form
        className={`flex flex-col gap-4 xl:grid xl:grid-cols-2 xl:items-start`}
        onSubmit={handleSubmit(onSubmit)}
      >
        <section className={`grid grid-cols-[auto_1fr] gap-2`}>
          <label>{t("account.my-role")}</label>
          {userQuery.data?.role === Role.ADMIN ? (
            <div>{t("account.admin")}</div>
          ) : (
            <select
              className="max-w-xs"
              {...register("role")}
              defaultValue={userQuery.data?.role}
            >
              {ROLE_LIST.filter((rl) => rl.value !== Role.ADMIN).map((rl) => (
                <option key={rl.value} value={rl.value}>
                  {t(rl.label)}
                </option>
              ))}
            </select>
          )}
          {fields?.role === "COACH" || fields.role === "MANAGER_COACH" ? (
            <>
              <label>{t("account.public-name")}</label>
              <input
                {...register("publicName")}
                className="input-bordered input w-full"
              />
              <div className="col-span-2">
                <label className="self-start">
                  {t("account.short-presentation")}
                </label>
                <textarea {...register("description")} rows={3} />
                <label className="self-start">{t("account.about-me")}</label>
                <textarea {...register("aboutMe")} rows={6} />
                <label className="self-start">
                  {t("account.public-activities")}
                </label>
                <div className="input-group">
                  <input
                    className="input-bordered input w-full"
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddActivity();
                      }
                    }}
                  />
                  <span>
                    <i
                      className="bx bx-plus bx-sm cursor-pointer text-primary hover:text-secondary"
                      onClick={handleAddActivity}
                    />
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {fields.coachingActivities?.map((activity, idx) => (
                    <span key={`ACT-${idx}`} className="pill w-fit space-x-2">
                      <span>{activity}</span>
                      <i
                        className="bx bx-trash bx-xs cursor-pointer text-error"
                        onClick={() => handleDeleteActivity(idx)}
                      />
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </section>

        <section>
          {fields?.role === "COACH" || fields.role === "MANAGER_COACH" ? (
            <div className={`mb-2 grid  grid-cols-[auto_1fr] gap-2`}>
              <AddressSearch
                label={t("account.google-address")}
                defaultAddress={fields.searchAddress ?? ""}
                onSearch={(adr) => {
                  setValue("searchAddress", adr.address);
                  setValue("latitude", adr.lat);
                  setValue("longitude", adr.lng);
                }}
                className="col-span-2"
              />
              <div className="col-span-2 flex justify-between">
                <label>{t("account.longitude")}</label>
                <input
                  {...register("longitude")}
                  className="input-bordered input w-full"
                  disabled
                />
                <label>{t("account.latitude")}</label>
                <input
                  {...register("latitude")}
                  className="input-bordered input w-full"
                  disabled
                />
              </div>
              <div className="flex gap-2">
                <label>{t("account.range")}</label>
                <div className="form-control">
                  <div className="input-group">
                    <input
                      type="number"
                      className="input-bordered input"
                      {...register("range")}
                      min={0}
                      max={100}
                    />
                    <span>km</span>
                  </div>
                </div>
              </div>
              <div className="col-span-2 border-2 border-primary">
                <MapComponent
                  initialViewState={{
                    longitude: LONGITUDE,
                    latitude: LATITUDE,
                    zoom: 8,
                  }}
                  style={{ width: "100%", height: "20rem" }}
                  mapStyle="mapbox://styles/mapbox/streets-v9"
                  mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                  attributionControl={false}
                  longitude={fields.longitude}
                  latitude={fields.latitude}
                >
                  <Source type="geojson" data={circle}>
                    <Layer
                      type="fill"
                      paint={{
                        "fill-color": hslToHex(theme, "--p"),
                        "fill-opacity": 0.2,
                      }}
                    />
                    <Layer
                      type="line"
                      paint={{
                        "line-color": hslToHex(theme, "--p"),
                        "line-opacity": 1,
                        "line-width": 2,
                      }}
                    />
                  </Source>
                  <Marker
                    anchor="bottom"
                    longitude={fields.longitude}
                    latitude={fields.latitude}
                  >
                    <i className="bx bxs-map bx-sm text-secondary" />
                  </Marker>
                </MapComponent>
              </div>
            </div>
          ) : null}

          <div className="rounded border border-primary p-4">
            <div className="flex flex-col gap-2">
              <h2>{t("account.plan")}</h2>
              {userQuery.data?.pricingId &&
              userQuery.data.pricing?.roleTarget === fields?.role ? (
                <>
                  <label className="self-start">
                    {t("account.actual-plan")}
                  </label>
                  <div className="flex gap-2">
                    <div className="rounded bg-primary px-4 py-2 text-primary-content">
                      <PlanDetails
                        // Actual pricing
                        monthlyPayment={userQuery.data.monthlyPayment ?? true}
                        name={userQuery.data.pricing?.title ?? null}
                        monthly={userQuery.data.pricing?.monthly ?? null}
                        yearly={userQuery.data.pricing?.yearly ?? null}
                        free={userQuery.data.pricing?.free ?? null}
                      />
                    </div>
                    {userQuery.data.trialUntil &&
                    !userQuery.data.pricing?.free ? (
                      <div className="rounded bg-secondary px-4 py-2 text-secondary-content">
                        {t("account.trial-remaining", {
                          count: remainingDays(userQuery.data.trialUntil),
                        })}
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div>{t("account.no-plan-yet")}</div>
              )}
              {fields.pricingId ? ( // new pricing
                <div className="flex flex-1 flex-col border-2 border-warning p-2">
                  <h4>{t("account.new-plan")}</h4>
                  <div className="rounded bg-warning px-4 py-2 text-center text-warning-content">
                    {newPricing.data ? (
                      <PlanDetails
                        monthlyPayment={fields.monthlyPayment ?? true}
                        name={newPricing.data?.title}
                        monthly={newPricing.data?.monthly}
                        yearly={newPricing.data?.yearly}
                        free={newPricing.data?.free}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}

              <SubscriptionForm
                role={fields.role ?? userQuery.data?.role ?? "MEMBER"}
                subscriptionId={userQuery.data?.pricingId ?? fields.pricingId}
                onNewPlan={(newPId, monthly) => {
                  setValue("pricingId", newPId);
                  setValue("monthlyPayment", monthly);
                  clearErrors("pricingId");
                }}
              />
              {errors.pricingId ? (
                <p className="text-sm text-error">{errors.pricingId.message}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 rounded border border-secondary p-4 text-center">
            <Confirmation
              message={t("account.cancel-plan-message")}
              title={t("account.cancel-plan")}
              variant="Outlined-Secondary"
              buttonIcon={<i className="bx bx-x bx-sm" />}
              textConfirmation={t("account.cancel-plan-confirm")}
              onConfirm={() => setValue("cancelationDate", startOfToday())}
            />
            {isDate(fields.cancelationDate) ? (
              <div className="alert alert-error mt-4">
                <div>
                  <i className="bx bx-error-circle bx-xs" />
                  <span>{t("account.cancelation-requested")}</span>
                </div>
                <div className="flex-none">
                  <button
                    className="btn btn-warning btn-xs"
                    type="button"
                    onClick={() => setValue("cancelationDate", null)}
                  >
                    <i className="bx bx-x bx-xs" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
        <button
          className="btn btn-primary col-span-2 w-fit"
          disabled={updateUser.isLoading}
        >
          {t("account.save-account")}
        </button>
      </form>
    </Layout>
  );
}

type PlanDetailsProps = {
  monthlyPayment: boolean;
  name: string | null;
  monthly: number | null;
  yearly: number | null;
  free: boolean | null;
};

function PlanDetails({
  monthlyPayment,
  name,
  monthly,
  yearly,
  free,
}: PlanDetailsProps) {
  const { t } = useTranslation("auth");
  if (!name) return null;
  return (
    <>
      {name} (
      {free
        ? t("account.free")
        : monthlyPayment
        ? `${formatMoney(monthly)} ${t("account.per-month")}`
        : `${formatMoney(yearly)} ${t("account.per-year")}`}
      )
    </>
  );
}

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "auth", "home"],
        nextI18nConfig,
      )),
    },
  };
}
