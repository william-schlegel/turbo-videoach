/* eslint-disable @next/next/no-img-element */
import { isCUID } from "@lib/checkValidity";
import { LATITUDE, LONGITUDE } from "@lib/defaultValues";
import { formatSize } from "@lib/formatNumber";
import { useWriteFile } from "@lib/useManageFile";
import { api } from "@trpcclient/api";
import AddressSearch from "@ui/addressSearch";
import ButtonIcon from "@ui/buttonIcon";
import CollapsableGroup from "@ui/collapsableGroup";
import Confirmation from "@ui/confirmation";
import Modal from "@ui/modal";
import Rating from "@ui/rating";
import Spinner from "@ui/spinner";
import { useTranslation } from "next-i18next";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type PropsWithoutRef } from "react";
import {
  useForm,
  useWatch,
  type SubmitErrorHandler,
  type SubmitHandler,
} from "react-hook-form";
import { Map as MapComponent, Marker } from "react-map-gl";
import { toast } from "react-toastify";
import FindCoach from "../sections/findCoach";

const MAX_SIZE_LOGO = 1024 * 1024;

export const CreateClub = () => {
  const { data: sessionData } = api.auth.getSession.useQuery();
  const userId = sessionData?.user?.id ?? "";
  const utils = api.useContext();
  const { t } = useTranslation("club");
  const [closeModal, setCloseModal] = useState(false);

  const createClub = api.clubs.createClub.useMutation({
    onSuccess: () => {
      utils.clubs.getClubsForManager.invalidate(userId);
      toast.success(t("club.created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const saveLogo = useWriteFile(userId, "IMAGE", MAX_SIZE_LOGO);

  const onSubmit = async (data: ClubFormValues) => {
    let logoId: string | undefined = "";
    if (data.logo?.[0]) logoId = await saveLogo(data.logo[0]);
    createClub.mutate({
      userId,
      name: data.name,
      address: data.address,
      isSite: data.isSite ?? true,
      latitude: data.latitude ?? LATITUDE,
      longitude: data.longitude ?? LONGITUDE,
      searchAddress: data.searchAddress ?? "",
      logoId,
    });
    setCloseModal(true);
  };

  return (
    <Modal
      title={t("club.create-new")}
      buttonIcon={<i className="bx bx-plus bx-sm" />}
      className="w-11/12 max-w-4xl"
      cancelButtonText=""
      closeModal={closeModal}
      onCloseModal={() => setCloseModal(false)}
    >
      <h3>{t("club.create-new")}</h3>
      <p className="py-4">{t("club.enter-new-club-info")}</p>
      <ClubForm onSubmit={onSubmit} onCancel={() => setCloseModal(true)} />
    </Modal>
  );
};

type PropsUpdateDelete = {
  clubId: string;
};

export const UpdateClub = ({ clubId }: PropsWithoutRef<PropsUpdateDelete>) => {
  const { data: sessionData } = api.auth.getSession.useQuery();
  const utils = api.useContext();
  const { t } = useTranslation("club");
  const [initialData, setInitialData] = useState<ClubFormValues | undefined>();
  const [closeModal, setCloseModal] = useState(false);
  const queryClub = api.clubs.getClubById.useQuery(clubId, {
    onSuccess(data) {
      if (data)
        setInitialData({
          address: data?.address ?? "",
          name: data?.name ?? "",
          logoUrl: data.logoUrl,
          deleteLogo: false,
        });
    },
    enabled: isCUID(clubId),
  });
  const saveLogo = useWriteFile(
    queryClub.data?.managerId ?? "",
    "IMAGE",
    MAX_SIZE_LOGO,
  );
  const userId = sessionData?.user?.id ?? "";
  const updateClub = api.clubs.updateClub.useMutation({
    onSuccess: () => {
      utils.clubs.getClubsForManager.invalidate(userId);
      utils.clubs.getClubById.invalidate(clubId);
      toast.success(t("club.updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const deleteLogo = api.files.deleteUserDocument.useMutation();

  const onSubmit = async (data: ClubFormValues) => {
    let logoId: string | null = null;
    if (data.deleteLogo && isCUID(userId) && isCUID(queryClub.data?.logoId))
      await deleteLogo.mutateAsync({
        userId,
        documentId: queryClub.data?.logoId ?? "",
      });
    if (data.logo?.[0]) logoId = (await saveLogo(data.logo[0])) ?? null;
    updateClub.mutate({
      id: clubId,
      name: data.name,
      address: data.address,
      logoId,
    });
    setInitialData(undefined);
    setCloseModal(true);
  };

  return (
    <Modal
      title={t("club.update")}
      buttonIcon={<i className="bx bx-edit bx-sm" />}
      variant={"Icon-Outlined-Primary"}
      cancelButtonText=""
      closeModal={closeModal}
      onCloseModal={() => setCloseModal(false)}
    >
      <h3>
        {t("club.update")} {queryClub.data?.name}
      </h3>
      {initialData ? (
        <ClubForm
          update={true}
          initialData={initialData}
          onSubmit={onSubmit}
          onCancel={() => setCloseModal(true)}
        />
      ) : (
        <Spinner />
      )}
    </Modal>
  );
};

type ClubFormValues = {
  name: string;
  address: string;
  isSite?: boolean;
  searchAddress?: string;
  longitude?: number;
  latitude?: number;
  logo?: FileList;
  logoUrl?: string;
  deleteLogo: boolean;
};

type ClubFormProps = {
  onSubmit: (data: ClubFormValues) => void;
  onCancel: () => void;
  update?: boolean;
  initialData?: ClubFormValues;
};

function ClubForm({ onSubmit, onCancel, update, initialData }: ClubFormProps) {
  const { t } = useTranslation("club");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<ClubFormValues>({
    defaultValues: {
      isSite: true,
    },
  });
  const [imagePreview, setImagePreview] = useState("");
  const fields = useWatch({ control });

  useEffect(() => {
    reset(initialData);
    setImagePreview(initialData?.logoUrl ?? "");
  }, [initialData, reset]);

  useEffect(() => {
    if (fields.logo?.[0]) {
      if (fields.logo[0].size > MAX_SIZE_LOGO) {
        toast.error(t("image-size-error", { size: formatSize(MAX_SIZE_LOGO) }));
        setValue("logo", undefined);
        return;
      }

      const src = URL.createObjectURL(fields.logo[0]);
      setImagePreview(src);
    }
  }, [fields.logo, t, setValue]);

  const handleDeleteImage = () => {
    setImagePreview("");
    setValue("deleteLogo", true);
    setValue("logo", undefined);
  };

  const onSubmitForm: SubmitHandler<ClubFormValues> = (data) => {
    onSubmit(data);
    reset();
    setImagePreview("");
  };

  const onError: SubmitErrorHandler<ClubFormValues> = (errors) => {
    console.error("errors", errors);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmitForm, onError)}
      className={`${
        update || !fields.isSite ? "" : "grid grid-cols-2"
      } items-start gap-4`}
    >
      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <label className="required">{t("club.name")}</label>
        <div>
          <input
            {...register("name", {
              required: t("name-mandatory") ?? true,
            })}
            type={"text"}
            className="input-bordered input w-full"
          />
          {errors.name ? (
            <p className="text-sm text-error">{errors.name.message}</p>
          ) : null}
        </div>
        {update ? null : (
          <div className="form-control col-span-2">
            <label className="label cursor-pointer justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox-primary checkbox"
                {...register("isSite")}
                defaultChecked={true}
              />
              <span className="label-text">{t("club.is-site")}</span>
            </label>
          </div>
        )}

        <label className="required">{t("club.address")}</label>
        <div>
          <input
            {...register("address", {
              required: t("address-mandatory") ?? true,
            })}
            type={"text"}
            className="input-bordered input w-full"
          />
          {errors.address ? (
            <p className="text-sm text-error">{errors.address.message}</p>
          ) : null}
        </div>
        <div className="col-span-2 flex flex-col items-center justify-start gap-4">
          <div className="w-full ">
            <label>{t("club.logo")}</label>
            <input
              type="file"
              className="file-input-bordered file-input-primary file-input w-full"
              {...register("logo")}
              accept="image/*"
            />
            <p className="col-span-2 text-sm text-gray-500">
              {t("club.logo-size", { size: formatSize(MAX_SIZE_LOGO) })}
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
                  title={t("club.delete-logo")}
                  buttonVariant="Icon-Secondary"
                  buttonSize="sm"
                />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {!update && fields.isSite ? (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <AddressSearch
              label={t("club.search-address")}
              defaultAddress={fields.searchAddress}
              onSearch={(adr) => {
                setValue("searchAddress", adr.address);
                setValue("latitude", adr.lat);
                setValue("longitude", adr.lng);
              }}
              className="col-span-2"
              required
            />
          </div>
          <MapComponent
            initialViewState={{ zoom: 8 }}
            style={{ width: "100%", height: "20rem" }}
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
              <i className="bx bx-pin bx-sm text-secondary" />
            </Marker>
          </MapComponent>
        </div>
      ) : null}
      <div className="col-span-2 flex items-center justify-end gap-2">
        <button
          className="btn-outline btn-secondary btn"
          onClick={(e) => {
            e.preventDefault();
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

export const DeleteClub = ({ clubId }: PropsWithoutRef<PropsUpdateDelete>) => {
  const utils = api.useContext();
  const { data: sessionData } = api.auth.getSession.useQuery();
  const userId = sessionData?.user?.id ?? "";
  const { t } = useTranslation("club");

  const deleteClub = api.clubs.deleteClub.useMutation({
    onSuccess: () => {
      utils.clubs.getClubsForManager.invalidate(userId);
      utils.clubs.getClubById.invalidate(clubId);
      toast.success(t("deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("club.deletion-message")}
      title={t("club.deletion")}
      onConfirm={() => {
        deleteClub.mutate(clubId);
      }}
      buttonIcon={<i className="bx bx-trash bx-sm" />}
      variant={"Icon-Outlined-Secondary"}
    />
  );
};

export default CreateClub;

const AddCoachToClubSteps = [
  { content: String.fromCodePoint(0x1f50d), label: "coach.search" },
  { content: String.fromCodePoint(0x2709), label: "coach.write" },
];

type AddCoachToClubProps = { clubId: string; userId: string };

export const AddCoachToClub = ({ clubId, userId }: AddCoachToClubProps) => {
  const createNotifications =
    api.notifications.createNotificationToUsers.useMutation({
      onSuccess() {
        toast.success(t("coach.notification-success"));
      },
      onError(error) {
        toast.error(error.message);
      },
    });
  const [closeModal, setCloseModal] = useState(false);
  const { t } = useTranslation("club");
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [coachIds, setCoachIds] = useState<string[]>([]);

  function handleSendMessage() {
    if (coachIds.length > 0 && message)
      createNotifications.mutate({
        type: "SEARCH_COACH",
        from: userId,
        to: coachIds,
        message: message,
        data: JSON.stringify({ clubId }),
      });
    setCloseModal(true);
    setStep(0);
  }

  return (
    <Modal
      title={t("coach.add")}
      closeModal={closeModal}
      buttonIcon={<i className="bx bx-plus bx-sm" />}
      variant={"Primary"}
      className="w-11/12 max-w-4xl @container"
      onCloseModal={() => {
        setCloseModal(false);
        setStep(0);
      }}
    >
      <h3>{t("coach.find")}</h3>
      <div className="grid grid-cols-[auto,1fr] gap-2">
        <ul className="steps steps-vertical">
          {AddCoachToClubSteps.map((s, idx) => (
            <li
              key={idx}
              data-content={s.content}
              className={`step ${idx <= step ? "step-primary" : ""}`}
            >
              <span className={idx === step ? "font-bold text-primary" : ""}>
                {t(s.label)}
              </span>
            </li>
          ))}
        </ul>
        {step === 0 ? (
          <FindCoach
            onSelectMultiple={(ids) => {
              setCoachIds(ids);
              setStep((prev) => prev + 1);
            }}
          />
        ) : null}
        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <label className="required w-fit">{t("coach.message")}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={t("coach.message-placeholder") ?? ""}
              required
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-primary btn" type="submit">
                {t("coach.write")}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </Modal>
  );
};

type IdName = {
  id: string;
  name: string;
};

type CoachDataPresentationProps = {
  url: string;
  activityGroups: IdName[];
  certifications: { id: string; name: string; modules: IdName[] }[];
  rating: number;
  id: string;
  pageId?: string;
};

export function CoachDataPresentation({
  url,
  activityGroups,
  certifications,
  rating,
  id,
  pageId,
}: CoachDataPresentationProps) {
  const { t } = useTranslation("club");
  return (
    <>
      <Image
        src={url}
        width={300}
        height={300}
        alt=""
        style={{ objectFit: "contain" }}
        className="rounded-md shadow"
      />

      <div className="flex flex-col gap-2">
        <label>{t("activity.activities")}</label>
        <div className="flex flex-wrap gap-2">
          {activityGroups.map((ag) => (
            <span key={ag.id} className="pill bg-base-100">
              {ag.name}
            </span>
          ))}
        </div>
        <label>{t("coach.certifications")}</label>
        <div className="flex flex-wrap gap-2">
          {certifications.map((cert) => (
            <CollapsableGroup
              key={cert.id}
              groupName={cert.name}
              className="bg-base-100 normal-case"
            >
              {cert.modules.map((mod) => (
                <span key={mod.id} className="pill pill-xs">
                  {mod.name}
                </span>
              ))}
            </CollapsableGroup>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <label>{t("coach.rating")}</label>
          <Rating note={rating} />
        </div>
        {pageId ? (
          <Link
            href={`/presentation-page/coach/${id}/${pageId}`}
            target="_blank"
            rel="noreferrer"
          >
            <button className="btn-primary btn flex items-center gap-4">
              <span>{t("coach.view-page")}</span>
              <i className="bx bx-link-external bx-xs" />
            </button>
          </Link>
        ) : null}
      </div>
    </>
  );
}
