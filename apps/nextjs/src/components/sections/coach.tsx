/* eslint-disable @next/next/no-img-element */
import { isCUID } from "@lib/checkValidity";
import { LATITUDE, LONGITUDE } from "@lib/defaultValues";
import { formatSize } from "@lib/formatNumber";
import hslToHex from "@lib/hslToHex";
import { useWriteFile } from "@lib/useManageFile";
import type { CoachingLevel, CoachingPrice } from "@prisma/client";
import { api } from "@trpcclient/api";
import turfCircle from "@turf/circle";
import ButtonIcon from "@ui/buttonIcon";
import Spinner from "@ui/spinner";
import { useTranslation } from "next-i18next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { Layer, Map as MapComponent, Source } from "react-map-gl";
import { toast } from "react-toastify";
import ThemeSelector, { type TThemes } from "../themeSelector";
import { OfferBadge } from "./coachOffer";

type CoachCreationProps = {
  userId: string;
  pageId: string;
};

type CoachCreationForm = {
  images?: FileList;
  subtitle: string;
  description: string;
  withCertifications: boolean;
  withActivities: boolean;
};

const MAX_SIZE = 1024 * 1024;

export const CoachCreation = ({ userId, pageId }: CoachCreationProps) => {
  const { t } = useTranslation("pages");
  const { register, handleSubmit, control, setValue, reset } =
    useForm<CoachCreationForm>();
  const [imagePreview, setImagePreview] = useState("");
  const queryCoach = api.users.getUserById.useQuery(userId, {
    enabled: isCUID(userId),
    refetchOnWindowFocus: false,
  });
  const queryCoachData = api.pages.getCoachDataForPage.useQuery(userId, {
    enabled: isCUID(userId),
    refetchOnWindowFocus: false,
  });
  const fields = useWatch({ control });
  const [previewTheme, setPreviewTheme] = useState<TThemes>("cupcake");
  const updatePageStyle = api.pages.updatePageStyleForCoach.useMutation({
    onSuccess() {
      toast.success(t("style-saved"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const querySection = api.pages.getPageSection.useQuery(
    { pageId, section: "HERO" },
    {
      onSuccess: (data) => {
        if (!data) return;

        const hc = data?.elements.find((e) => e.elementType === "HERO_CONTENT");
        const options = data?.elements.filter(
          (e) => e.elementType === "OPTION",
        );

        if (hc?.images?.[0]) setImagePreview(hc.images[0].url);
        const resetData: CoachCreationForm = {
          description: hc?.content ?? "",
          subtitle: hc?.subTitle ?? "",
          withActivities:
            options.find((o) => o.title === "activities")?.optionValue ===
            "yes",
          withCertifications:
            options.find((o) => o.title === "certifications")?.optionValue ===
            "yes",
        };
        reset(resetData);
      },
      enabled: isCUID(pageId),
      refetchOnWindowFocus: false,
    },
  );
  const writeFile = useWriteFile(
    queryCoach.data?.id ?? "",
    "PAGE_IMAGE",
    MAX_SIZE,
  );
  const createSectionElement = api.pages.createPageSectionElement.useMutation();
  const updateSectionElement = api.pages.updatePageSectionElement.useMutation({
    onSuccess() {
      toast.success(t("section-updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const deleteUserDocument = api.files.deleteUserDocument.useMutation();

  const onSubmit: SubmitHandler<CoachCreationForm> = async (data) => {
    const hc = querySection?.data?.elements.find(
      (e) => e.elementType === "HERO_CONTENT",
    );
    if (!hc || !querySection.data) {
      toast.error("error hc");
      return;
    }
    const optionActivities = querySection?.data?.elements.find(
      (e) => e.elementType === "OPTION" && e.title === "activities",
    );
    const optionCertifications = querySection?.data?.elements.find(
      (e) => e.elementType === "OPTION" && e.title === "certifications",
    );
    let docId: string | undefined;
    if (data.images?.[0]) {
      if (hc?.images?.[0])
        await deleteUserDocument.mutateAsync({
          userId: hc.images[0].userId,
          documentId: hc.images[0].docId,
        });
      docId = await writeFile(data.images?.[0]);
    }
    await updateSectionElement.mutateAsync({
      id: hc.id,
      subTitle: data.subtitle,
      content: data.description,
      images: docId ? [docId] : undefined,
    });
    if (optionCertifications?.id) {
      await updateSectionElement.mutateAsync({
        id: optionCertifications.id,
        optionValue: data.withCertifications ? "yes" : "no",
      });
    } else {
      createSectionElement.mutate({
        elementType: "OPTION",
        sectionId: querySection.data.id,
        title: "certifications",
        optionValue: data.withCertifications ? "yes" : "no",
      });
    }
    if (optionActivities?.id) {
      await updateSectionElement.mutateAsync({
        id: optionActivities.id,
        optionValue: data.withActivities ? "yes" : "no",
      });
    } else {
      createSectionElement.mutate({
        elementType: "OPTION",
        sectionId: querySection.data.id,
        title: "activities",
        optionValue: data.withActivities ? "yes" : "no",
      });
    }
  };

  useEffect(() => {
    if (fields.images?.length) {
      const image = fields.images[0];
      if (!image) return;
      if (image.size > MAX_SIZE) {
        toast.error(t("image-size-error", { size: formatSize(MAX_SIZE) }));
        setValue("images", undefined);
        return;
      }

      const src = URL.createObjectURL(image);
      setImagePreview(src);
    }
  }, [fields.images, t, setValue]);

  const handleDeleteImage = () => {
    setImagePreview("");
    setValue("images", undefined);
  };

  if (querySection.isLoading) return <Spinner />;

  return (
    <div className="grid w-full auto-rows-auto gap-2 lg:grid-cols-2">
      <div>
        <h3>{t("updating-page")}</h3>
        <form
          className="grid grid-cols-[auto_1fr] gap-2 rounded border border-primary p-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="col-span-2 flex items-start gap-4">
            <div className="flex-1">
              <label>{t("hero.image")}</label>
              <input
                type="file"
                className="file-input-bordered file-input-primary file-input w-full"
                {...register("images")}
                accept="image/*"
              />
              <p className="col-span-2 text-sm text-gray-500">
                {t("image-size", { size: formatSize(MAX_SIZE) })}
              </p>
            </div>
            {imagePreview ? (
              <div className="relative w-40 max-w-full">
                <img src={imagePreview} alt="" />
                <button
                  onClick={handleDeleteImage}
                  className="absolute right-2 bottom-2 z-10"
                >
                  <ButtonIcon
                    iconComponent={<i className="bx bx-trash" />}
                    title={t("hero.delete-image")}
                    buttonVariant="Icon-Secondary"
                    buttonSize="sm"
                  />
                </button>
              </div>
            ) : null}
          </div>
          <label>{t("coach.name")}</label>
          <div className="flex items-center gap-2">
            <span>{queryCoach.data?.coachData?.publicName ?? ""}</span>
            <span className="tooltip" data-tip={t("coach.your-public-name")}>
              <i className="bx bx-info-circle bx-xs" />
            </span>
          </div>
          <label>{t("coach.info")}</label>
          <input
            {...register("subtitle")}
            type="text"
            className="input-bordered input w-full"
          />
          <label>{t("coach.description")}</label>
          <textarea {...register("description")} rows={4} />
          <div className="form-control col-span-2">
            <div className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox-primary checkbox"
                {...register("withCertifications")}
              />
              <label className="label-text">
                {t("coach.with-certifications")}
              </label>
              <span
                className="tooltip"
                data-tip={t("coach.certifications-from-dashboard")}
              >
                <i className="bx bx-info-circle bx-xs" />
              </span>
            </div>
          </div>
          <div className="form-control col-span-2">
            <div className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox-primary checkbox"
                {...register("withActivities")}
              />
              <label className="label-text">{t("coach.with-activities")}</label>
              <span
                className="tooltip"
                data-tip={t("coach.activities-in-profile")}
              >
                <i className="bx bx-info-circle bx-xs" />
              </span>
            </div>
          </div>
          <div className="col-span-2 flex justify-between">
            <button className="btn-primary btn" type="submit">
              {t("save-section")}
            </button>
          </div>
        </form>
      </div>
      <div>
        <div className={`space-y-2`}>
          <h3 className="flex flex-wrap items-center justify-between">
            <span>{t("preview")}</span>
            <ThemeSelector
              onSelect={(t) => setPreviewTheme(t)}
              onSave={(t) => updatePageStyle.mutate({ userId, pageStyle: t })}
            />
          </h3>
          <div data-theme={previewTheme} className="pt-4">
            <PhotoSection
              imageSrc={imagePreview}
              userName={queryCoach.data?.coachData?.publicName}
              info={fields.subtitle}
              description={fields.description}
              email={queryCoach.data?.email}
              phone={queryCoach.data?.phone}
              preview
            />
            <CertificationsAndActivities
              withActivities={!!fields.withActivities}
              withCertifications={!!fields.withCertifications}
              certifications={queryCoachData.data?.certifications ?? []}
              activities={queryCoachData.data?.activities ?? []}
              preview
            />
            <CoachOffers
              offers={queryCoachData.data?.offers ?? []}
              coachData={{
                publicName: queryCoach.data?.coachData?.publicName,
                searchAddress: queryCoach.data?.coachData?.searchAddress,
              }}
              preview
            />
            <MapSection
              longitude={
                queryCoach.data?.coachData?.searchAddress
                  ? queryCoach.data?.coachData?.longitude
                  : undefined
              }
              latitude={
                queryCoach.data?.coachData?.searchAddress
                  ? queryCoach.data?.coachData?.latitude
                  : undefined
              }
              range={queryCoach.data?.coachData?.range ?? 10}
              preview
              theme={previewTheme}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

type CoachDisplayProps = {
  pageId: string;
};

export const CoachDisplay = ({ pageId }: CoachDisplayProps) => {
  const queryPage = api.pages.getCoachPage.useQuery(pageId);
  // const pageData = queryPage.data?.pageData;
  const hero = queryPage.data?.hero;
  const queryImage = api.files.getDocumentUrlById.useQuery(
    hero?.images?.[0]?.id ?? "",
    { enabled: isCUID(hero?.images?.[0]?.id) },
  );

  if (queryPage.isLoading) return <Spinner />;
  if (!queryPage.data) return <div>No page defined for this coach</div>;

  const options = queryPage.data?.options;
  const activities = queryPage.data?.activities;
  const certifications = queryPage.data?.certifications;
  const ca = { certifications, activities };

  return (
    <div
      data-theme={queryPage.data?.pageStyle ?? "light"}
      className="flex min-h-screen flex-col items-center justify-center"
    >
      <Head>
        <title>{queryPage.data?.publicName ?? ""}</title>
      </Head>
      <PhotoSection
        imageSrc={queryImage.data?.url}
        userName={queryPage.data?.publicName}
        info={hero?.subTitle}
        description={hero?.content}
        email={queryPage.data?.email}
        phone={queryPage.data?.phone}
      />
      <CertificationsAndActivities
        withActivities={options.get("activities") === "yes"}
        withCertifications={options.get("certifications") === "yes"}
        certifications={ca.certifications}
        activities={ca.activities}
      />
      <CoachOffers
        offers={queryPage.data?.offers ?? []}
        coachData={{
          publicName: queryPage.data?.publicName,
          searchAddress: queryPage.data?.searchAddress,
        }}
      />
      <MapSection
        longitude={
          queryPage.data?.searchAddress ? queryPage.data?.longitude : undefined
        }
        latitude={
          queryPage.data?.searchAddress ? queryPage.data?.latitude : undefined
        }
        theme={(queryPage.data?.pageStyle as TThemes) ?? "light"}
        range={queryPage.data?.range ?? 10}
      />
    </div>
  );
};

type PhotoSectionProps = {
  imageSrc?: string | null;
  userName?: string | null;
  phone?: string | null;
  email?: string | null;
  info?: string | null;
  description?: string | null;
  preview?: boolean;
};

function PhotoSection({
  imageSrc,
  userName,
  info,
  description,
  preview = false,
  email,
  phone,
}: PhotoSectionProps) {
  const { t } = useTranslation("pages");

  return (
    <section
      className={`grid grid-cols-2 place-content-center ${
        preview ? "gap-6" : "gap-16"
      } p-10`}
    >
      <div className="flex justify-end">
        {imageSrc ? (
          <Image
            src={imageSrc}
            width={preview ? 250 : 600}
            height={preview ? 250 : 600}
            alt={userName ?? "photo"}
            className="w-[clamp(250px,40vw,600px)] rounded-md shadow-md"
          />
        ) : null}
      </div>
      <div className="self-start">
        <p
          className={`${
            preview
              ? "text-3xl"
              : "text-[clamp(2rem,5vw,5rem)] leading-[clamp(3rem,7.5vw,7.5rem)]"
          } font-bold`}
        >
          {userName ?? ""}
        </p>
        <p
          className={`${
            preview
              ? "text-lg"
              : "text-[clamp(1.5rem,2.5vw,3rem)] leading-[clamp(2.25rem,3.75vw,4.5rem)]"
          } font-semibold`}
        >
          {info}
        </p>
        <p className="text-neutral-content">{description}</p>
        {email ? (
          <a
            href={`mailto:${email}`}
            target="_blank"
            rel="noreferrer"
            className={`btn-primary btn-block btn ${
              preview ? "btn-sm my-2 text-xs" : "btn-lg my-4 text-base"
            } gap-4`}
          >
            {t("coach.contact-me-email")}
            <i className={`bx bx-envelope ${preview ? "bx-xs" : "bx-lg"}`} />
          </a>
        ) : null}
        {phone ? (
          <a
            href={`tel:${phone}`}
            target="_blank"
            rel="noreferrer"
            className={`btn-outline btn-secondary btn-block btn ${
              preview ? "btn-sm my-2 text-xs" : "btn-lg my-4 text-base"
            } gap-4`}
          >
            {t("coach.contact-me-phone")}
            <i className={`bx bx-phone ${preview ? "bx-xs" : "bx-lg"}`} />
          </a>
        ) : null}
      </div>
    </section>
  );
}

type CertificationsAndActivitiesProps = {
  withActivities: boolean;
  withCertifications: boolean;
  certifications: { id: string; name: string }[];
  activities: { id: string; name: string }[];
  preview?: boolean;
};

function CertificationsAndActivities({
  withActivities,
  withCertifications,
  certifications,
  activities,
  preview = false,
}: CertificationsAndActivitiesProps) {
  const { t } = useTranslation("pages");
  return (
    <section
      className={`grid ${
        withActivities && withCertifications ? "grid-cols-2" : "grid-cols-1"
      } ${preview ? "gap-6 pb-4" : "gap-16 pb-12"} mx-auto w-fit px-10`}
    >
      {withCertifications && certifications.length ? (
        <div>
          <h3
            className={
              preview
                ? ""
                : "text-[clamp(2rem,3vw,4rem)] leading-[clamp(3.5rem,4.5vw,5.5rem)]"
            }
          >
            {t("coach.coach-certifications")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {certifications.map((certification) => (
              <div key={certification.id} className="pill">
                {certification.name}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {withActivities && activities.length ? (
        <div>
          <h3
            className={
              preview
                ? ""
                : "text-[clamp(2rem,3vw,4rem)] leading-[clamp(3.5rem,4.5vw,5.5rem)]"
            }
          >
            {t("coach.coach-activities")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {activities.map((activity) => (
              <div key={activity.id} className="pill">
                {activity.name}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type MapSectionProps = {
  longitude?: number;
  latitude?: number;
  preview?: boolean;
  theme?: TThemes;
  range: number;
};

function MapSection({
  longitude,
  latitude,
  preview = false,
  range,
  theme = "cupcake",
}: MapSectionProps) {
  const { t } = useTranslation("pages");

  if (!longitude || !latitude) return null;

  const center = [longitude, latitude];
  const circle = turfCircle(center, range, {
    steps: 64,
    units: "kilometers",
    properties: {},
  });

  return (
    <section className={`${preview ? "pt-4" : "pt-24"} w-full bg-base-200`}>
      <div className={`mx-auto max-w-4xl ${preview ? "p-8" : "p-24"}`}>
        <h2
          className={`w-full text-center ${
            preview
              ? ""
              : "text-[clamp(2rem,3vw,4rem)] leading-[clamp(3.5rem,4.5vw,5.5rem)]"
          }`}
        >
          {t("coach.where-to-find-me")}
        </h2>
        <div className="col-span-2 w-full border border-primary">
          <MapComponent
            initialViewState={{
              longitude: LONGITUDE,
              latitude: LATITUDE,
              zoom: 7,
            }}
            style={{ width: "100%", height: preview ? "20rem" : "50vh" }}
            mapStyle="mapbox://styles/mapbox/streets-v9"
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            attributionControl={false}
            longitude={longitude}
            latitude={latitude}
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
          </MapComponent>
        </div>
      </div>
    </section>
  );
}

type CoachOffersProps = {
  offers: (CoachingPrice & {
    coachingLevel: CoachingLevel[];
  })[];
  preview?: boolean;
  coachData: { publicName?: string | null; searchAddress?: string | null };
};

function CoachOffers({ offers, preview, coachData }: CoachOffersProps) {
  const { t } = useTranslation("pages");
  if (!offers.length) return null;
  return (
    <section className={`${preview ? "py-4" : "py-12"} w-full bg-base-200`}>
      <div className={`container mx-auto ${preview ? "py-2 px-8" : "p-8"}`}>
        <h3>{t("coach.coach-offers")}</h3>
        <div className="flex flex-wrap gap-2">
          {offers.map((offer) => (
            <article
              key={offer.id}
              className="card flex-1 bg-base-100 p-4 shadow-xl"
            >
              <div className={`card-body ${preview ? "p-0" : ""}`}>
                <h2 className={`card-title ${preview ? "text-base" : ""}`}>
                  {offer.name}
                </h2>
                {offer?.physical && offer?.myPlace && !preview ? (
                  <OfferBadge
                    variant="My-Place"
                    publicName={coachData.publicName}
                    searchAddress={coachData.searchAddress}
                  />
                ) : null}
                {offer?.physical && offer?.inHouse && !preview ? (
                  <OfferBadge
                    variant="In-House"
                    travelLimit={offer.travelLimit}
                    searchAddress={coachData.searchAddress}
                  />
                ) : null}
                {offer?.physical && offer?.publicPlace && !preview ? (
                  <OfferBadge
                    variant="Public-Place"
                    travelLimit={offer.travelLimit}
                    searchAddress={coachData.searchAddress}
                  />
                ) : null}
                {offer?.webcam && !preview ? (
                  <OfferBadge variant="Webcam" />
                ) : null}
                <p
                  className={
                    preview
                      ? "max-h-10 overflow-hidden text-ellipsis text-xs"
                      : "text-base"
                  }
                >
                  {offer.description}
                </p>
                <div className="card-actions mt-auto justify-end">
                  {preview ? (
                    <button className="btn-primary btn-sm btn">
                      {t("coach.offer-details")}
                    </button>
                  ) : (
                    <Link
                      className="btn-primary btn"
                      href={`/presentation-page/offer/${offer.id}`}
                    >
                      {t("coach.offer-details")}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
