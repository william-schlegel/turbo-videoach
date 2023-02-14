/* eslint-disable @next/next/no-img-element */
import { isCUID } from "@lib/checkValidity";
import { formatMoney, formatSize } from "@lib/formatNumber";
import { useWriteFile } from "@lib/useManageFile";
import type { PageSectionElementType } from "@prisma/client";
import { api } from "@trpcclient/api";
import ButtonIcon from "@ui/buttonIcon";
import Confirmation from "@ui/confirmation";
import Modal, { getButtonSize } from "@ui/modal";
import { TextError } from "@ui/simpleform";
import Spinner from "@ui/spinner";
import { useTranslation } from "next-i18next";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import { useDisplaySubscriptionInfo } from "~/pages/manager/[userId]/[clubId]/subscription";
import { List } from "~/pages/member/[userId]";
import ThemeSelector, { type TThemes } from "../themeSelector";

type OfferCreationProps = {
  clubId: string;
  pageId: string;
};

type OfferFormValues = {
  images?: FileList;
  title: string;
  subtitle: string;
  description: string;
  offerId: string;
};

const MAX_SIZE = 1024 * 1024;

export const OfferCreation = ({ clubId, pageId }: OfferCreationProps) => {
  const { t } = useTranslation("pages");
  const utils = api.useContext();
  const [previewTheme, setPreviewTheme] = useState<TThemes>("cupcake");

  const createSection = api.pages.createPageSection.useMutation();
  const querySection = api.pages.getPageSection.useQuery(
    { pageId, section: "OFFERS" },
    {
      onSuccess: (data) => {
        if (!data) {
          createSection.mutate({
            pageId,
            model: "OFFERS",
          });
          utils.pages.getPageSection.refetch({ pageId, section: "OFFERS" });
        }
      },
      refetchOnWindowFocus: false,
    },
  );
  const updatePageStyle = api.pages.updatePageStyleForClub.useMutation({
    onSuccess() {
      toast.success(t("style-saved"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  if (querySection.isLoading) return <Spinner />;

  return (
    <div className="grid w-full auto-rows-auto gap-2 lg:grid-cols-2">
      <div className="space-y-2">
        <h3>{t("offer.offer-section")}</h3>
        {querySection.data?.id ? (
          <>
            <div className="flex flex-wrap gap-2">
              {querySection.data.elements.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded border border-primary p-4"
                >
                  <p>{offer.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <UpdateOffer
                      clubId={clubId}
                      pageId={pageId}
                      offerId={offer.id}
                    />
                    <DeleteOffer
                      clubId={clubId}
                      pageId={pageId}
                      offerId={offer.id}
                    />
                  </div>
                </div>
              ))}
            </div>
            <AddOffer
              clubId={clubId}
              pageId={pageId}
              sectionId={querySection.data.id}
            />
          </>
        ) : null}
      </div>
      <div className={`space-y-2`}>
        <h3 className="flex flex-wrap items-center justify-between">
          <span>{t("preview")}</span>
          <ThemeSelector
            onSelect={(t) => setPreviewTheme(t)}
            onSave={(t) => updatePageStyle.mutate({ clubId, pageStyle: t })}
          />
        </h3>
        <div data-theme={previewTheme}>
          <div className="grid grid-cols-2 gap-4 bg-base-200 p-4">
            {querySection.data?.elements.map((card) => (
              <OfferContentCard
                key={card.id}
                offer={card}
                clubId={clubId}
                preview
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

type OfferProps = {
  pageId: string;
  sectionId: string;
  clubId: string;
};

function AddOffer({ clubId, pageId, sectionId }: OfferProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");
  const [close, setClose] = useState(false);
  const { data: sessionData } = api.auth.getSession.useQuery();

  const createOffer = api.pages.createPageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "OFFERS",
      });
      toast.success(t("offer.offer-created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const saveImage = useWriteFile(
    sessionData?.user?.id ?? "",
    "IMAGE",
    MAX_SIZE,
  );

  async function handleSubmit(data: OfferFormValues) {
    let documentId: string | undefined = undefined;
    if (data.images?.[0]) documentId = await saveImage(data.images[0]);
    createOffer.mutate({
      pageId,
      sectionId,
      elementType: "CARD",
      title: data.title,
      subTitle: data.subtitle,
      content: data.description,
      images: documentId ? [documentId] : undefined,
      optionValue: data.offerId,
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("offer.new-offer")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
    >
      <h3>
        <span>{t("offer.new-offer")}</span>
      </h3>
      <OfferForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
        pageId={pageId}
        clubId={clubId}
      />
    </Modal>
  );
}

type UpdateOfferProps = {
  pageId: string;
  offerId: string;
  clubId: string;
};

function UpdateOffer({ clubId, pageId, offerId }: UpdateOfferProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");
  const [close, setClose] = useState(false);
  const { data: sessionData } = api.auth.getSession.useQuery();
  const [initialData, setInitialData] = useState<OfferFormValues | undefined>();
  const queryOffer = api.pages.getPageSectionElementById.useQuery(offerId, {
    enabled: isCUID(offerId),
    onSuccess(data) {
      setInitialData({
        title: data?.title ?? "",
        subtitle: data?.subTitle ?? "",
        description: data?.content ?? "",
        images: undefined,
        offerId: data?.optionValue ?? "",
      });
    },
    refetchOnWindowFocus: false,
  });

  const updateAG = api.pages.updatePageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "OFFERS",
      });
      toast.success(t("offer.offer-updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const saveImage = useWriteFile(
    sessionData?.user?.id ?? "",
    "IMAGE",
    MAX_SIZE,
  );

  async function handleSubmit(data: OfferFormValues) {
    let documentId: string | undefined = undefined;
    if (data.images?.[0]) documentId = await saveImage(data.images[0]);
    updateAG.mutate({
      id: offerId,
      pageId,
      title: data.title,
      subTitle: data.subtitle,
      content: data.description,
      images: documentId ? [documentId] : undefined,
      optionValue: data.offerId,
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("offer.update-offer")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
      variant="Icon-Outlined-Primary"
      buttonIcon={<i className={`bx bx-edit ${getButtonSize("sm")}`} />}
      buttonSize="sm"
    >
      <h3>
        <span>{t("offer.update-offer")}</span>
      </h3>
      <OfferForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
        initialValues={initialData}
        initialImageUrl={queryOffer.data?.images?.[0]?.url}
        pageId={pageId}
        clubId={clubId}
      />
    </Modal>
  );
}

function DeleteOffer({ pageId, offerId }: UpdateOfferProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");

  const deleteOffer = api.pages.deletePageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "OFFERS",
      });
      toast.success(t("offer.deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("offer.deletion-message")}
      title={t("offer.deletion")}
      buttonIcon={<i className={`bx bx-trash ${getButtonSize("sm")}`} />}
      onConfirm={() => {
        deleteOffer.mutate(offerId);
      }}
      variant={"Icon-Outlined-Secondary"}
      buttonSize={"sm"}
    />
  );
}

type OfferFormProps = {
  onSubmit: (data: OfferFormValues) => void;
  initialValues?: OfferFormValues;
  initialImageUrl?: string;
  onCancel: () => void;
  update?: boolean;
  pageId: string;
  clubId: string;
};

const defaultValues: OfferFormValues = {
  title: "",
  subtitle: "",
  description: "",
  images: undefined,
  offerId: "",
};

function OfferForm({
  onSubmit,
  initialValues,
  onCancel,
  initialImageUrl,
  clubId,
}: OfferFormProps) {
  const { t } = useTranslation("pages");
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
    reset,
    getValues,
    setValue,
  } = useForm<OfferFormValues>({
    defaultValues,
  });
  const fields = useWatch({ control, defaultValue: defaultValues });
  const [imagePreview, setImagePreview] = useState(initialImageUrl);
  const offers = api.subscriptions.getSubscriptionsForClub.useQuery(clubId, {
    enabled: isCUID(clubId),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);

  useEffect(() => {
    if (initialImageUrl) setImagePreview(initialImageUrl);
  }, [initialImageUrl]);

  useEffect(() => {
    if (fields.images?.length) {
      const image = fields.images[0];
      if (!image) return;
      if (image.size > MAX_SIZE) {
        toast.error(t("page:image-size-error", { size: formatSize(MAX_SIZE) }));
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

  const onSuccess: SubmitHandler<OfferFormValues> = (data) => {
    onSubmit({ ...data });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSuccess)}>
      <div className="grid grid-cols-[auto_1fr] place-content-start gap-y-1 space-y-2">
        <label className="self-start">{t("offer.image")}</label>
        <div>
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
          <div className="relative col-span-full flex gap-2">
            <img
              src={imagePreview}
              alt=""
              className="max-h-[10rem] w-full object-contain"
            />
            <button
              className="absolute right-2 bottom-2"
              type="button"
              onClick={handleDeleteImage}
            >
              <ButtonIcon
                iconComponent={<i className="bx bx-trash" />}
                title={t("offer.delete-image")}
                buttonVariant="Icon-Outlined-Secondary"
                buttonSize="md"
              />
            </button>
          </div>
        ) : null}

        <label className="required">{t("offer.title")}</label>
        <div>
          <input
            className="input-bordered input w-full"
            {...register("title", {
              required: t("offer.title-mandatory") ?? true,
            })}
          />
          <TextError err={errors?.title?.message} />
        </div>
        <label>{t("offer.subtitle")}</label>
        <input
          className="input-bordered input w-full"
          {...register("subtitle")}
        />
        <label className="self-start">{t("offer.description")}</label>
        <textarea {...register("description")} rows={4} />
        <label>{t("offer.offer")}</label>
        <select defaultValue={getValues("offerId")} {...register("offerId")}>
          {offers.data?.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offer.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-full mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          className="btn-outline btn btn-secondary"
          onClick={(e) => {
            e.preventDefault();
            reset();
            onCancel();
          }}
        >
          {t("common:cancel")}
        </button>
        <button className="btn btn-primary" type="submit">
          {t("common:save")}
        </button>
      </div>
    </form>
  );
}

type OfferDisplayProps = {
  pageId: string;
  clubId: string;
};

export const OfferDisplayCard = ({ pageId, clubId }: OfferDisplayProps) => {
  const querySection = api.pages.getPageSection.useQuery(
    {
      pageId,
      section: "OFFERS",
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  if (querySection.isLoading) return <Spinner />;
  if (!querySection.data) return <div>Offers section unavailable</div>;

  return (
    <div className="grid grid-flow-col justify-center gap-4 bg-base-200 p-4">
      {querySection.data?.elements
        .filter((e) => e.elementType === "CARD")
        .map((e) => (
          <OfferContentCard key={e.id} offer={e} clubId={clubId} />
        ))}
    </div>
  );
};

type OffersContentCardProps = {
  preview?: boolean;
  offer: OfferContentElement;
  clubId: string;
};

type OfferContentElement = {
  id: string;
  title: string | null;
  subTitle: string | null;
  content: string | null;
  elementType: PageSectionElementType | null;
  link: string | null;
  optionValue: string | null;
  images: {
    docId: string;
    userId: string;
    url: string;
  }[];
};

function OfferContentCard({
  preview = false,
  offer,
  clubId,
}: OffersContentCardProps) {
  const { data: sessionData } = api.auth.getSession.useQuery();
  const offerQuery = api.subscriptions.getSubscriptionById.useQuery(
    offer.optionValue ?? "",
    { enabled: isCUID(offer.optionValue) },
  );
  const { shortInfo, sites, rooms, activityGroups, activities } =
    useDisplaySubscriptionInfo(
      offerQuery.data?.mode,
      offerQuery.data?.restriction,
      offerQuery.data?.activitieGroups.map((ag) => ag.id) ?? [],
      offerQuery.data?.activities.map((ag) => ag.id) ?? [],
      offerQuery.data?.sites.map((ag) => ag.id) ?? [],
      offerQuery.data?.rooms.map((ag) => ag.id) ?? [],
    );
  const { t } = useTranslation("pages");

  return (
    <div
      className={`card ${
        preview ? "card-compact w-full" : "w-96"
      } bg-base-100 shadow-xl`}
    >
      <figure>
        <img src={offer.images[0]?.url} alt={offer.title ?? ""} />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{offer.title}</h2>
        {offer.subTitle ? (
          <p className="font-semibold">{offer.subTitle}</p>
        ) : null}
        {offer.content ? <p>{offer.content}</p> : null}
        {shortInfo ? <p>{shortInfo}</p> : ""}
        <div className="flex gap-2">
          <List label="sites" items={sites} />
          <List label="rooms" items={rooms} />
          <List label="activity-groups" items={activityGroups} />
          <List label="activities" items={activities} />
        </div>
        <div className="grid grid-cols-[auto,1fr] items-center gap-2">
          {offerQuery.data?.monthly ? (
            <>
              <label>{t("club:subscription.monthly")}</label>
              <span>{formatMoney(offerQuery.data?.monthly)}</span>
            </>
          ) : null}
          {offerQuery.data?.yearly ? (
            <>
              <label>{t("club:subscription.yearly")}</label>
              <span>{formatMoney(offerQuery.data?.yearly)}</span>
            </>
          ) : null}
          {offerQuery.data?.inscriptionFee ? (
            <>
              <label>{t("club:subscription.inscription-fee")}</label>
              <span>{formatMoney(offerQuery.data?.inscriptionFee)}</span>
            </>
          ) : null}
          {offerQuery.data?.cancelationFee ? (
            <>
              <label>{t("club:subscription.cancelation-fee")}</label>
              <span>{formatMoney(offerQuery.data?.cancelationFee)}</span>
            </>
          ) : null}
        </div>
        {preview ? (
          <div className="card-actions justify-end">
            <button className="btn btn-primary">{t("offer.select")}</button>
          </div>
        ) : sessionData?.user?.id ? (
          <div>
            <Link
              href={`/user/${
                sessionData.user.id
              }/subscribe?clubId=${clubId}&offerId=${offer.optionValue ?? ""}`}
            >
              <button className="btn btn-primary">{t("offer.select")}</button>
            </Link>
          </div>
        ) : (
          <div>
            <Link href="/user/signin">
              <button className="btn btn-primary">
                {t("offer.connect-to-subscribe")}
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
