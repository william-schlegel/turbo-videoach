import { isCUID } from "@lib/checkValidity";
import { formatDateAsYYYYMMDD } from "@lib/formatDate";
import { SubscriptionMode, SubscriptionRestriction } from "@prisma/client";
import { api } from "@trpcclient/api";
import Confirmation from "@ui/confirmation";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { type PropsWithoutRef } from "react";
import {
  useForm,
  type FieldErrors,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormGetValues,
  type UseFormRegister,
} from "react-hook-form";
import { toast } from "react-toastify";
import Modal, { type TModalVariant } from "../ui/modal";
import SimpleForm from "../ui/simpleform";

type SubscriptionFormValues = {
  name: string;
  description: string;
  highlight: string;
  startDate: string;
  monthly: number;
  yearly: number;
  cancelationFee: number;
  inscriptionFee: number;
  mode: SubscriptionMode;
  restriction: SubscriptionRestriction;
};

type CreateSubscriptionProps = {
  clubId: string;
};

export const CreateSubscription = ({ clubId }: CreateSubscriptionProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<SubscriptionFormValues>({
    defaultValues: {
      inscriptionFee: 0,
      cancelationFee: 0,
      mode: "ALL_INCLUSIVE",
      monthly: 0,
      yearly: 0,
      startDate: formatDateAsYYYYMMDD(new Date()),
    },
  });
  const utils = api.useContext();
  const { t } = useTranslation("club");

  const createSubscription = api.subscriptions.createSubscription.useMutation({
    onSuccess: () => {
      utils.clubs.getClubById.invalidate(clubId);
      utils.subscriptions.getSubscriptionsForClub.invalidate(clubId);
      toast.success(t("subscription.created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const onSubmit: SubmitHandler<SubscriptionFormValues> = (data) => {
    createSubscription.mutate({
      clubId,
      ...data,
      startDate: new Date(data.startDate),
    });
  };

  const onError: SubmitErrorHandler<SubscriptionFormValues> = (errors) => {
    console.error("errors", errors);
  };

  return (
    <Modal
      title={t("subscription.create")}
      handleSubmit={handleSubmit(onSubmit, onError)}
      errors={errors}
      buttonIcon={<i className="bx bx-plus bx-xs" />}
      onOpenModal={() => reset()}
      className="w-11/12 max-w-3xl"
    >
      <h3>{t("subscription.create-new")}</h3>
      <SubscriptionForm
        register={register}
        errors={errors}
        getValues={getValues}
      />
    </Modal>
  );
};

type UpdateSubscriptionProps = {
  subscriptionId: string;
  clubId: string;
};

export const UpdateSubscription = ({
  subscriptionId,
  clubId,
}: UpdateSubscriptionProps) => {
  const utils = api.useContext();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    getValues,
  } = useForm<SubscriptionFormValues>();
  const querySubscription = api.subscriptions.getSubscriptionById.useQuery(
    subscriptionId,
    {
      enabled: isCUID(subscriptionId),
      onSuccess(data) {
        if (data)
          reset({ ...data, startDate: formatDateAsYYYYMMDD(data.startDate) });
      },
    },
  );
  const updateSubscription = api.subscriptions.updateSubscription.useMutation({
    onSuccess: () => {
      utils.subscriptions.getSubscriptionById.invalidate(subscriptionId);
      utils.subscriptions.getSubscriptionsForClub.invalidate(clubId);
      toast.success(t("subscription.updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("club");

  const onSubmit: SubmitHandler<SubscriptionFormValues> = (data) => {
    updateSubscription.mutate({
      id: subscriptionId,
      ...data,
      startDate: new Date(data.startDate),
    });
  };

  const onError: SubmitErrorHandler<SubscriptionFormValues> = (errors) => {
    console.error("errors", errors);
  };

  return (
    <Modal
      title={t("subscription.update", {
        subscriptionName: querySubscription.data?.name,
      })}
      handleSubmit={handleSubmit(onSubmit, onError)}
      submitButtonText={t("subscription.update")}
      errors={errors}
      buttonIcon={<i className="bx bx-edit bx-sm" />}
      variant={"Icon-Outlined-Primary"}
      className="w-11/12 max-w-3xl"
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-4">
          {t("subscription.update")}
          <span className="text-primary">{querySubscription?.data?.name}</span>
        </h3>
      </div>
      <SubscriptionForm
        register={register}
        errors={errors}
        getValues={getValues}
      />
    </Modal>
  );
};

type PropsUpdateDelete = {
  clubId: string;
  subscriptionId: string;
  variant?: TModalVariant;
};

export const DeleteSubscription = ({
  clubId,
  subscriptionId,
  variant = "Icon-Outlined-Secondary",
}: PropsWithoutRef<PropsUpdateDelete>) => {
  const utils = api.useContext();
  const { data: sessionData } = useSession();
  const { t } = useTranslation("club");

  const deleteSubscription = api.subscriptions.deleteSubscription.useMutation({
    onSuccess: () => {
      utils.clubs.getClubsForManager.invalidate(sessionData?.user?.id ?? "");
      utils.clubs.getClubById.invalidate(clubId);
      toast.success(t("subscription.deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("subscription.deletion-message")}
      title={t("subscription.deletion")}
      buttonIcon={<i className="bx bx-trash bx-sm" />}
      onConfirm={() => {
        deleteSubscription.mutate(subscriptionId);
      }}
      variant={variant}
    />
  );
};

type SubscriptionFormProps = {
  errors?: FieldErrors;
  register: UseFormRegister<SubscriptionFormValues>;
  getValues: UseFormGetValues<SubscriptionFormValues>;
};

function SubscriptionForm({
  errors,
  register,
  getValues,
}: SubscriptionFormProps): JSX.Element {
  const { t } = useTranslation("club");
  return (
    <SimpleForm<SubscriptionFormValues>
      errors={errors}
      register={register}
      fields={[
        {
          label: t("subscription.name"),
          name: "name",
          required: t("subscription.name-mandatory"),
        },
        {
          label: t("subscription.description"),
          name: "description",
          required: true,
          rows: 3,
        },
        {
          label: t("subscription.highlight"),
          name: "highlight",
        },
        {
          label: t("subscription.start-date"),
          name: "startDate",
          type: "date",
          required: t("subscription.start-date-mandatory"),
        },
        {
          label: t("subscription.monthly"),
          name: "monthly",
          type: "number",
          unit: t("subscription.per-month"),
        },
        {
          label: t("subscription.yearly"),
          name: "yearly",
          type: "number",
          unit: t("subscription.per-year"),
        },
        {
          label: t("subscription.inscription-fee"),
          name: "inscriptionFee",
          type: "number",
          unit: "€",
        },
        {
          label: t("subscription.cancelation-fee"),
          name: "cancelationFee",
          type: "number",
          unit: "€",
        },
        {
          label: t("subscription.select-mode"),
          name: "mode",
          component: (
            <select defaultValue={getValues("mode")} {...register("mode")}>
              {SUBSCRIPTION_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {t(mode.label)}
                </option>
              ))}
            </select>
          ),
        },
        {
          label: t("subscription.select-restriction"),
          name: "restriction",
          component: (
            <select
              defaultValue={getValues("restriction")}
              {...register("restriction")}
            >
              {SUBSCRIPTION_RESTRICTION.map((restriction) => (
                <option key={restriction.value} value={restriction.value}>
                  {t(restriction.label)}
                </option>
              ))}
            </select>
          ),
        },
      ]}
    />
  );
}

export const SUBSCRIPTION_MODES = [
  {
    value: SubscriptionMode.ALL_INCLUSIVE,
    label: "subscription.mode.all-inclusive",
  },
  {
    value: SubscriptionMode.ACTIVITY_GROUP,
    label: "subscription.mode.activity-group",
  },
  { value: SubscriptionMode.ACTIVITY, label: "subscription.mode.activity" },
  { value: SubscriptionMode.COURSE, label: "subscription.mode.course" },
  { value: SubscriptionMode.DAY, label: "subscription.mode.day" },
] as const;

export const SUBSCRIPTION_RESTRICTION = [
  {
    value: SubscriptionRestriction.CLUB,
    label: "subscription.restriction.club",
  },
  {
    value: SubscriptionRestriction.SITE,
    label: "subscription.restriction.site",
  },
  {
    value: SubscriptionRestriction.ROOM,
    label: "subscription.restriction.room",
  },
] as const;

export function useSubscriptionMode() {
  const { t } = useTranslation("club");
  function getModeLabel(value?: SubscriptionMode | null) {
    return (
      SUBSCRIPTION_MODES.find((d) => d.value === value)?.label ??
      "subscription.mode.activity-group"
    );
  }

  function getModeName(value?: SubscriptionMode | null) {
    return t(getModeLabel(value));
  }
  return { getModeName, getModeLabel };
}

export function useSubscriptionRestriction() {
  const { t } = useTranslation("club");
  function getRestrictionLabel(value?: SubscriptionRestriction | null) {
    return (
      SUBSCRIPTION_RESTRICTION.find((d) => d.value === value)?.label ??
      "subscription.restriction.club"
    );
  }

  function getRestrictionName(value?: SubscriptionRestriction | null) {
    return t(getRestrictionLabel(value));
  }
  return { getRestrictionName, getRestrictionLabel };
}
