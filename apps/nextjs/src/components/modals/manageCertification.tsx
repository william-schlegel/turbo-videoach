import { ActivityGroup } from "@acme/db";
import { formatDateAsYYYYMMDD } from "@lib/formatDate";
import { useWriteFile } from "@lib/useManageFile";
import { api } from "@trpcclient/api";
import ButtonIcon, { type ButtonSize } from "@ui/buttonIcon";
import SimpleForm from "@ui/simpleform";
import Spinner from "@ui/spinner";
import { useTranslation } from "next-i18next";
import React, {
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  useForm,
  type SubmitErrorHandler,
  type SubmitHandler,
} from "react-hook-form";
import { toast } from "react-toastify";
import Confirmation from "../ui/confirmation";
import Modal, { getButtonSize, type TModalVariant } from "../ui/modal";

type CertificationFormValues = {
  name: string;
  certificationGroupId: string;
  obtainedIn: Date;
  activityGroups: string[];
  modules: string[];
  manualModule: string;
};

type CreateCertificationProps = {
  userId: string;
};

type OptionItem = {
  id: string;
  selected: boolean;
};

export const CreateCertification = ({ userId }: CreateCertificationProps) => {
  const [groupId, setGroupId] = useState("");
  const [moduleIds, setModuleIds] = useState<Map<string, OptionItem>>(
    new Map(),
  );
  const [activityIds, setActivityIds] = useState<Map<string, OptionItem>>(
    new Map(),
  );
  const [obtentionDate, setObtentionDate] = useState<Date>(
    new Date(Date.now()),
  );
  const [file, setFile] = useState<File>();

  const writeFile = useWriteFile(userId, "CERTIFICATION");

  const utils = api.useContext();

  const queryGroups = api.coachs.getCertificationGroups.useQuery(undefined, {
    onSuccess(data) {
      if (groupId === "" && data.length > 0) {
        const grpId = data[0]?.id || "";
        setGroupId(grpId);
        const mIds = new Map<string, OptionItem>();
        for (const m of data?.find((g) => g.id === grpId)?.modules ?? []) {
          mIds.set(m.id, { id: m.id, selected: false });
        }
        setModuleIds(mIds);
      }
    },
  });
  const { t } = useTranslation("coach");
  const addCertification = api.coachs.createCertification.useMutation({
    async onSuccess() {
      toast.success(t("certification-created"));
      await utils.coachs.getCertificationsForCoach.invalidate(userId);
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const selectedGroup = queryGroups.data?.find((g) => g.id === groupId);
  const selectedActivities = new Map<string, ActivityGroup>();

  for (const a of selectedGroup?.modules
    .filter((m) => moduleIds.get(m.id)?.selected)
    .flatMap((m) => m.activityGroups) ?? []) {
    selectedActivities.set(a.id, a);
  }

  const onSubmit = async () => {
    const documentId = await writeFile(file);

    addCertification.mutate({
      userId,
      name: selectedGroup?.name ?? "?",
      obtainedIn: obtentionDate,
      activityGroups: Array.from(activityIds.values())
        .filter((a) => a.selected)
        .map((a) => a.id),
      modules: Array.from(moduleIds.values())
        .filter((m) => m.selected)
        .map((m) => m.id),
      documentId,
    });
  };

  const selectGroup = (grpId: string) => {
    setGroupId(grpId);
    const mIds = new Map<string, OptionItem>();
    for (const m of queryGroups.data?.find((g) => g.id === grpId)?.modules ??
      []) {
      mIds.set(m.id, { id: m.id, selected: false });
    }
    setModuleIds(mIds);
  };

  const toggleModule = (moduleId: string) => {
    const mods = moduleIds;
    const mod = mods.get(moduleId);
    if (mod) {
      mod.selected = !mod.selected;
      setModuleIds(new Map(mods));
      const selectedModules =
        selectedGroup?.modules.filter((m) => mods.get(m.id)?.selected) ?? [];
      const activities = Array.from(
        new Set(
          selectedModules.flatMap((m) => m.activityGroups.map((a) => a.id)) ??
            [],
        ),
      );
      const aIds = new Map<string, OptionItem>();
      for (const a of activities) {
        aIds.set(a, { id: a, selected: false });
      }
      setActivityIds(aIds);
    }
  };

  const toggleActivity = (activityId: string) => {
    const act = activityIds.get(activityId);
    if (act) {
      act.selected = !act.selected;
      setActivityIds(new Map(activityIds));
    }
  };

  const onFileChange = (e: React.FormEvent<HTMLInputElement>) => {
    setFile(e.currentTarget.files?.[0]);
  };

  return (
    <Modal
      title={t("create-certification")}
      handleSubmit={onSubmit}
      submitButtonText={t("save-certifications")}
      buttonIcon={<i className="bx bx-plus bx-sm" />}
      className="w-11/12 max-w-5xl"
    >
      <h3>{t("create-certification")}</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <h4>{t("certification-provider")}</h4>
          <ul className="menu overflow-hidden rounded border border-secondary bg-base-100">
            {queryGroups.data?.map((group) => (
              <li key={group.id}>
                <div className={`flex ${groupId === group.id ? "active" : ""}`}>
                  <button
                    className="flex w-full items-center justify-between"
                    onClick={() => selectGroup(group.id)}
                  >
                    {group.name}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>{t("modules")}</h4>
          <div className="flex flex-wrap gap-2 rounded border border-secondary bg-base-100 p-2">
            {selectedGroup?.modules?.map((mod) => (
              <button
                key={mod.id}
                className={`btn-primary btn normal-case ${
                  moduleIds.get(mod.id)?.selected ? "" : "btn-outline"
                }`}
                onClick={() => toggleModule(mod.id)}
              >
                {mod.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4>{t("activities")}</h4>
          <div className="flex flex-wrap gap-2 rounded border border-secondary bg-base-100 p-2">
            {Array.from(selectedActivities.values()).map((act) => (
              <button
                key={act.id}
                className={`btn-primary btn normal-case ${
                  activityIds.get(act.id)?.selected ? "" : "btn-outline"
                }`}
                onClick={() => toggleActivity(act.id)}
              >
                {act.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <form className={`mt-2 grid grid-cols-2 gap-2`}>
        <div className="flex flex-col">
          <label className="required">{t("obtention-date")}</label>
          <input
            type="date"
            value={formatDateAsYYYYMMDD(obtentionDate)}
            onChange={(e) =>
              setObtentionDate(e.target.valueAsDate ?? new Date(Date.now()))
            }
            required
            className="input-bordered input w-full"
          />
        </div>
        <div className="flex flex-col">
          <label>{t("document")}</label>
          <input
            type="file"
            className="file-input-bordered file-input-primary file-input w-full"
            onChange={onFileChange}
          />
        </div>
      </form>
    </Modal>
  );
};

type UpdateCertificationProps = {
  userId: string;
  certificationId: string;
  variant?: TModalVariant;
  buttonSize?: ButtonSize;
};

export const UpdateCertification = ({
  certificationId,
  userId,
  variant = "Icon-Outlined-Primary",
  buttonSize = "sm",
}: UpdateCertificationProps) => {
  const utils = api.useContext();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CertificationFormValues>();
  const { t } = useTranslation("coach");
  const queryCertification = api.coachs.getCertificationById.useQuery(
    certificationId,
    {
      onSuccess(data) {
        reset({ name: data?.name });
      },
    },
  );
  const updateCertification = api.coachs.updateCertification.useMutation({
    async onSuccess() {
      toast.success(t("certification-updated"));
      await utils.coachs.getCertificationsForCoach.invalidate(userId);
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const onSubmit: SubmitHandler<CertificationFormValues> = (data) => {
    updateCertification.mutate({ id: certificationId, ...data });
  };

  const onError: SubmitErrorHandler<CertificationFormValues> = (errors) => {
    console.error("errors", errors);
  };

  return (
    <Modal
      title={t("update-certification")}
      handleSubmit={handleSubmit(onSubmit, onError)}
      errors={errors}
      buttonIcon={<i className={`bx bx-edit ${getButtonSize(buttonSize)}`} />}
      variant={variant}
      buttonSize={buttonSize}
    >
      <h3>
        {t("update-certification")} {queryCertification.data?.name}
      </h3>
      <SimpleForm
        errors={errors}
        register={register}
        isLoading={queryCertification.isLoading}
        fields={[
          {
            label: t("certification-name"),
            name: "name",
            required: t("name-mandatory"),
          },
        ]}
      />
    </Modal>
  );
};

export const DeleteCertification = ({
  userId,
  certificationId,
  variant = "Icon-Outlined-Secondary",
  buttonSize = "sm",
}: UpdateCertificationProps) => {
  const utils = api.useContext();
  const { t } = useTranslation("coach");

  const deleteCertification = api.coachs.deleteCertification.useMutation({
    onSuccess: () => {
      utils.coachs.getCertificationsForCoach.invalidate(userId);
      toast.success(t("certification-deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("certification-deletion-message")}
      title={t("certification-deletion")}
      onConfirm={() => {
        deleteCertification.mutate(certificationId);
      }}
      buttonIcon={<i className={`bx bx-trash ${getButtonSize(buttonSize)}`} />}
      variant={variant}
      buttonSize={buttonSize}
      textConfirmation={t("certification-confirmation")}
    />
  );
};

type CertificationModuleForm = {
  dbId?: string;
  name: string;
  activityIds: string[];
};

type CertificationGroupForm = {
  name: string;
  modules: CertificationModuleForm[];
};

type CreateCertificationGroupProps = {
  variant?: TModalVariant;
};

const emptyData: CertificationGroupForm = { name: "", modules: [] };

export const CreateCertificationGroup = ({
  variant = "Primary",
}: CreateCertificationGroupProps) => {
  const { t } = useTranslation("admin");
  const utils = api.useContext();
  const [data, setData] = useState<CertificationGroupForm>(emptyData);
  const createGroup = api.coachs.createGroup.useMutation({
    onSuccess: () => {
      utils.coachs.getCertificationGroups.invalidate();
      setData(emptyData);
      toast.success(t("certification.group-created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const onSubmit = () => {
    if (!data) return;
    createGroup.mutate({
      name: data.name,
      modules: data.modules.map((m) => ({
        name: m.name,
        activityIds: m.activityIds,
      })),
    });
  };

  return (
    <Modal
      title={t("certification.new-group")}
      buttonIcon={<i className="bx bx-plus bx-sm" />}
      variant={variant}
      className="w-10/12 max-w-3xl"
      handleSubmit={onSubmit}
    >
      <h3>{t("certification.new-group")}</h3>
      <CertificationGroupForm data={data} setData={setData} />
    </Modal>
  );
};

type UpdateGroupProps = {
  groupId: string;
  variant?: TModalVariant;
};

export function UpdateCertificationGroup({
  groupId,
  variant = "Icon-Outlined-Primary",
}: UpdateGroupProps) {
  const { t } = useTranslation("admin");
  const utils = api.useContext();
  const [data, setData] = useState<CertificationGroupForm>(emptyData);
  const queryGroup = api.coachs.getCertificationGroupById.useQuery(groupId, {
    onSuccess(data) {
      setData({
        name: data?.name ?? "",
        modules:
          data?.modules.map((m) => ({
            dbId: m.id,
            name: m.name,
            activityIds: m.activityGroups.map((g) => g.id),
          })) ?? [],
      });
    },
  });
  const updateGroup = api.coachs.updateGroup.useMutation({
    onSuccess: () => {
      utils.coachs.getCertificationGroups.invalidate();
      setData(emptyData);
      toast.success(t("certification.group-updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const onSubmit = () => {
    updateGroup.mutate({
      id: groupId,
      name: data?.name ?? "",
    });
  };

  return (
    <Modal
      title={t("certification.update-group")}
      buttonIcon={<i className="bx bx-edit bx-sm" />}
      variant={variant}
      className="w-10/12 max-w-3xl"
      handleSubmit={onSubmit}
    >
      <h3>{t("certification.update-group")}</h3>
      {queryGroup.isLoading ? (
        <Spinner />
      ) : (
        <CertificationGroupForm
          data={data}
          setData={setData}
          groupId={groupId}
        />
      )}
    </Modal>
  );
}

type DeleteGroupProps = {
  groupId: string;
};

export function DeleteCertificationGroup({ groupId }: DeleteGroupProps) {
  const utils = api.useContext();
  const deleteGroup = api.coachs.deleteGroup.useMutation({
    onSuccess() {
      utils.coachs.getCertificationGroups.invalidate(),
        toast.success(t("certification.group-deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("admin");

  return (
    <Confirmation
      title={t("coach:group-deletion")}
      message={t("coach:group-deletion-message")}
      onConfirm={() => deleteGroup.mutate(groupId)}
      buttonIcon={<i className="bx bx-trash bx-xs" />}
      variant={"Icon-Outlined-Secondary"}
      textConfirmation={t("coach:group-deletion-confirmation")}
      buttonSize="sm"
    />
  );
}

type CertificationGroupFormProps = {
  data: CertificationGroupForm;
  setData: Dispatch<SetStateAction<CertificationGroupForm>>;
  groupId?: string;
};

function CertificationGroupForm({
  data,
  setData,
  groupId,
}: CertificationGroupFormProps): JSX.Element {
  const { t } = useTranslation("admin");
  const refOpt = useRef<HTMLInputElement>(null);
  const deleteModule = api.coachs.deleteModule.useMutation();
  const agQuery = api.activities.getAllActivityGroups.useQuery();
  const [moduleId, setModuleId] = useState("");
  const [activityIds, setActivityIds] = useState(new Set<string>());
  const [moduleName, setModuleName] = useState("");
  const utils = api.useContext();

  const selectedModule = data.modules.find((m) => m.dbId === moduleId);
  const addActivities = api.coachs.updateActivitiesForModule.useMutation({
    onSuccess() {
      if (groupId) utils.coachs.getCertificationGroupById.invalidate(groupId);
    },
  });

  function handleDeleteModule(id: number) {
    const mod = data.modules[id];
    if (!mod?.dbId?.startsWith("MOD-") && groupId)
      deleteModule.mutate(mod?.dbId ?? "");

    const mods = data.modules.filter((_, idx) => idx !== id);
    setData({ ...data, modules: mods });
  }

  function selectModule(dbId?: string) {
    setModuleId(dbId ?? "");
    const mod = data.modules.find((m) => m.dbId === dbId);
    setActivityIds(new Set(mod?.activityIds));
    setModuleName(mod?.name ?? "");
  }

  function addModule(mod?: CertificationModuleForm) {
    if (!mod) return;
    const mods = data.modules;
    if (!selectedModule) {
      mod.dbId = `MOD-${data.modules.length + 1}`;
      mods.push(mod);
    } else {
      const modIdx = mods.findIndex((m) => m.dbId === selectedModule.dbId);
      if (modIdx >= 0) mods[modIdx] = mod;
    }
    setData({ ...data, modules: mods });
    setActivityIds(new Set());
    setModuleName("");
    setModuleId("");
  }

  function addActivityId(activityId: string) {
    const mod = data.modules.find((m) => m.dbId === moduleId);
    if (!mod) {
      activityIds.add(activityId);
      setActivityIds(new Set(activityIds));
      return;
    }
    mod.activityIds.push(activityId);
    setData({ ...data });
    if (groupId && mod.dbId) {
      addActivities.mutate({
        moduleId: mod.dbId,
        activityIds: mod.activityIds,
      });
    }
  }

  function removeActivityId(activityId: string) {
    const mod = data.modules.find((m) => m.dbId === moduleId);
    if (!mod) {
      activityIds.delete(activityId);
      setActivityIds(new Set(activityIds));
      return;
    }
    mod.activityIds = mod.activityIds.filter((a) => a !== activityId);
    setData({ ...data });
    if (groupId && mod.dbId) {
      addActivities.mutate({
        moduleId: mod.dbId,
        activityIds: mod.activityIds,
      });
    }
  }

  function handleKeyboard(key: string, name: string) {
    if (key === "Enter") {
      addModule({
        name,
        activityIds: selectedModule?.activityIds ?? Array.from(activityIds),
      });
      if (refOpt.current) refOpt.current.value = "";
    }
    if (key === "Escape") {
      if (refOpt.current) refOpt.current.value = "";
      setActivityIds(new Set());
    }
  }

  const toggleActivityGroup = (id: string) => {
    if (selectedModule?.activityIds) {
      const ids = selectedModule?.activityIds ?? [];
      if (ids.includes(id)) removeActivityId(id);
      else addActivityId(id);
    } else {
      const ids = activityIds;
      if (ids.has(id)) removeActivityId(id);
      else addActivityId(id);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <form className={`grid grid-cols-[auto_1fr] gap-2`}>
        <label>{t("certification.group-name")}</label>
        <input
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.currentTarget.value })}
          type={"text"}
          className="input-bordered input w-full"
        />
        {data.name === "" ? (
          <p className="col-span-2 text-sm text-error">
            {t("certification.name-mandatory")}
          </p>
        ) : null}
      </form>
      <label>{t("certification.modules")}</label>
      <ul className="menu overflow-hidden rounded border border-base-300">
        {data.modules.map((mod, idx) => (
          <li key={mod.dbId}>
            <div
              className={`flex w-full items-center justify-between text-center ${
                moduleId === mod.dbId ? "active" : ""
              }`}
              onClick={() => selectModule(mod.dbId)}
            >
              <div className="flex flex-grow items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{mod.name}</span>
                  {mod.activityIds.map((id) => (
                    <span key={id} className="badge-primary badge">
                      {agQuery.data?.find((g) => g.id === id)?.name ?? "???"}
                    </span>
                  ))}
                </div>
                <button onClick={() => handleDeleteModule(idx)}>
                  <ButtonIcon
                    iconComponent={<i className="bx bx-trash bx-xs" />}
                    title={t("certification.delete-module")}
                    buttonVariant="Icon-Outlined-Secondary"
                    buttonSize="sm"
                  />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-2 rounded-md border border-primary p-2">
          <input
            type={"text"}
            ref={refOpt}
            value={moduleName}
            onChange={(e) => {
              setModuleName(e.currentTarget.value);
            }}
            onKeyDown={(e) => handleKeyboard(e.key, e.currentTarget.value)}
            className="input-bordered input w-full"
          />
          <h3>{t("certification.linked-activities")}</h3>
          {agQuery.isLoading ? (
            <Spinner />
          ) : (
            <div className="flex flex-wrap gap-2">
              {agQuery.data?.map((ag) => (
                <button
                  className={`btn-primary btn-sm btn normal-case ${
                    selectedModule?.activityIds.includes(ag.id) ||
                    activityIds.has(ag.id)
                      ? ""
                      : "btn-outline"
                  }`}
                  key={ag.id}
                  onClick={() => toggleActivityGroup(ag.id)}
                >
                  {ag.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (!refOpt.current) return;
            addModule({
              name: refOpt.current.value,
              activityIds:
                selectedModule?.activityIds ?? Array.from(activityIds),
            });
            handleKeyboard("Escape", "");
          }}
          onKeyDown={(e) => handleKeyboard(e.key, refOpt.current?.value ?? "")}
        >
          <ButtonIcon
            iconComponent={
              <i
                className={`bx ${selectedModule ? "bx-edit" : "bx-plus"} bx-sm`}
              />
            }
            title={t("pricing.add-option")}
            buttonVariant="Icon-Outlined-Primary"
            buttonSize="md"
          />
        </button>
      </div>
    </div>
  );
}
