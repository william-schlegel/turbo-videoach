/* eslint-disable @next/next/no-img-element */
import { isCUID } from "@lib/checkValidity";
import { LATITUDE, LONGITUDE } from "@lib/defaultValues";
import { formatDateAsYYYYMMDD, formatDateLocalized } from "@lib/formatDate";
import { formatMoney, formatSize } from "@lib/formatNumber";
import { useWriteFile } from "@lib/useManageFile";
import { api } from "@trpcclient/api";
import AddressSearch, { type AddressData } from "@ui/addressSearch";
import type { ButtonSize } from "@ui/buttonIcon";
import ButtonIcon from "@ui/buttonIcon";
import Confirmation from "@ui/confirmation";
import Ribbon from "@ui/ribbon";
import Spinner from "@ui/spinner";
import { format, isDate, isSameDay, startOfToday } from "date-fns";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { useEffect, useState, type PropsWithoutRef } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { Map as MapComponent, Marker } from "react-map-gl";
import { toast } from "react-toastify";
import Modal, { getButtonSize, type TModalVariant } from "../ui/modal";
import { TextError } from "../ui/simpleform";

type EventFormValues = {
  name: string;
  brief: string;
  description: string;
  startDate: string;
  endDate: string;
  startDisplay: string;
  endDisplay: string;
  bannerText: string;
  cancelled: boolean;
  price: number;
  free: boolean;
  address: string;
  searchAddress?: string | null;
  longitude: number;
  latitude: number;
  images?: FileList;
};

const MAX_SIZE = 1024 * 1024;

type CreateEventProps = {
  clubId: string;
};

