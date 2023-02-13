import { isCUID } from "@lib/checkValidity";
import { LATITUDE, LONGITUDE } from "@lib/defaultValues";
import { formatMoney } from "@lib/formatNumber";
import { api } from "@trpcclient/api";
import ActivitySearch from "@ui/activitySearch";
import AddressSearch from "@ui/addressSearch";
import CollapsableGroup from "@ui/collapsableGroup";
import Rating from "@ui/rating";
import Spinner from "@ui/spinner";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { i18n, useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

type SearchFormValues = {
  activity: string;
  location: string;
  longitude: number;
  latitude: number;
  range: number;
  priceMin: number;
  priceMax: number;
};

const defaultValues: SearchFormValues = {
  activity: "",
  location: "",
  longitude: LONGITUDE,
  latitude: LATITUDE,
  range: 25,
  priceMax: 1000,
  priceMin: 0,
};

function CoachPage(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  props: InferGetServerSidePropsType<typeof getServerSideProps>,
) {
  const { t } = useTranslation("home");
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<SearchFormValues>({
    defaultValues,
  });
  const fields = useWatch({
    control,
    defaultValue: defaultValues,
  });
  const offerQuery = api.coachs.getOffersForCompanies.useQuery(
    {
      activityName: fields.activity,
      locationLat: fields.latitude,
      locationLng: fields.longitude,
      priceMin: fields.priceMin,
      priceMax: fields.priceMax,
      range: fields.range,
    },
    { enabled: false, refetchOnWindowFocus: false },
  );
  const { data } = offerQuery;

  useEffect(() => {
    offerQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.activity, fields.latitude, fields.longitude]);

  function onValid(data: SearchFormValues) {
    console.log("data", data);
    offerQuery.refetch();
  }

  return (
    <Layout>
      <section className="bg-base-100">
        <div className="container mx-auto">
          <h1 className="text-5xl font-bold">{t("company-title")}</h1>
          <p className="py-6 text-lg">{t("company-text")}</p>
          <form
            className="mx-auto w-fit rounded border border-base-300 bg-base-100 p-4 shadow-xl"
            onSubmit={handleSubmit(onValid)}
          >
            <div className="mb-2 flex justify-around">
              <CollapsableGroup
                groupName={`${t("price-range")} (${formatMoney(
                  fields.priceMax,
                )})`}
                className="w-fit"
              >
                <input
                  type="range"
                  min="0"
                  max="1000"
                  {...register("priceMax", { valueAsNumber: true })}
                  className="range range-primary flex-1"
                />
              </CollapsableGroup>
              <CollapsableGroup
                groupName={`${t("distance-range")} (${
                  fields.range?.toFixed(0) ?? "0"
                }km)`}
                className="w-fit"
              >
                <input
                  type="range"
                  min="0"
                  max="100"
                  {...register("range", { valueAsNumber: true })}
                  className="range range-primary flex-1"
                />
              </CollapsableGroup>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <ActivitySearch
                onSearch={(activity) => {
                  setValue("activity", activity.name);
                  offerQuery.refetch();
                }}
                onActivityChange={(value) => setValue("activity", value)}
                className="w-[clamp(24rem,25vw,100%)]"
                required
                error={errors.location ? t("common:enter-activity") : ""}
              />
              <AddressSearch
                onSearch={(adr) => {
                  setValue("location", adr.address);
                  setValue("longitude", adr.lng);
                  setValue("latitude", adr.lat);
                  offerQuery.refetch();
                }}
                className="w-[clamp(24rem,25vw,100%)]"
                required
                error={errors.location ? t("common:enter-location") : ""}
              />
              <button className="btn btn-primary">{t("search-coach")}</button>
            </div>
          </form>
          <div className="flex flex-wrap gap-8 py-12">
            {data?.map((offer) => (
              <OfferCard key={offer.id} id={offer.id} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default CoachPage;

function OfferCard({ id }: { id: string }) {
  const { t } = useTranslation("home");
  const offer = api.coachs.getOfferWithDetails.useQuery(id, {
    enabled: isCUID(id),
  });

  if (offer.isLoading) return <Spinner />;
  const listFormatter = new Intl.ListFormat(i18n?.language, {
    style: "short",
  });
  const options: string[] = [];
  const prices: {
    type: "WEBCAM" | "PHYSICAL";
    unit: "H" | "D";
    price: number;
  }[] = [];
  if (offer.data?.physical) {
    options.push(t("coach:offer.physical"));
    if (offer.data.perHourPhysical)
      prices.push({
        type: "PHYSICAL",
        unit: "H",
        price: offer.data.perHourPhysical,
      });
    if (offer.data.perDayPhysical)
      prices.push({
        type: "PHYSICAL",
        unit: "D",
        price: offer.data.perDayPhysical,
      });
  }
  if (offer.data?.webcam) {
    options.push(t("coach:offer.webcam"));
    if (offer.data.perHourWebcam)
      prices.push({
        type: "WEBCAM",
        unit: "H",
        price: offer.data.perHourWebcam,
      });
    if (offer.data.perDayWebcam)
      prices.push({
        type: "WEBCAM",
        unit: "D",
        price: offer.data.perDayWebcam,
      });
  }
  if (offer.data?.inHouse) options.push(t("coach:offer.in-house"));

  return (
    <div className="card w-96 bg-base-100 shadow-xl">
      <figure className="relative">
        <Image
          src={offer.data?.imageUrl ?? "/images/dummy.jpg"}
          alt={offer.data?.coach?.user.name ?? ""}
          width={400}
          height={200}
          className="object-cover object-center"
        />
        <div className="absolute bottom-0 left-0 w-full bg-black bg-opacity-20 px-4 py-2 text-accent">
          <h3>{offer.data?.coach?.publicName}</h3>
          <p className="space-x-2">
            {offer.data?.coach?.searchAddress},
            {listFormatter.format(options).toLocaleLowerCase()}
          </p>
        </div>
      </figure>
      <div className="card-body">
        <Rating note={offer.data?.coach?.rating ?? 5} />
        <h2 className="card-title">{offer.data?.name}</h2>
        <p>{offer.data?.description}</p>
        <div className="flex flex-wrap gap-2">
          {prices.map((price, idx) => (
            <span
              key={`PRICE-${idx}`}
              className="items- flex gap-2 rounded bg-accent px-4 py-2 leading-none text-accent-content"
            >
              <i
                className={`bx ${
                  price.type === "PHYSICAL" ? "bx-user" : "bx-webcam"
                } bx-xs`}
              />
              {formatMoney(price.price)}
              <i
                className={`bx ${
                  price.unit === "H" ? "bx-hourglass" : "bx-calendar-check"
                } bx-xs`}
              />
            </span>
          ))}
          {offer.data?.freeHours ? (
            <span className="items- flex gap-2 rounded bg-accent px-4 py-2 leading-none text-accent-content">
              <i className="bx bx-gift bx-xs" />
              <span>{t("coach:offer.free-hours")}</span>
            </span>
          ) : null}
        </div>
        <div className="card-actions justify-end">
          <Link className="btn btn-primary" href={`/company/${id}`}>
            {t("offer-details")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async ({
  locale,
}: GetServerSidePropsContext) => {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "home", "coach"],
        nextI18nConfig,
      )),
    },
  };
};
