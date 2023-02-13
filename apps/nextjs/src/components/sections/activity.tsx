/* eslint-disable @next/next/no-img-element */
import { isCUID } from "@lib/checkValidity";
import { formatSize } from "@lib/formatNumber";
import { useWriteFile } from "@lib/useManageFile";
import type { PageSectionElementType } from "@prisma/client";
import { api } from "@trpcclient/api";
import ButtonIcon from "@ui/buttonIcon";
import Confirmation from "@ui/confirmation";
import Modal, { getButtonSize } from "@ui/modal";
import { TextError } from "@ui/simpleform";
import Spinner from "@ui/spinner";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import ThemeSelector, { type TThemes } from "../themeSelector";

type ActivityCreationProps = {
  clubId: string;
  pageId: string;
};

type ActivityForm = {
  images?: FileList;
  title: string;
  subtitle: string;
  description: string;
  activityGroups: string[];
};

const MAX_SIZE = 1024 * 1024;

export const ActivityCreation = ({ clubId, pageId }: ActivityCreationProps) => {
  const { t } = useTranslation("pages");
  const utils = api.useContext();
  const [previewTheme, setPreviewTheme] = useState<TThemes>("cupcake");

  const createSection = api.pages.createPageSection.useMutation();
  const querySection = api.pages.getPageSection.useQuery(
    { pageId, section: "ACTIVITIES" },
    {
      onSuccess: (data) => {
        if (!data) {
          createSection.mutate({
            pageId,
            model: "ACTIVITIES",
          });
          utils.pages.getPageSection.refetch({ pageId, section: "ACTIVITIES" });
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
  const groups = api.pages.getPageSectionElements.useQuery({
    pageId,
    section: "ACTIVITY_GROUPS",
  });

  if (querySection.isLoading) return <Spinner />;

  return (
    <div className="grid w-full auto-rows-auto gap-2 lg:grid-cols-2">
      <div className="space-y-2">
        <h3>{t("activity.activity-section")}</h3>
        {querySection.data?.id ? (
          <>
            <div className="flex flex-wrap gap-2">
              {querySection.data.elements.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded border border-primary p-4"
                >
                  <p>{activity.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <UpdateActivity pageId={pageId} activityId={activity.id} />
                    <DeleteActivity pageId={pageId} activityId={activity.id} />
                  </div>
                </div>
              ))}
            </div>
            <AddActivity pageId={pageId} sectionId={querySection.data.id} />
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
          {groups.data?.map((group) => (
            <>
              <h2 className="text-center">{group.title}</h2>
              <section id="ACTIVITIES" className={`w-full bg-base-200 p-4`}>
                <div className={`container mx-auto p-4`}>
                  <p className={`text-3xl font-bold text-primary-content`}>
                    {querySection.data?.title}
                  </p>
                  {querySection.data?.subTitle ? (
                    <p className={`text-lg font-semibold text-primary-content`}>
                      {querySection.data.subTitle}
                    </p>
                  ) : null}
                  <div className={`mt-4 grid grid-cols-3 gap-2`}>
                    {querySection.data?.elements
                      .filter((e) =>
                        (
                          JSON.parse(e.optionValue ?? "[]") as Array<string>
                        ).includes(group.id),
                      )
                      .map((e) => (
                        <ActivityContentCard key={e.id} activity={e} preview />
                      ))}
                  </div>
                </div>
              </section>
            </>
          ))}
        </div>
      </div>
    </div>
  );
};

type ActivityProps = {
  pageId: string;
  sectionId: string;
};

function AddActivity({ pageId, sectionId }: ActivityProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");
  const [close, setClose] = useState(false);
  const { data: sessionData } = useSession();

  const createActivity = api.pages.createPageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "ACTIVITIES",
      });
      toast.success(t("activity.activity-created"));
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

  async function handleSubmit(data: ActivityForm) {
    let documentId: string | undefined = undefined;
    if (data.images?.[0]) documentId = await saveImage(data.images[0]);
    createActivity.mutate({
      pageId,
      sectionId,
      elementType: "CARD",
      title: data.title,
      subTitle: data.subtitle,
      content: data.description,
      images: documentId ? [documentId] : undefined,
      optionValue: JSON.stringify(data.activityGroups),
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("activity.new-activity")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
      className="w-11/12 max-w-4xl"
    >
      <h3>
        <span>{t("activity.new-activity")}</span>
      </h3>
      <ActivityForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
        pageId={pageId}
      />
    </Modal>
  );
}

type UpdateActivityProps = {
  pageId: string;
  activityId: string;
};

function UpdateActivity({ pageId, activityId }: UpdateActivityProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");
  const [close, setClose] = useState(false);
  const { data: sessionData } = useSession();
  const [initialData, setInitialData] = useState<ActivityForm | undefined>();
  const queryActivity = api.pages.getPageSectionElementById.useQuery(
    activityId,
    {
      enabled: isCUID(activityId),
      onSuccess(data) {
        setInitialData({
          title: data?.title ?? "",
          subtitle: data?.subTitle ?? "",
          description: data?.content ?? "",
          images: undefined,
          activityGroups: JSON.parse(
            data?.optionValue ?? "[]",
          ) as Array<string>,
        });
      },
      refetchOnWindowFocus: false,
    },
  );

  const updateAG = api.pages.updatePageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "ACTIVITIES",
      });
      toast.success(t("activity.activity-updated"));
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

  async function handleSubmit(data: ActivityForm) {
    let documentId: string | undefined = undefined;
    if (data.images?.[0]) documentId = await saveImage(data.images[0]);
    updateAG.mutate({
      id: activityId,
      pageId,
      title: data.title,
      subTitle: data.subtitle,
      content: data.description,
      images: documentId ? [documentId] : undefined,
      optionValue: JSON.stringify(data.activityGroups),
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("activity.update-activity")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
      variant="Icon-Outlined-Primary"
      buttonIcon={<i className={`bx bx-edit ${getButtonSize("sm")}`} />}
      buttonSize="sm"
      className="w-11/12 max-w-4xl"
    >
      <h3>
        <span>{t("activity.update-activity")}</span>
      </h3>
      <ActivityForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
        initialValues={initialData}
        initialImageUrl={queryActivity.data?.images?.[0]?.url}
        pageId={pageId}
      />
    </Modal>
  );
}

function DeleteActivity({ pageId, activityId }: UpdateActivityProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");

  const deleteActivity = api.pages.deletePageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "ACTIVITIES",
      });
      toast.success(t("activity.deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("activity.deletion-message")}
      title={t("activity.deletion")}
      buttonIcon={<i className={`bx bx-trash ${getButtonSize("sm")}`} />}
      onConfirm={() => {
        deleteActivity.mutate(activityId);
      }}
      variant={"Icon-Outlined-Secondary"}
      buttonSize={"sm"}
    />
  );
}

type ActivityFormProps = {
  onSubmit: (data: ActivityForm) => void;
  initialValues?: ActivityForm;
  initialImageUrl?: string;
  onCancel: () => void;
  update?: boolean;
  pageId: string;
};

const defaultValues: ActivityForm = {
  title: "",
  subtitle: "",
  description: "",
  images: undefined,
  activityGroups: [],
};

function ActivityForm({
  onSubmit,
  initialValues,
  onCancel,
  initialImageUrl,
  pageId,
}: ActivityFormProps) {
  const { t } = useTranslation("pages");
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
    reset,
    setValue,
  } = useForm<ActivityForm>({
    defaultValues,
  });
  const fields = useWatch({ control, defaultValue: defaultValues });
  const [imagePreview, setImagePreview] = useState(initialImageUrl);
  const groups = api.pages.getPageSectionElements.useQuery(
    {
      pageId,
      section: "ACTIVITY_GROUPS",
    },
    {
      enabled: isCUID(pageId),
      onSuccess(data) {
        if (data?.length) {
          const ags: boolean[] = [];
          for (const ag of data) {
            ags.push(initialValues?.activityGroups.includes(ag.id) ?? false);
          }
          setActivityGroups(ags);
        }
      },
    },
  );
  const [activityGroups, setActivityGroups] = useState<boolean[]>([]);

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

  const onSuccess: SubmitHandler<ActivityForm> = (data) => {
    const ags =
      groups.data?.filter((_, idx) => activityGroups[idx]).map((ag) => ag.id) ??
      [];
    onSubmit({ ...data, activityGroups: ags });
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onSuccess)}
      className="grid grid-cols-[3fr_2fr] gap-2"
    >
      <div className="grid grid-cols-[auto_1fr] place-content-start gap-y-1">
        <label className="self-start">{t("activity.image")}</label>
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
                title={t("activity.delete-image")}
                buttonVariant="Icon-Outlined-Secondary"
                buttonSize="md"
              />
            </button>
          </div>
        ) : null}

        <label className="required">{t("activity.title")}</label>
        <div>
          <input
            className="input-bordered input w-full"
            {...register("title", {
              required: t("activity.title-mandatory") ?? true,
            })}
          />
          <TextError err={errors?.title?.message} />
        </div>
        <label>{t("activity.subtitle")}</label>
        <input
          className="input-bordered input w-full"
          {...register("subtitle")}
        />
        <label className="self-start">{t("activity.description")}</label>
        <textarea {...register("description")} rows={4} />
      </div>
      <div>
        <label>{t("activity.activity-group")}</label>
        <div className="rounded border border-primary p-2">
          {groups.data?.map((group, idx) => (
            <div key={group.id} className="form-control">
              <div className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox-primary checkbox"
                  checked={activityGroups[idx] ?? false}
                  onChange={(e) => {
                    const ags = [...activityGroups];
                    ags[idx] = e.target.checked;
                    setActivityGroups(ags);
                  }}
                  defaultChecked={false}
                />
                <span className="label-text">{group.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-full mt-4 flex items-center justify-end gap-2">
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

type ActivityDisplayProps = {
  pageId: string;
  groupId: string;
};

export const ActivityDisplayCard = ({
  pageId,
  groupId,
}: ActivityDisplayProps) => {
  const querySection = api.pages.getPageSection.useQuery({
    pageId,
    section: "ACTIVITIES",
  });

  if (querySection.isLoading) return <Spinner />;
  if (!querySection.data) return <div>Activities section unavailable</div>;

  return (
    <div
      className={`container mx-auto mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3`}
    >
      {querySection.data?.elements
        .filter((e) =>
          (JSON.parse(e.optionValue ?? "[]") as Array<string>).includes(
            groupId,
          ),
        )
        .map((e) => (
          <ActivityContentCard key={e.id} activity={e} />
        ))}
    </div>
  );
};

type ActivityContentElement = {
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

type ActivitiesContentCardProps = {
  preview?: boolean;
  activity: ActivityContentElement;
};

function ActivityContentCard({
  preview = false,
  activity,
}: ActivitiesContentCardProps) {
  return (
    <div key={activity.id} className="card bg-base-100 shadow-xl">
      {activity.images?.[0]?.url ? (
        <figure className="white">
          <img src={activity.images[0].url} alt="" />
        </figure>
      ) : null}
      <div className={`card-body ${preview ? "p-4 text-sm" : ""}`}>
        <div
          className={`card-title ${preview ? "text-base" : ""} text-primary`}
        >
          {activity.title}
        </div>
        {activity.subTitle ? (
          <p className="text-secondary">{activity.subTitle}</p>
        ) : null}
        <p>{activity.content}</p>
      </div>
    </div>
  );
}
