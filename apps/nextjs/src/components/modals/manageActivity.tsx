import { isCUID } from "@lib/checkValidity";
import { api } from "@trpcclient/api";
import { type ButtonSize } from "@ui/buttonIcon";
import Spinner from "@ui/spinner";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { toast } from "react-toastify";
import Confirmation from "../ui/confirmation";
import Modal, { getButtonSize, type TModalVariant } from "../ui/modal";

type AddActivityProps = {
  userId: string;
  clubId: string;
  withAdd?: boolean;
  withUpdate?: boolean;
  onSuccess: () => void;
};

const AddActivity = ({
  userId,
  clubId,
  onSuccess,
  withAdd = false,
  withUpdate = false,
}: AddActivityProps) => {
  const [groupId, setGroupId] = useState("");
  const queryGroups = api.activities.getActivityGroupsForUser.useQuery(userId, {
    onSuccess(data) {
      if (groupId === "" && data.length > 0) setGroupId(data[0]?.id || "");
    },
  });
  const queryClubActivities = api.activities.getActivitiesForClub.useQuery(
    {
      clubId,
      userId,
    },
    {
      enabled: isCUID(clubId) && isCUID(userId),
    },
  );
  const updateClubActivities = api.clubs.updateClubActivities.useMutation({
    onSuccess() {
      onSuccess();
    },
  });
  const { t } = useTranslation("club");

  const onSubmit = () => {
    updateClubActivities.mutate({
      id: clubId,
      activities: queryClubActivities.data?.activities.map((a) => a.id) || [],
    });
  };

  return (
    <Modal
      title={t("activity.select-activities")}
      handleSubmit={onSubmit}
      submitButtonText={t("activity.save-activity")}
      buttonIcon={<i className="bx bx-plus bx-xs" />}
      className="w-11/12 max-w-5xl"
    >
      <h3>{t("activity.select-club-activities")}</h3>
      <div className="flex gap-4">
        <aside className="space-y-4">
          <h4>{t("group.group")}</h4>
          <div className="flex max-h-[70vh] flex-col flex-wrap rounded border border-secondary bg-base-100">
            {queryGroups.data?.map((group) => (
              <div
                key={group.id}
                className={`inline-flex cursor-pointer py-4 px-8 ${
                  groupId === group.id
                    ? "bg-primary text-primary-content"
                    : "bg-base-100 text-base-content hover:bg-base-200"
                }`}
              >
                <span tabIndex={0} onClick={() => setGroupId(group.id)}>
                  {group.name}
                </span>
                {withUpdate && !group.default && (
                  <>
                    <UpdateGroup groupId={group.id} userId={userId} />
                    <DeleteGroup groupId={group.id} userId={userId} />
                  </>
                )}
              </div>
            ))}
          </div>
          {withAdd ? <NewGroup userId={userId} /> : null}
        </aside>
        <div className="flex-1 space-y-4">
          <h4>{t("activity.activities")}</h4>
          <div className="flex flex-wrap gap-2">
            {queryClubActivities.data?.activities
              .filter((a) => a.groupId === groupId)
              .map((activity) => (
                <div key={activity.id} className="flex items-center gap-2">
                  <span className="flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-primary-content">
                    <span>{activity.name}</span>
                    {activity.noCalendar ? (
                      <i className="bx bx-calendar-x bx-xs text-accent" />
                    ) : null}
                    {withUpdate && (
                      <>
                        <UpdateActivity
                          clubId={clubId}
                          groupId={groupId}
                          id={activity.id}
                        />
                        <DeleteActivity
                          clubId={clubId}
                          activityId={activity.id}
                        />
                      </>
                    )}
                  </span>
                </div>
              ))}
          </div>
          {withAdd ? <NewActivity clubId={clubId} groupId={groupId} /> : null}
        </div>
      </div>
    </Modal>
  );
};

export default AddActivity;

type NewActivityProps = {
  clubId: string;
  groupId: string;
};

type ActivityFormValues = {
  name: string;
  noCalendar: boolean;
  reservationDuration: number;
};

type ActivityFormProps = {
  onSubmit: (data: ActivityFormValues) => void;
  initialValues?: ActivityFormValues;
  onCancel: () => void;
};

