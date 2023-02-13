import { isCUID } from "@lib/checkValidity";
import { formatDateAsYYYYMMDD } from "@lib/formatDate";
import { formatMoney } from "@lib/formatNumber";
import useUserInfo from "@lib/useUserInfo";
import { CoachingTarget, type CoachingLevelList } from "@prisma/client";
import { api } from "@trpcclient/api";
import Confirmation from "@ui/confirmation";
import Modal from "@ui/modal";
import Spinner from "@ui/spinner";
import { useTranslation } from "next-i18next";
import { useEffect, useState, type PropsWithoutRef } from "react";
import {
  useForm,
  useWatch,
  type SubmitErrorHandler,
  type SubmitHandler,
} from "react-hook-form";
import { toast } from "react-toastify";

type OfferFormValues = {
  name: string;
  target: CoachingTarget;
  excludingTaxes: boolean;
  description: string;
  startDate: string;
  physical: boolean;
  inHouse: boolean;
  myPlace: boolean;
  publicPlace: boolean;
  perHourPhysical: number;
  perDayPhysical: number;
  travelFee: number;
  travelLimit: number;
  webcam: boolean;
  perHourWebcam: number;
  perDayWebcam: number;
  freeHours: number;
  levels: boolean[];
  packs: TPack[];
};

type TPack = {
  nbHours: number;
  packPrice: number;
};

