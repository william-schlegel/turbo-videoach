import { isCUID } from "@lib/checkValidity";
import { formatDateAsYYYYMMDD } from "@lib/formatDate";
import { api } from "@trpcclient/api";
import Confirmation from "@ui/confirmation";
import Modal, { type TModalVariant } from "@ui/modal";
import Spinner from "@ui/spinner";
import { isDate } from "date-fns";
import { useTranslation } from "next-i18next";
import { useState } from "react";
import {
  useForm,
  useWatch,
  type SubmitErrorHandler,
  type SubmitHandler,
} from "react-hook-form";
import { toast } from "react-toastify";

type CreatePlanningProps = {
  clubId: string;
  variant?: TModalVariant;
};

type CreatePlanningFormValues = {
  name: string;
  startDate: Date;
  endDate: Date;
  forSite: boolean;
  siteId: string;
  forRoom: boolean;
  roomId: string;
};

export const CreatePlanning = ({
  clubId,
  variant = "Primary",
}: CreatePlanningProps) => {
  const utils = api.useContext();
  const createPlanning = api.plannings.createPlanningForClub.useMutation({
    onSuccess: () => {
      utils.plannings.getPlanningsForClub.invalidate(clubId);
      toast.success(t("planning-created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const queryClub = api.clubs.getClubById.useQuery(clubId, {
    enabled: isCUID(clubId),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<CreatePlanningFormValues>();

  const fields = useWatch({ control });

  const { t } = useTranslation("planning");

  const onSubmit: SubmitHandler<CreatePlanningFormValues> = (data) => {
    createPlanning.mutate({
      clubId,
      name: data.name ? data.name : undefined,
      startDate: data.startDate,
      endDate: isDate(data.endDate) ? data.endDate : undefined,
      siteId: data.forSite && data.siteId ? data.siteId : undefined,
      roomId:
        data.forSite && data.siteId && data.forRoom && data.roomId
          ? data.roomId
          : undefined,
    });
  };

  const onError: SubmitErrorHandler<CreatePlanningFormValues> = (errors) => {
    console.error("errors", errors);
  };

  return (
    <Modal
      title={t("create-new-planning")}
      variant={variant}
      handleSubmit={handleSubmit(onSubmit, onError)}
    >
      <h3>{t("create-new-planning")}</h3>
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        className="grid grid-cols-[auto_1fr] gap-2"
      >
        <label>{t("name")}</label>
        <input className="input-bordered input w-full" {...register("name")} />
        <label className="required">{t("start-date")}</label>
        <div className="flex flex-col gap-2">
          <input
            className="input-bordered input w-full"
            {...register("startDate", {
              valueAsDate: true,
              required: t("date-mandatory") ?? true,
            })}
            type="date"
            defaultValue={formatDateAsYYYYMMDD()}
          />
          {errors.startDate ? (
            <p className="text-sm text-error">{t("date-mandatory")}</p>
          ) : null}
        </div>
        <label>{t("end-date")}</label>
        <input
          className="input-bordered input w-full"
          {...register("endDate", { valueAsDate: true })}
          type="date"
        />
        <div className="form-control col-span-2">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              className="checkbox-primary checkbox"
              {...register("forSite")}
              defaultChecked={false}
            />
            <span className="label-text">{t("for-site")}</span>
          </label>
        </div>
        {fields.forSite ? (
          <>
            <label>{t("site")}</label>
            <select {...register("siteId")}>
              {queryClub.data?.sites?.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <div className="form-control col-span-2">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox-primary checkbox"
                  {...register("forRoom")}
                  defaultChecked={false}
                />
                <span className="label-text">{t("for-room")}</span>
              </label>
            </div>
            {fields.forRoom && fields.siteId ? (
              <>
                <label>{t("room")}</label>
                <select {...register("roomId")}>
                  {queryClub.data?.sites
                    ?.find((s) => s.id === fields.siteId)
                    ?.rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                </select>
              </>
            ) : null}
          </>
        ) : null}
      </form>
    </Modal>
  );
};

type UpdatePlanningProps = {
  clubId: string;
  planningId: string;
  variant?: TModalVariant;
  duplicate?: boolean;
};

type UpdatePlanningFormValues = {
  name: string | null;
  startDate: Date;
  endDate?: Date | null;
  siteId?: string | null;
  roomId?: string | null;
};

export function UpdatePlanning({
  clubId,
  planningId,
  variant = "Icon-Outlined-Primary",
  duplicate = false,
}: UpdatePlanningProps) {
  const [siteName, setSiteName] = useState("");
  const [roomName, setRoomName] = useState("");
  const utils = api.useContext();

  const queryPlanning = api.plannings.getPlanningById.useQuery(planningId, {
    onSuccess(data) {
      reset({
        name: data?.name,
        startDate: data?.startDate ?? new Date(Date.now()),
        endDate: data?.endDate,
        siteId: data?.siteId,
        roomId: data?.roomId,
      });
      setSiteName(data?.site?.name ?? "");
      setRoomName(data?.room?.name ?? "");
    },
  });
  const updatePlanning = api.plannings.updatePlanningForClub.useMutation({
    onSuccess: () => {
      utils.plannings.getPlanningsForClub.invalidate(clubId);
      toast.success(t("planning-updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const duplicatePlanning = api.plannings.duplicatePlanningForClub.useMutation({
    onSuccess: () => {
      utils.plannings.getPlanningsForClub.invalidate(clubId);
      toast.success(t("planning-created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdatePlanningFormValues>();

  const { t } = useTranslation("planning");

  const onSubmit: SubmitHandler<UpdatePlanningFormValues> = (data) => {
    if (duplicate) {
      duplicatePlanning.mutate({
        id: planningId,
        name: data.name ? data.name : undefined,
        startDate: data.startDate,
        endDate:
          data.endDate && isDate(data.endDate) ? data.endDate : undefined,
      });
    } else {
      updatePlanning.mutate({
        name: data.name ? data.name : undefined,
        startDate: data.startDate,
        endDate:
          data.endDate && isDate(data.endDate) ? data.endDate : undefined,
      });
    }
  };

  const onError: SubmitErrorHandler<UpdatePlanningFormValues> = (errors) => {
    console.error("errors", errors);
  };

  if (queryPlanning.isLoading) return <Spinner />;
  return (
    <Modal
      title={t(duplicate ? "duplicate-planning" : "update-planning")}
      buttonIcon={
        <i className={`bx ${duplicate ? "bx-duplicate" : "bx-edit"} bx-sm`} />
      }
      handleSubmit={handleSubmit(onSubmit, onError)}
      variant={variant}
    >
      <h3 className="flex gap-2">
        {t(duplicate ? "duplicate-planning" : "update-planning")}
      </h3>
      {siteName ? (
        <div className="mb-2 flex gap-2">
          <span className="badge-primary badge flex gap-2">
            <span>{t("site")}:</span>
            <span>{siteName}</span>
          </span>
          {roomName ? (
            <span className="badge-primary badge flex gap-2">
              <span>{t("room")}:</span>
              <span>{roomName}</span>
            </span>
          ) : null}
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit(onSubmit, onError)}
        className="grid grid-cols-[auto_1fr] gap-2"
      >
        <label>{t("name")}</label>
        <input className="input-bordered input w-full" {...register("name")} />
        <label className="required">{t("start-date")}</label>
        <div className="flex flex-col gap-2">
          <input
            className="input-bordered input w-full"
            {...register("startDate", {
              valueAsDate: true,
              required: t("date-mandatory") ?? true,
            })}
            type="date"
            defaultValue={formatDateAsYYYYMMDD()}
          />
          {errors.startDate ? (
            <p className="text-sm text-error">{t("date-mandatory")}</p>
          ) : null}
        </div>
        <label>{t("end-date")}</label>
        <input
          className="input-bordered input w-full"
          {...register("endDate", { valueAsDate: true })}
          type="date"
        />
      </form>
    </Modal>
  );
}

export function DeletePlanning({
  clubId,
  planningId,
  variant = "Icon-Outlined-Secondary",
}: UpdatePlanningProps) {
  const utils = api.useContext();
  const { t } = useTranslation("planning");

  const deletePlanning = api.plannings.deletePlanning.useMutation({
    onSuccess: () => {
      utils.plannings.getPlanningsForClub.invalidate(clubId);
      toast.success(t("planning-deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("planning-deletion-message")}
      title={t("planning-deletion")}
      onConfirm={() => {
        deletePlanning.mutate(planningId);
      }}
      buttonIcon={<i className="bx bx-trash bx-sm" />}
      variant={variant}
    />
  );
}