function ActivityForm({
  onSubmit,
  initialValues,
  onCancel,
}: ActivityFormProps) {
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
    reset,
  } = useForm<ActivityFormValues>();
  const fields = useWatch({ control });
  const { t } = useTranslation("club");

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const onSuccess: SubmitHandler<ActivityFormValues> = (data) => {
    onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={() => handleSubmit(onSuccess)} className="space-y-2">
      <input
        className="input-bordered input w-full"
        {...register("name", { required: t("name-mandatory") ?? true })}
      />
      {errors.name && (
        <p className="text-sm text-error">{errors.name.message}</p>
      )}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-4">
          <input
            type="checkbox"
            className="checkbox-primary checkbox"
            {...register("noCalendar")}
          />
          <span className="label-text">{t("activity.no-calendar")}</span>
        </label>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-4">
        {fields.noCalendar ? (
          <>
            <label>{t("activity.duration")}</label>
            <div className="input-group">
              <input
                type="text"
                className="input-bordered input w-full"
                {...register("reservationDuration", { valueAsNumber: true })}
              />
              <span>{t("activity.minutes")}</span>
            </div>
          </>
        ) : null}
      </div>
      <div className="col-span-2 flex items-center justify-end gap-2">
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

const NewActivity = ({ clubId, groupId }: NewActivityProps) => {
  const utils = api.useContext();
  const groupQuery = api.activities.getActivityGroupById.useQuery(groupId, {
    enabled: isCUID(groupId),
  });
  const [close, setClose] = useState(false);
  const createActivity = api.activities.createActivity.useMutation({
    onSuccess: async () => {
      await utils.activities.getActivitiesForClub.invalidate();
      toast.success(t("activity.created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("club");

  function handleSubmit(data: ActivityFormValues) {
    createActivity.mutate({ clubId, groupId, ...data });
    setClose(true);
  }

  return (
    <Modal
      title={t("activity.new")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
    >
      <h3>
        <span>{t("activity.create-group")}</span>
        <span className="text-primary">{groupQuery.data?.name}</span>
      </h3>
      <ActivityForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
      />
    </Modal>
  );
};

type UpdateActivityProps = {
  clubId: string;
  groupId: string;
  id: string;
};

function UpdateActivity({ clubId, groupId, id }: UpdateActivityProps) {
  const [close, setClose] = useState(false);
  const utils = api.useContext();
  const queryActivity = api.activities.getActivityById.useQuery(id, {
    enabled: isCUID(id),
  });
  const updateActivity = api.activities.updateActivity.useMutation({
    onSuccess: async () => {
      await utils.activities.getActivitiesForClub.invalidate();
      toast.success(t("activity.updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("club");

  function handleSubmit(data: ActivityFormValues) {
    updateActivity.mutate({
      id,
      clubId,
      groupId,
      ...data,
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("activity.update")}
      buttonIcon={<i className="bx bx-edit bx-xs" />}
      variant={"Icon-Only-Primary"}
      buttonSize="xs"
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
    >
      <h3>
        <span>{t("activity.update")}</span>
        <span className="text-primary">{queryActivity.data?.name}</span>
      </h3>
      <ActivityForm
        initialValues={{
          name: queryActivity.data?.name ?? "",
          noCalendar: !!queryActivity.data?.noCalendar,
          reservationDuration: queryActivity.data?.reservationDuration ?? 0,
        }}
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
      />
    </Modal>
  );
}

type DeleteActivityProps = {
  clubId: string;
  activityId: string;
};

function DeleteActivity({ clubId, activityId }: DeleteActivityProps) {
  const utils = api.useContext();
  const deleteActivity = api.activities.deleteActivity.useMutation({
    onSuccess: async () => {
      await utils.activities.getActivitiesForClub.invalidate();
      toast.success(t("activity.deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("club");

  return (
    <Confirmation
      title={t("activity.deletion")}
      message={t("activity.deletion-message")}
      onConfirm={() => deleteActivity.mutate({ clubId, activityId })}
      buttonIcon={<i className="bx bx-trash bx-xs" />}
      variant={"Icon-Only-Secondary"}
      textConfirmation={t("activity.deletion-confirmation")}
      buttonSize="xs"
    />
  );
}

type NewGroupProps = {
  userId?: string;
  variant?: TModalVariant;
};

export const NewGroup = ({ userId, variant = "Primary" }: NewGroupProps) => {
  const utils = api.useContext();
  const createGroup = api.activities.createGroup.useMutation({
    onSuccess: async () => {
      userId
        ? await utils.activities.getActivityGroupsForUser.invalidate(userId)
        : await utils.activities.getAllActivityGroups.invalidate();
      toast.success(t("group.created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const { t } = useTranslation("club");

  function addNewGroup() {
    if (name === "") {
      setError(true);
      return;
    }
    setError(false);
    createGroup.mutate({
      name,
      userId,
      default: userId ? false : true,
    });
  }

  return (
    <Modal title={t("group.new")} variant={variant} handleSubmit={addNewGroup}>
      <h3>Créer un nouveau groupe d&apos;activités</h3>
      <input
        className="input-bordered input w-full"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {error && (
        <p className="text-sm text-error">Le nom doit être renseigné</p>
      )}
    </Modal>
  );
};

type UpdateGroupProps = {
  userId?: string;
  groupId: string;
  variant?: TModalVariant;
  size?: ButtonSize;
};

export function UpdateGroup({
  userId,
  groupId,
  variant = "Icon-Outlined-Secondary",
  size = "sm",
}: UpdateGroupProps) {
  const utils = api.useContext();
  const groupQuery = api.activities.getActivityGroupById.useQuery(groupId, {
    enabled: isCUID(groupId),
    onSuccess(data) {
      setName(data?.name ?? "");
      setDefaultGroup(data?.default ?? false);
    },
  });
  const updateGroup = api.activities.updateGroup.useMutation({
    onSuccess: async () => {
      userId
        ? await utils.activities.getActivityGroupsForUser.invalidate(userId)
        : await utils.activities.getAllActivityGroups.invalidate();
      toast.success(t("group.updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const [name, setName] = useState("");
  const [defaultGroup, setDefaultGroup] = useState(false);
  const [error, setError] = useState(false);
  const { t } = useTranslation("club");

  function update() {
    if (name === "") {
      setError(true);
      return;
    }
    setError(false);
    updateGroup.mutate({
      id: groupId,
      name,
      default: userId ? false : defaultGroup ?? false,
    });
  }

  return (
    <Modal
      title={t("group.update")}
      handleSubmit={update}
      buttonIcon={<i className={`bx bx-edit ${getButtonSize(size)}`} />}
      variant={variant}
      buttonSize={size}
    >
      <h3>
        {t("group.update")}&nbsp;
        <span className="text-primary">{groupQuery.data?.name}</span>
      </h3>
      {groupQuery.isLoading ? (
        <Spinner />
      ) : (
        <>
          <input
            className="input-bordered input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="text-sm text-error">{t("name-mandatory")}</p>}
          {userId ? null : (
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  checked={defaultGroup}
                  className="checkbox-primary checkbox"
                  onChange={(e) => setDefaultGroup(e.currentTarget.checked)}
                  disabled={!groupQuery.data?.coachId}
                />
                <span className="label-text">{t("group.default")}</span>
              </label>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

type DeleteGroupProps = {
  userId?: string;
  groupId: string;
  variant?: TModalVariant;
  size?: ButtonSize;
};

export function DeleteGroup({
  groupId,
  userId,
  size = "sm",
  variant = "Icon-Outlined-Secondary",
}: DeleteGroupProps) {
  const utils = api.useContext();
  const deleteGroup = api.activities.deleteGroup.useMutation({
    onSuccess: async () => {
      userId
        ? await utils.activities.getActivityGroupsForUser.invalidate(userId)
        : await utils.activities.getAllActivityGroups.invalidate();
      toast.success(t("group.deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("club");

  return (
    <Confirmation
      title={t("group.deletion")}
      message={t("group.deletion-message")}
      onConfirm={() => deleteGroup.mutate({ groupId })}
      buttonIcon={<i className={`bx bx-trash ${getButtonSize(size)}`} />}
      variant={variant}
      textConfirmation={t("group.deletion-confirmation")}
      buttonSize={size}
    />
  );
}