export const CreateOffer = ({ userId }: { userId: string }) => {
  const utils = api.useContext();
  const { t } = useTranslation("coach");
  const [closeModal, setCloseModal] = useState(false);

  const createOffer = api.coachs.createCoachOffer.useMutation({
    async onSuccess() {
      await utils.coachs.getCoachOffers.invalidate(userId);
      toast.success(t("offer.created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: OfferFormValues) => {
    const levels = COACHING_LEVEL.filter((_, idx) => data.levels[idx]).map(
      (l) => l.value,
    );
    createOffer.mutate({
      coachId: userId,
      ...data,
      startDate: new Date(data.startDate),
      levels,
    });
    setCloseModal(true);
  };

  return (
    <Modal
      title={t("offer.create-new")}
      buttonIcon={<i className="bx bx-plus bx-sm" />}
      className="w-11/12 max-w-5xl"
      cancelButtonText=""
      closeModal={closeModal}
      onCloseModal={() => setCloseModal(false)}
    >
      <h3>{t("offer.create-new")}</h3>
      <OfferForm onSubmit={onSubmit} onCancel={() => setCloseModal(true)} />
    </Modal>
  );
};

type PropsUpdateDelete = {
  userId: string;
  offerId: string;
};

export const UpdateOffer = ({
  userId,
  offerId,
}: PropsWithoutRef<PropsUpdateDelete>) => {
  const utils = api.useContext();
  const { t } = useTranslation("coach");
  const [initialData, setInitialData] = useState<OfferFormValues | undefined>();
  const [closeModal, setCloseModal] = useState(false);

  const queryOffer = api.coachs.getOfferById.useQuery(offerId, {
    enabled: isCUID(offerId),
    onSuccess(data) {
      const levels = COACHING_LEVEL.map(
        (l) => !!data?.coachingLevel?.find((cl) => cl.level === l.value),
      );
      setInitialData({
        name: data?.name ?? "",
        description: data?.description ?? "",
        target: data?.target ?? "INDIVIDUAL",
        excludingTaxes: data?.excludingTaxes ?? false,
        startDate: formatDateAsYYYYMMDD(
          data?.startDate ?? new Date(Date.now()),
        ),
        inHouse: data?.inHouse ?? false,
        physical: data?.physical ?? false,
        webcam: data?.webcam ?? false,
        myPlace: data?.myPlace ?? false,
        publicPlace: data?.publicPlace ?? false,
        perHourPhysical: data?.perHourPhysical ?? 0,
        perDayPhysical: data?.perDayPhysical ?? 0,
        perHourWebcam: data?.perHourWebcam ?? 0,
        perDayWebcam: data?.perDayWebcam ?? 0,
        travelFee: data?.travelFee ?? 0,
        travelLimit: data?.travelLimit ?? 0,
        freeHours: data?.freeHours ?? 0,
        levels,
        packs: data?.packs ?? [],
      });
    },
  });

  const updateOffer = api.coachs.updateCoachOffer.useMutation({
    onSuccess: () => {
      utils.coachs.getCoachOffers.invalidate(userId);
      utils.coachs.getOfferById.invalidate(offerId);
      utils.coachs.getOfferWithDetails.invalidate(offerId);
      toast.success(t("offer.updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: OfferFormValues) => {
    const levels = COACHING_LEVEL.filter((_, idx) => data.levels[idx]).map(
      (l) => l.value,
    );
    updateOffer.mutate({
      id: offerId,
      ...data,
      startDate: new Date(data.startDate),
      levels,
    });
    setInitialData(undefined);
    setCloseModal(true);
  };

  return (
    <Modal
      title={t("offer.update")}
      buttonIcon={<i className="bx bx-edit bx-sm" />}
      variant={"Icon-Outlined-Primary"}
      className="w-11/12 max-w-5xl"
      cancelButtonText=""
      closeModal={closeModal}
      onCloseModal={() => setCloseModal(false)}
    >
      <h3>
        {t("offer.update")} {queryOffer.data?.name}
      </h3>
      {initialData ? (
        <OfferForm
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

export const DeleteOffer = ({
  offerId,
  userId,
}: PropsWithoutRef<PropsUpdateDelete>) => {
  const utils = api.useContext();
  const { t } = useTranslation("coach");

  const deleteOffer = api.coachs.deleteCoachOffer.useMutation({
    onSuccess: () => {
      utils.coachs.getCoachOffers.invalidate(userId);
      utils.coachs.getOfferById.invalidate(offerId);
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
      onConfirm={() => {
        deleteOffer.mutate(offerId);
      }}
      buttonIcon={<i className="bx bx-trash bx-sm" />}
      variant={"Icon-Outlined-Secondary"}
    />
  );
};

type OfferFormProps = {
  onSubmit: (data: OfferFormValues) => void;
  onCancel: () => void;
  update?: boolean;
  initialData?: OfferFormValues;
};

function OfferForm({ onSubmit, onCancel, initialData }: OfferFormProps) {
  const { t } = useTranslation("coach");

  const [pack, setPack] = useState<TPack>({ nbHours: 0, packPrice: 0 });
  const defaultValues: OfferFormValues = {
    startDate: formatDateAsYYYYMMDD(new Date(Date.now())),
    name: "",
    target: "INDIVIDUAL",
    excludingTaxes: false,
    description: "",
    inHouse: false,
    physical: false,
    webcam: false,
    myPlace: false,
    publicPlace: false,
    perHourPhysical: 0,
    perDayPhysical: 0,
    perHourWebcam: 0,
    perDayWebcam: 0,
    travelFee: 0,
    travelLimit: 0,
    freeHours: 0,
    levels: Array.from({ length: COACHING_LEVEL.length }, (_, k) => k === 0),
    packs: [],
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    getValues,
    control,
  } = useForm<OfferFormValues>({
    defaultValues,
  });
  const fields = useWatch({
    control,
  });
  const { getName } = useCoachingLevel();
  const { getLabel } = useCoachingTarget();
  const { features } = useUserInfo();

  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  const onSubmitForm: SubmitHandler<OfferFormValues> = (data) => {
    if (!features.includes("COACH_OFFER_COMPANY")) data.target = "INDIVIDUAL";
    onSubmit(data);
    reset();
  };

  const onError: SubmitErrorHandler<OfferFormValues> = (errors) => {
    console.error("errors", errors);
  };

  function setPackValue(pack: TPack, idx: number) {
    setValue(`packs.${idx}.nbHours`, pack.nbHours);
    setValue(`packs.${idx}.packPrice`, pack.packPrice);
  }

  function handleAddPack() {
    setPackValue(pack, fields.packs?.length ?? 0);
  }

  function handleDeletePack(idx: number) {
    const packs: TPack[] = (
      fields.packs?.filter((_, i) => i !== idx) ?? []
    ).map((p) => ({ nbHours: p.nbHours ?? 0, packPrice: p.packPrice ?? 0 }));
    setValue("packs", packs);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmitForm, onError)}
      className="flex flex-col gap-2 @container"
    >
      <div className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
        <div>
          <div className="grid grid-cols-[auto_1fr] gap-1">
            <label className="required">{t("offer.name")}</label>
            <div className="flex flex-1 flex-col gap-2">
              <input
                className="input-bordered input"
                {...register("name", {
                  required: t("offer.name-mandatory") ?? true,
                })}
              />
              {errors.name ? (
                <p className="text-sm text-error">{errors.name.message}</p>
              ) : null}
            </div>
            <label className="required">{t("offer.start-date")}</label>
            <div className="flex flex-1 flex-col gap-2">
              <input
                className="input-bordered input"
                {...register("startDate", {
                  required: t("offer.date-mandatory") ?? true,
                })}
                type="date"
                defaultValue={formatDateAsYYYYMMDD()}
              />
              {errors.startDate ? (
                <p className="text-sm text-error">{errors.startDate.message}</p>
              ) : null}
            </div>
            <label>{t("offer.free-hours")}</label>
            <div className="input-group">
              <input
                {...register("freeHours", {
                  valueAsNumber: true,
                })}
                type={"number"}
                className="input-bordered input w-full"
              />
              <span>h</span>
            </div>

            <label>{t("offer.target")}</label>
            {features.includes("COACH_OFFER_COMPANY") ? (
              <select
                className="flex-1"
                defaultValue={getValues("target")}
                {...register("target")}
              >
                {COACHING_TARGET.map((target) => (
                  <option key={target.value} value={target.value}>
                    {t(target.label)}
                  </option>
                ))}
              </select>
            ) : (
              <span>
                {t(getLabel("INDIVIDUAL"))}
                <span
                  className="tooltip tooltip-error"
                  data-tip={t("common:navigation.limited-plan")}
                >
                  <i className="bx bx-lock bx-xs ml-2" />
                </span>
              </span>
            )}
          </div>
          {fields.target === "COMPANY" ? (
            <div className="form-control col-span-2">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox-primary checkbox"
                  {...register("excludingTaxes")}
                  defaultChecked={false}
                />
                <span className="label-text">{t("offer.excluding-taxes")}</span>
              </label>
            </div>
          ) : null}
        </div>
        <div>
          <label>{t("offer.description")}</label>
          <textarea {...register("description")} rows={4} />
        </div>
      </div>
      <label>{t("offer.levels")}</label>
      <div className="flex flex-wrap gap-2">
        {COACHING_LEVEL.map((level, idx) => (
          <label
            key={level.value}
            className="label flex-1 cursor-pointer justify-start gap-2"
          >
            <input
              type="checkbox"
              className="checkbox-primary checkbox"
              {...register(`levels.${idx}`)}
              defaultChecked={false}
            />
            <span className="label-text">{getName(level.value)}</span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 @xl:grid-cols-3">
        <fieldset className="rounded border border-primary p-4">
          <div>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox-primary checkbox"
                  {...register("physical")}
                  defaultChecked={false}
                />
                <span className="label-text">{t("offer.physical")}</span>
              </label>
            </div>
            {fields.physical ? (
              <>
                <div className="flex gap-2">
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox-primary checkbox"
                        {...register("inHouse")}
                        defaultChecked={false}
                      />
                      <span className="label-text">{t("offer.in-house")}</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox-primary checkbox"
                        {...register("myPlace")}
                        defaultChecked={false}
                      />
                      <span className="label-text">{t("offer.my-place")}</span>
                    </label>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-2">
                      <input
                        type="checkbox"
                        className="checkbox-primary checkbox"
                        {...register("publicPlace")}
                        defaultChecked={false}
                      />
                      <span className="label-text">
                        {t("offer.public-place")}
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <label>{t("offer.tarif")}</label>
                  <div className="input-group mb-2">
                    <input
                      {...register("perHourPhysical", {
                        valueAsNumber: true,
                      })}
                      type={"number"}
                      className="input-bordered input w-full"
                    />
                    <span>€{t("offer.per-hour")}</span>
                  </div>
                  <div className="input-group">
                    <input
                      {...register("perDayPhysical", {
                        valueAsNumber: true,
                      })}
                      type={"number"}
                      className="input-bordered input w-full"
                    />
                    <span>€{t("offer.per-day")}</span>
                  </div>
                  <label>{t("offer.travel-fee")}</label>
                  <div className="input-group">
                    <input
                      {...register("travelFee", { valueAsNumber: true })}
                      type={"number"}
                      className="input-bordered input w-full"
                    />
                    <span>€</span>
                  </div>

                  <label>{t("offer.travel-limit")}</label>
                  <div className="input-group">
                    <input
                      {...register("travelLimit", { valueAsNumber: true })}
                      type={"number"}
                      className="input-bordered input w-full"
                    />
                    <span>km</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </fieldset>
        <fieldset className="flex flex-col rounded border border-primary p-4">
          <div>
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox-primary checkbox"
                  {...register("webcam")}
                  defaultChecked={false}
                />
                <span className="label-text">{t("offer.webcam")}</span>
              </label>
            </div>
            {fields.webcam ? (
              <>
                <div>
                  <label>{t("offer.tarif")}</label>
                  <div className="input-group mb-2">
                    <input
                      {...register("perHourWebcam", {
                        valueAsNumber: true,
                      })}
                      type={"number"}
                      className="input-bordered input w-full"
                    />
                    <span>€{t("offer.per-hour")}</span>
                  </div>
                  <div className="input-group">
                    <input
                      {...register("perDayWebcam", {
                        valueAsNumber: true,
                      })}
                      type={"number"}
                      className="input-bordered input w-full"
                    />
                    <span>€{t("offer.per-day")}</span>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </fieldset>
        <fieldset className="flex flex-col rounded border border-primary p-4">
          <label>{t("offer.packs")}</label>
          <table className="table-compact w-full table-auto bg-base-200">
            <thead>
              <tr>
                <th>{t("offer.nb-hour")}</th>
                <th>{t("offer.tarif")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {fields.packs?.map((pack, idx) => (
                <tr key={idx} className="text-end">
                  <td>{pack.nbHours}</td>
                  <td>{formatMoney(pack.packPrice)}</td>
                  <td>
                    <i
                      className="bx bx-trash bx-xs cursor-pointer text-red-500"
                      onClick={() => handleDeletePack(idx)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grid grid-cols-[auto_1fr]">
            <label>{t("offer.nb-hour")}</label>
            <div className="input-group my-2">
              <input
                value={pack.nbHours}
                onChange={(e) =>
                  setPack((p) => ({
                    ...p,
                    nbHours: e.target.valueAsNumber,
                  }))
                }
                type={"number"}
                className="input-bordered input w-full"
              />
              <span>h</span>
            </div>
            <label>{t("offer.tarif")}</label>
            <div className="input-group mb-2">
              <input
                value={pack.packPrice}
                onChange={(e) =>
                  setPack((p) => ({
                    ...p,
                    packPrice: e.target.valueAsNumber,
                  }))
                }
                type={"number"}
                className="input-bordered input w-full"
              />
              <span>€</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary btn"
            onClick={() => handleAddPack()}
          >
            {t("offer.add-pack")}
          </button>
        </fieldset>
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2">
        <button
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
          {t("offer.save")}
        </button>
      </div>
    </form>
  );
}

const COACHING_LEVEL: readonly { value: CoachingLevelList; label: string }[] = [
  { value: "ALL", label: "level.all" },
  { value: "BEGINNER", label: "level.beginner" },
  { value: "INTERMEDIATE", label: "level.intermediate" },
  { value: "ADVANCED", label: "level.advanced" },
  { value: "EXPERT", label: "level.expert" },
  { value: "COMPETITOR", label: "level.competitor" },
  { value: "PROFESSIONAL", label: "level.professional" },
] as const;

export function useCoachingLevel() {
  const { t } = useTranslation("coach");
  function getLabel(value?: CoachingLevelList | null) {
    return COACHING_LEVEL.find((d) => d.value === value)?.label ?? "level.all";
  }

  function getName(value?: CoachingLevelList | null) {
    return t(getLabel(value));
  }
  return { getName, getLabel };
}

const COACHING_TARGET = [
  { value: CoachingTarget.INDIVIDUAL, label: "target.individual" },
  { value: CoachingTarget.COMPANY, label: "target.company" },
] as const;

export function useCoachingTarget() {
  const { t } = useTranslation("coach");
  function getLabel(value?: CoachingTarget | null) {
    return (
      COACHING_TARGET.find((d) => d.value === value)?.label ??
      "target.individual"
    );
  }

  function getName(value?: CoachingTarget | null) {
    return t(getLabel(value));
  }
  return { getName, getLabel };
}
