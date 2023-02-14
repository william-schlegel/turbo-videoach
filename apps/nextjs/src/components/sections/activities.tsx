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
import { useTranslation } from "next-i18next";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import ThemeSelector, { type TThemes } from "../themeSelector";

type ActivityGroupCreationProps = {
  clubId: string;
  pageId: string;
};

type ActivityGroupForm = {
  title: string;
  subtitle: string;
};

type ActivityForm = {
  images?: FileList;
  title: string;
  subtitle: string;
  description: string;
};

const MAX_SIZE = 1024 * 1024;

export const ActivityGroupCreation = ({
  clubId,
  pageId,
}: ActivityGroupCreationProps) => {
  const { t } = useTranslation("pages");
  const { register, handleSubmit, control, reset } =
    useForm<ActivityGroupForm>();
  const fields = useWatch({ control });
  const utils = api.useContext();
  const [previewTheme, setPreviewTheme] = useState<TThemes>("cupcake");
  const [updating, setUpdating] = useState(false);

  const querySection = api.pages.getPageSection.useQuery(
    { pageId, section: "ACTIVITY_GROUPS" },
    {
      onSuccess: (data) => {
        if (!data) {
          setUpdating(false);
          return;
        }
        reset({
          title: data?.title ?? "",
          subtitle: data?.subTitle ?? "",
        });
        setUpdating(true);
      },
      refetchOnWindowFocus: false,
    },
  );
  const createSection = api.pages.createPageSection.useMutation({
    onSuccess() {
      toast.success(t("section-created"));
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "ACTIVITY_GROUPS",
      });
      reset();
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const updateSection = api.pages.updatePageSection.useMutation({
    onSuccess() {
      toast.success(t("section-created"));
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "ACTIVITY_GROUPS",
      });
      reset();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const deleteSection = api.pages.deletePageSection.useMutation({
    onSuccess() {
      toast.success(t("section-deleted"));
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "ACTIVITY_GROUPS",
      });
      reset();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const updatePageStyle = api.pages.updatePageStyleForClub.useMutation({
    onSuccess() {
      toast.success(t("style-saved"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const onSubmit: SubmitHandler<ActivityGroupForm> = (data) => {
    if (updating) {
      updateSection.mutate({
        ...querySection.data,
        ...data,
      });
    } else {
      createSection.mutate({
        model: "ACTIVITY_GROUPS",
        pageId,
        ...data,
      });
    }
  };

  const handleDeleteSection = () => {
    deleteSection.mutate({ pageId, sectionId: querySection.data?.id ?? "" });
  };

  if (querySection.isLoading) return <Spinner />;

  return (
    <div className="grid w-full auto-rows-auto gap-2 lg:grid-cols-2">
      <div className="space-y-2">
        <h3>{t(updating ? "updating-section" : "creation-section")}</h3>
        <form
          className="grid grid-cols-[auto_1fr] gap-2 rounded border border-primary p-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <label>{t("activity-group.title")}</label>
          <input
            {...register("title")}
            type="text"
            className="input-bordered input w-full"
          />
          <label>{t("activity-group.subtitle")}</label>
          <input
            {...register("subtitle")}
            type="text"
            className="input-bordered input w-full"
          />
          <div className="col-span-2 flex justify-between">
            <button className="btn btn-primary" type="submit">
              {t("save-section")}
            </button>
            {updating ? (
              <Confirmation
                title={t("section-deletion")}
                message={t("section-deletion-message")}
                variant={"Icon-Outlined-Secondary"}
                buttonIcon={
                  <i className={`bx bx-trash ${getButtonSize("md")}`} />
                }
                buttonSize="md"
                textConfirmation={t("section-deletion-confirm")}
                onConfirm={() => handleDeleteSection()}
              />
            ) : null}
          </div>
        </form>
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
                    <UpdateActivityGroup
                      pageId={pageId}
                      activityId={activity.id}
                    />
                    <DeleteActivityGroup
                      pageId={pageId}
                      activityId={activity.id}
                    />
                  </div>
                </div>
              ))}
            </div>
            <AddActivityGroup
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
          <ActivityGroupContentCard
            title={fields.title}
            subtitle={fields.subtitle}
            elements={querySection.data?.elements}
            preview
          />
        </div>
      </div>
    </div>
  );
};

type ActivityProps = {
  pageId: string;
  sectionId: string;
};

function AddActivityGroup({ pageId, sectionId }: ActivityProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");
  const [close, setClose] = useState(false);
  const { data: sessionData } = api.auth.getSession.useQuery();

  const createAG = api.pages.createPageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "ACTIVITY_GROUPS",
      });
      toast.success(t("activity-group.activity-created"));
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
    createAG.mutate({
      pageId,
      sectionId,
      elementType: "CARD",
      title: data.title,
      subTitle: data.subtitle,
      content: data.description,
      images: documentId ? [documentId] : undefined,
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("activity-group.new-activity")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
      // className="w-11/12 max-w-4xl"
    >
      <h3>
        <span>{t("activity-group.new-activity")}</span>
      </h3>
      <ActivityGroupForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
      />
    </Modal>
  );
}

type UpdateActivityGroupProps = {
  pageId: string;
  activityId: string;
};

function UpdateActivityGroup({ pageId, activityId }: UpdateActivityGroupProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");
  const [close, setClose] = useState(false);
  const { data: sessionData } = api.auth.getSession.useQuery();
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
        });
      },
      refetchOnWindowFocus: false,
    },
  );

  const updateAG = api.pages.updatePageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "ACTIVITY_GROUPS",
      });
      toast.success(t("activity-group.activity-updated"));
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
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("activity-group.update-activity")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
      variant="Icon-Outlined-Primary"
      buttonIcon={<i className={`bx bx-edit ${getButtonSize("sm")}`} />}
      buttonSize="sm"
    >
      <h3>
        <span>{t("activity-group.update-activity")}</span>
      </h3>
      <ActivityGroupForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
        initialValues={initialData}
        initialImageUrl={queryActivity.data?.images?.[0]?.url}
      />
    </Modal>
  );
}