export const CreateEvent = ({ clubId }: CreateEventProps) => {
  const utils = api.useContext();
  const { t } = useTranslation("club");
  const [close, setClose] = useState(false);
  const { data: sessionData } = useSession();

  const createEvent = api.events.createEvent.useMutation({
    onSuccess: () => {
      utils.dashboards.getManagerDataForUserId.invalidate(
        sessionData?.user?.id,
      );
      toast.success(t("event.created"));
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

  async function handleSubmit(data: EventFormValues) {
    let documentId: string | undefined = undefined;
    if (data.images?.[0]) documentId = await saveImage(data.images[0]);
    createEvent.mutate({
      clubId,
      name: data.name,
      brief: data.brief,
      description: data.description,
      bannerText: data.bannerText,
      cancelled: data.cancelled,
      free: data.free,
      address: data.address,
      searchAddress: data.searchAddress,
      longitude: data.longitude,
      latitude: data.latitude,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      startDisplay: new Date(data.startDisplay),
      endDisplay: new Date(data.endDisplay),
      price: isNaN(data.price) ? 0 : Number(data.price),
      documentId,
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("event.create")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
      className="w-11/12 max-w-4xl"
    >
      <h3>
        <span>{t("event.create-new")}</span>
      </h3>
      <EventForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
      />
    </Modal>
  );
};

export const UpdateEvent = ({
  eventId,
  variant = "Icon-Outlined-Primary",
  buttonSize = "sm",
}: PropsUpdateDelete) => {
  const { data: sessionData } = useSession();
  const utils = api.useContext();
  const { t } = useTranslation("club");
  const [initialData, setInitialData] = useState<EventFormValues | undefined>();
  const [closeModal, setCloseModal] = useState(false);
  const queryEvent = api.events.getEventById.useQuery(eventId, {
    onSuccess(data) {
      setInitialData({
        name: data?.name ?? "",
        brief: data?.brief ?? "",
        description: data?.description ?? "",
        startDate: formatDateAsYYYYMMDD(data?.startDate, true),
        endDate: formatDateAsYYYYMMDD(data?.endDate, true),
        startDisplay: formatDateAsYYYYMMDD(data?.startDisplay, true),
        endDisplay: formatDateAsYYYYMMDD(data?.endDisplay, true),
        bannerText: data?.bannerText ?? "",
        cancelled: !!data?.cancelled,
        price: data?.price ?? 0,
        free: !!data?.free,
        address: data?.address ?? "",
        searchAddress: data?.searchAddress ?? "",
        longitude: data?.longitude ?? LONGITUDE,
        latitude: data?.latitude ?? LATITUDE,
        images: undefined,
      });
    },
    enabled: isCUID(eventId),
  });
  const saveImage = useWriteFile(
    sessionData?.user?.id ?? "",
    "IMAGE",
    MAX_SIZE,
  );

  const updateEvent = api.events.updateEvent.useMutation({
    onSuccess: () => {
      utils.dashboards.getManagerDataForUserId.invalidate(
        sessionData?.user?.id ?? "",
      );
      toast.success(t("event.updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const onSubmit = async (data: EventFormValues) => {
    let documentId: string | undefined = undefined;
    if (data.images?.[0]) documentId = await saveImage(data.images[0]);
    updateEvent.mutate({
      id: eventId,
      name: data.name,
      brief: data.brief,
      description: data.description,
      bannerText: data.bannerText,
      cancelled: data.cancelled,
      free: data.free,
      address: data.address,
      searchAddress: data.searchAddress,
      longitude: data.longitude,
      latitude: data.latitude,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      startDisplay: new Date(data.startDisplay),
      endDisplay: new Date(data.endDisplay),
      price: isNaN(data.price) ? 0 : Number(data.price),
      documentId,
    });
    setInitialData(undefined);
    setCloseModal(true);
  };

  return (
    <Modal
      title={t("event.update")}
      buttonIcon={<i className={`bx bx-edit ${getButtonSize(buttonSize)}`} />}
      variant={variant}
      buttonSize={buttonSize}
      cancelButtonText=""
      closeModal={closeModal}
      onCloseModal={() => setCloseModal(false)}
      className="w-11/12 max-w-4xl"
    >
      <h3>
        {t("event.update")} {queryEvent.data?.name}
      </h3>
      {initialData ? (
        <EventForm
          update={true}
          initialValues={initialData}
          onSubmit={onSubmit}
          onCancel={() => setCloseModal(true)}
          initialImageUrl={queryEvent.data?.imageUrl ?? ""}
        />
      ) : (
        <Spinner />
      )}
    </Modal>
  );
};

type PropsUpdateDelete = {
  clubId: string;
  eventId: string;
  variant?: TModalVariant;
  buttonSize?: ButtonSize;
};

export const DeleteEvent = ({
  clubId,
  eventId,
  variant = "Icon-Outlined-Secondary",
  buttonSize = "sm",
}: PropsWithoutRef<PropsUpdateDelete>) => {
  const utils = api.useContext();
  const { data: sessionData } = useSession();
  const { t } = useTranslation("club");

  const deleteEvent = api.events.deleteEvent.useMutation({
    onSuccess: () => {
      utils.clubs.getClubsForManager.invalidate(sessionData?.user?.id ?? "");
      utils.clubs.getClubById.invalidate(clubId);
      toast.success(t("event.deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("event.deletion-message")}
      title={t("event.deletion")}
      buttonIcon={<i className={`bx bx-trash ${getButtonSize(buttonSize)}`} />}
      onConfirm={() => {
        deleteEvent.mutate(eventId);
      }}
      variant={variant}
      buttonSize={buttonSize}
    />
  );
};

type EventFormProps = {
  onSubmit: (data: EventFormValues) => void;
  initialValues?: EventFormValues;
  initialImageUrl?: string;
  onCancel: () => void;
  update?: boolean;
};

const defaultValues = {
  name: "",
  brief: "",
  description: "",
  startDate: formatDateAsYYYYMMDD(startOfToday(), true),
  endDate: "",
  startDisplay: formatDateAsYYYYMMDD(startOfToday(), true),
  endDisplay: "",
  bannerText: "",
  cancelled: false,
  price: 0,
  free: false,
  address: "",
  searchAddress: "",
  longitude: LONGITUDE,
  latitude: LATITUDE,
  images: undefined,
};

function EventForm({
  onSubmit,
  initialValues,
  onCancel,
  initialImageUrl,
}: EventFormProps): JSX.Element {
  const { t } = useTranslation("club");
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
    reset,
    setValue,
  } = useForm<EventFormValues>({
    defaultValues,
  });
  const fields = useWatch({ control, defaultValue: defaultValues });
  const [imagePreview, setImagePreview] = useState(initialImageUrl);

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

  const onSuccess: SubmitHandler<EventFormValues> = (data) => {
    onSubmit(data);
    reset();
  };

  function setAddress(adr: AddressData) {
    setValue("searchAddress", adr.address);
    setValue("longitude", adr.lng);
    setValue("latitude", adr.lat);
  }

  return (
    <form onSubmit={handleSubmit(onSuccess)} className="grid grid-cols-2 gap-2">
      <div className="grid grid-cols-[auto_1fr] place-content-start gap-y-1">
        <label className="self-start">{t("event.image")}</label>
        <div>
          <input
            type="file"
            className="file-input-bordered file-input-primary file-input w-full"
            {...register("images")}
            accept="image/*"
          />
          <p className="col-span-2 text-sm text-gray-500">
            {t("event.image-size", { size: formatSize(MAX_SIZE) })}
          </p>
        </div>
        {imagePreview ? (
          <div className="relative col-span-full flex gap-2">
            <img
              src={imagePreview}
              alt=""
              className="max-h-[10rem] w-full object-cover"
            />
            <button
              className="absolute right-2 bottom-2"
              type="button"
              onClick={handleDeleteImage}
            >
              <ButtonIcon
                iconComponent={<i className="bx bx-trash" />}
                title={t("event.delete-image")}
                buttonVariant="Icon-Outlined-Secondary"
                buttonSize="md"
              />
            </button>
          </div>
        ) : null}

        <label className="required">{t("event.name")}</label>
        <div>
          <input
            className="input-bordered input w-full"
            {...register("name", {
              required: t("event.name-mandatory") ?? true,
            })}
          />
          {errors.name ? (
            <p className="text-xs text-error">{errors.name.message}</p>
          ) : null}
        </div>
        <label className="required self-start">{t("event.brief")}</label>
        <div>
          <textarea
            {...register("brief", {
              required: t("event.brief-mandatory") ?? true,
            })}
            rows={3}
          />
          <TextError err={errors?.brief?.message} />
        </div>
        <label className="self-start">{t("event.description")}</label>
        <textarea {...register("description")} rows={5} />
      </div>
      <div className="grid grid-cols-[auto_1fr] place-content-start gap-y-1">
        <label className="required">{t("event.start-date")}</label>
        <div>
          <input
            type="datetime-local"
            className="input-bordered input w-full"
            {...register("startDate", {
              required: t("event.date-mandatory") ?? true,
            })}
          />
          <TextError err={errors?.startDate?.message} />
        </div>
        <label className="required">{t("event.end-date")}</label>
        <div>
          <input
            type="datetime-local"
            className="input-bordered input w-full"
            {...register("endDate", {
              required: t("event.date-mandatory") ?? true,
            })}
          />
          <TextError err={errors?.endDate?.message} />
        </div>
        <label className="required">{t("event.start-display")}</label>
        <div>
          <input
            type="datetime-local"
            className="input-bordered input w-full"
            {...register("startDisplay", {
              required: t("event.date-mandatory") ?? true,
            })}
          />
          <TextError err={errors?.startDisplay?.message} />
        </div>
        <label className="required">{t("event.end-display")}</label>
        <div>
          <input
            type="datetime-local"
            className="input-bordered input w-full"
            {...register("endDisplay", {
              required: t("event.date-mandatory") ?? true,
            })}
          />
          <TextError err={errors?.endDisplay?.message} />
        </div>
        <label>{t("event.banner")}</label>
        <input
          className="input-bordered input w-full"
          {...register("bannerText")}
        />
        <div className="form-control col-span-full">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              className="checkbox-primary checkbox"
              {...register("cancelled")}
              defaultChecked={false}
            />
            <span className="label-text">{t("event.cancelled")}</span>
          </label>
        </div>
        <div className="form-control col-span-full">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              className="checkbox-primary checkbox"
              {...register("free")}
              defaultChecked={false}
            />
            <span className="label-text">{t("event.free")}</span>
          </label>
        </div>
        {fields.free ? null : (
          <>
            <label>{t("event.price")}</label>
            <div className="input-group">
              <input
                type="number"
                className="input-bordered input w-full"
                {...register("price")}
              />

              <span>€</span>
            </div>
          </>
        )}
        <label>{t("event.address")}</label>
        <input
          className="input-bordered input w-full"
          {...register("address")}
        />
        <label>{t("event.location")}</label>
        <AddressSearch
          defaultAddress={initialValues?.searchAddress ?? ""}
          iconSearch
          onSearch={(adr) => setAddress(adr)}
        />
      </div>
      <DisplayEventCard imageUrl={imagePreview ?? ""} fields={fields} />
      <div className="col-span-full flex items-center justify-end gap-2">
        <button
          type="button"
          className="btn-outline btn-secondary btn"
          onClick={(e) => {
            e.preventDefault();
            reset();
            onCancel();
          }}
        >
          {t("common:cancel")}
        </button>
        <button className="btn-primary btn" type="submit">
          {t("common:save")}
        </button>
      </div>
    </form>
  );
}

type DisplayEventCard = {
  imageUrl: string;
  fields: Partial<EventFormValues>;
};

function DisplayEventCard({ imageUrl, fields }: DisplayEventCard) {
  const [showMap, setShowMap] = useState(false);
  const { t } = useTranslation("club");

  return (
    <div
      className="relative col-span-full aspect-[4_/_1] w-full rounded border border-primary p-2 text-center text-white"
      style={{
        backgroundImage: `${imageUrl ? `url(${imageUrl})` : "unset"}`,
        backgroundColor: "rgb(0 0 0 / 0.5)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "darken",
      }}
    >
      <h3 className="">{fields.name}</h3>
      <p className="text-lg">{fields.brief}</p>
      <p>{fields.description}</p>
      <p className="text-xl font-bold text-accent">
        <DisplayDate dtStart={fields.startDate} dtEnd={fields.endDate} />
      </p>
      {fields.cancelled ? (
        <p className="absolute left-1/4 top-1/4 bottom-1/4 right-1/4 flex -rotate-12 items-center justify-center bg-error/80 px-20 py-4 text-3xl font-bold text-error-content">
          {t("event.cancelled")}
        </p>
      ) : null}
      {fields.bannerText ? (
        <Ribbon bgColor="accent" offset="1rem" text={fields.bannerText} />
      ) : null}
      <div className="grid grid-cols-2 items-stretch px-4">
        <p className="text-left text-xl font-bold">
          {fields.free
            ? t("event.free")
            : fields.price
            ? t("event.participation-price", {
                price: formatMoney(fields.price),
              })
            : ""}
        </p>
        <p className="space-x-4 text-right text-xl font-bold">
          <span>{fields.address}</span>
          {fields.searchAddress ? (
            <button type="button" onClick={() => setShowMap((prev) => !prev)}>
              <ButtonIcon
                iconComponent={
                  <i className={`bx ${showMap ? "bx-x" : "bx-map"} bx-sm`} />
                }
                title={t("event.view-map")}
                buttonVariant="Icon-Outlined-Secondary"
                buttonSize="md"
              />
            </button>
          ) : null}
        </p>
        <div
          className={`absolute left-0 top-0 bottom-0 ${
            showMap ? "w-1/2" : "w-0"
          }`}
          style={{ transition: "width 200ms ease" }}
        >
          <MapComponent
            initialViewState={{ zoom: 8 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/streets-v9"
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            attributionControl={false}
            longitude={fields.longitude ?? LONGITUDE}
            latitude={fields.latitude ?? LATITUDE}
          >
            <Marker
              longitude={fields.longitude ?? LONGITUDE}
              latitude={fields.latitude ?? LATITUDE}
              anchor="bottom"
            >
              <i className="bx bx-map bx-sm text-secondary" />
            </Marker>
          </MapComponent>
        </div>
      </div>
    </div>
  );
}

export function ShowEventCard({ eventId }: { eventId: string }) {
  const [fields, setFields] = useState<EventFormValues | undefined>(undefined);
  const event = api.events.getEventById.useQuery(eventId, {
    enabled: isCUID(eventId),
    onSuccess(data) {
      if (data)
        setFields({
          name: data.name,
          brief: data.brief,
          description: data.description,
          startDate: formatDateAsYYYYMMDD(data.startDate, true),
          endDate: formatDateAsYYYYMMDD(data.endDate, true),
          startDisplay: formatDateAsYYYYMMDD(data.startDisplay, true),
          endDisplay: formatDateAsYYYYMMDD(data.endDisplay, true),
          bannerText: data.bannerText,
          cancelled: data.cancelled,
          price: data.price,
          free: data.free,
          address: data.address,
          searchAddress: data.searchAddress,
          longitude: data.longitude,
          latitude: data.latitude,
        });
    },
  });
  const { t } = useTranslation("club");

  return (
    <Modal
      title={t("event.show")}
      className="w-11/12 max-w-4xl"
      variant="Icon-Primary"
      buttonSize="sm"
      buttonIcon={<i className="bx bx-show bx-xs" />}
    >
      {event.isLoading ? (
        <Spinner />
      ) : fields ? (
        <DisplayEventCard
          imageUrl={event.data?.imageUrl ?? ""}
          fields={fields}
        />
      ) : (
        <p>{t("event.no-event")}</p>
      )}
    </Modal>
  );
}

type DisplayDateProps = {
  dtStart: string | null | undefined;
  dtEnd: string | null | undefined;
};

function DisplayDate({ dtStart, dtEnd }: DisplayDateProps) {
  const { t } = useTranslation("club");

  if (!dtStart) return null;
  const start = new Date(dtStart);
  if (!isDate(start)) return null;
  if (!dtEnd)
    return (
      <span>
        {t("event.start-at", {
          date: formatDateLocalized(start, {
            withDay: "long",
            dateFormat: "long",
          }),
          hour: format(start, "HH:mm"),
        })}
      </span>
    );
  const end = new Date(dtEnd);
  const sameDay = isSameDay(start, end);
  if (sameDay)
    return (
      <span>
        {t("event.same-day-from-to", {
          date: formatDateLocalized(start, {
            withDay: "long",
            dateFormat: "long",
          }),
          start: format(start, "HH:mm"),
          end: format(end, "HH:mm"),
        })}
      </span>
    );
  return (
    <span>
      {t("event.from-to", {
        start: formatDateLocalized(start, {
          withDay: "long",
          dateFormat: "long",
          withTime: true,
        }),
        end: formatDateLocalized(end, {
          withDay: "long",
          dateFormat: "long",
          withTime: true,
        }),
      })}
    </span>
  );
}