function DeleteActivityGroup({ pageId, activityId }: UpdateActivityGroupProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");

  const deleteActivity = api.pages.deletePageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "ACTIVITY_GROUPS",
      });
      toast.success(t("activity-group.deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("activity-group.deletion-message")}
      title={t("activity-group.deletion")}
      buttonIcon={<i className={`bx bx-trash ${getButtonSize("sm")}`} />}
      onConfirm={() => {
        deleteActivity.mutate(activityId);
      }}
      variant={"Icon-Outlined-Secondary"}
      buttonSize={"sm"}
    />
  );
}

type ActivityGroupFormProps = {
  onSubmit: (data: ActivityForm) => void;
  initialValues?: ActivityForm;
  initialImageUrl?: string;
  onCancel: () => void;
  update?: boolean;
};

const defaultValues: ActivityForm = {
  title: "",
  subtitle: "",
  description: "",
  images: undefined,
};

function ActivityGroupForm({
  onSubmit,
  initialValues,
  onCancel,
  initialImageUrl,
}: ActivityGroupFormProps) {
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
    onSubmit(data);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSuccess)}>
      <div className="grid grid-cols-[auto_1fr] place-content-start gap-y-1">
        <label className="self-start">{t("activity-group.image")}</label>
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

        <label className="required">{t("activity-group.title")}</label>
        <div>
          <input
            className="input-bordered input w-full"
            {...register("title", {
              required: t("activity-group.title-mandatory") ?? true,
            })}
          />
          <TextError err={errors?.title?.message} />
        </div>
        <label>{t("activity-group.subtitle")}</label>
        <input
          className="input-bordered input w-full"
          {...register("subtitle")}
        />
        <label className="self-start">{t("activity-group.description")}</label>
        <textarea {...register("description")} rows={4} />
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

type ActivityGroupDisplayProps = {
  pageId: string;
};

export const ActivityGroupDisplayCard = ({
  pageId,
}: ActivityGroupDisplayProps) => {
  const querySection = api.pages.getPageSection.useQuery({
    pageId,
    section: "ACTIVITY_GROUPS",
  });
  if (querySection.isLoading) return <Spinner />;
  if (!querySection.data) return <div>Activities section unavailable</div>;

  return (
    <ActivityGroupContentCard
      title={querySection.data?.title ?? ""}
      subtitle={querySection.data?.subTitle ?? ""}
      elements={querySection.data?.elements}
    />
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
  title?: string;
  subtitle?: string;
  preview?: boolean;
  elements?: ActivityContentElement[];
};

function ActivityGroupContentCard({
  title,
  subtitle,
  preview = false,
  elements,
}: ActivitiesContentCardProps) {
  const { t } = useTranslation("pages");
  return (
    <section
      id="ACTIVITY_GROUPS"
      className={`${
        preview ? "aspect-[4/3]" : "min-h-screen"
      } w-full bg-primary p-4`}
    >
      <div className={`container mx-auto p-4 ${preview ? "py-2" : "py-48"}`}>
        <p
          className={`${
            preview
              ? "text-3xl"
              : "text-[clamp(4rem,5vw,6rem)] leading-[clamp(6rem,7.5vw,9rem)]"
          } font-bold text-primary-content`}
        >
          {title}
        </p>
        <p
          className={`${
            preview
              ? "text-lg"
              : "text-[clamp(1.5rem,2.5vw,3rem)] leading-[clamp(2.25rem,3.75vw,4.5rem)]"
          } font-semibold text-primary-content`}
        >
          {subtitle}
        </p>
        <div
          className={`mt-4 grid ${
            preview
              ? "grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2"
              : "grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-4"
          }`}
        >
          {elements?.map((activity) => (
            <div key={activity.id} className="card bg-base-100 shadow-xl">
              {activity.images?.[0]?.url ? (
                <figure className="white">
                  <img src={activity.images[0].url} alt="" />
                </figure>
              ) : null}
              <div className={`card-body ${preview ? "p-4 text-sm" : ""}`}>
                <div
                  className={`card-title ${
                    preview ? "text-base" : ""
                  } text-primary`}
                >
                  {activity.title}
                </div>
                {activity.subTitle ? (
                  <p className="text-secondary">{activity.subTitle}</p>
                ) : null}
                {/* <p>{activity.content}</p> */}
                <div className="card-actions mt-auto justify-end">
                  <Link
                    className={`btn btn-primary ${
                      preview ? "btn-xs max-w-full overflow-hidden text-xs" : ""
                    }`}
                    href={
                      preview
                        ? "#"
                        : `${window.location.origin}${window.location.pathname}/activity-group/${activity.id}`
                    }
                  >
                    {t("activity-group.more-details")}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const ActivityGroupDisplayElement = ({
  elementId,
}: {
  elementId: string;
}) => {
  const queryElement = api.pages.getPageSectionElementById.useQuery(elementId, {
    enabled: isCUID(elementId),
  });
  if (queryElement.isLoading) return <Spinner />;
  if (!queryElement.data) return <div>Activity group unavailable</div>;

  return (
    <div className={`container mx-auto p-4 py-12`}>
      <div className="hero-content flex-col lg:flex-row">
        {queryElement.data.images?.[0]?.url ? (
          <img
            src={queryElement.data.images[0].url}
            alt={queryElement.data.title ?? ""}
            className="max-w-xl rounded-lg shadow-2xl"
          />
        ) : null}
        <div>
          <h1 className="text-5xl font-bold">{queryElement.data.title}</h1>
          <h2>{queryElement.data.subTitle}</h2>
          <p className="py-6">{queryElement.data.content}</p>
        </div>
      </div>
    </div>
  );
};
