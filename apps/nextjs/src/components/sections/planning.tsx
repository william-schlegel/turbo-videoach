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

type PlanningCreationProps = {
  clubId: string;
  pageId: string;
};

type PlanningFormValues = {
  images?: FileList;
  title: string;
  subtitle: string;
  description: string;
  sites: string[];
};

const MAX_SIZE = 1024 * 1024;

export const PlanningCreation = ({ clubId, pageId }: PlanningCreationProps) => {
  const { t } = useTranslation("pages");
  const utils = api.useContext();
  const [previewTheme, setPreviewTheme] = useState<TThemes>("cupcake");

  const createSection = api.pages.createPageSection.useMutation();
  const querySection = api.pages.getPageSection.useQuery(
    { pageId, section: "PLANNINGS" },
    {
      onSuccess: (data) => {
        if (!data) {
          createSection.mutate({
            pageId,
            model: "PLANNINGS",
          });
          utils.pages.getPageSection.refetch({ pageId, section: "PLANNINGS" });
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
        <h3>{t("planning.planning-section")}</h3>
        {querySection.data?.id ? (
          <>
            <div className="flex flex-wrap gap-2">
              {querySection.data.elements.map((planning) => (
                <div
                  key={planning.id}
                  className="rounded border border-primary p-4"
                >
                  <p>{planning.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <UpdatePlanning
                      clubId={clubId}
                      pageId={pageId}
                      planningId={planning.id}
                    />
                    <DeletePlanning
                      clubId={clubId}
                      pageId={pageId}
                      planningId={planning.id}
                    />
                  </div>
                </div>
              ))}
            </div>
            <AddPlanning
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
          {querySection.data?.elements.map((card) => (
            <PlanningContentCard key={card.id} planning={card} preview />
          ))}
        </div>
      </div>
    </div>
  );
};

type PlanningProps = {
  pageId: string;
  sectionId: string;
  clubId: string;
};

function AddPlanning({ clubId, pageId, sectionId }: PlanningProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");
  const [close, setClose] = useState(false);
  const { data: sessionData } = useSession();

  const createPlanning = api.pages.createPageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "PLANNINGS",
      });
      toast.success(t("planning.planning-created"));
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

  async function handleSubmit(data: PlanningFormValues) {
    let documentId: string | undefined = undefined;
    if (data.images?.[0]) documentId = await saveImage(data.images[0]);
    createPlanning.mutate({
      pageId,
      sectionId,
      elementType: "CARD",
      title: data.title,
      subTitle: data.subtitle,
      content: data.description,
      images: documentId ? [documentId] : undefined,
      optionValue: JSON.stringify(data.sites),
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("planning.new-planning")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
      className="w-11/12 max-w-4xl"
    >
      <h3>
        <span>{t("planning.new-planning")}</span>
      </h3>
      <PlanningForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
        pageId={pageId}
        clubId={clubId}
      />
    </Modal>
  );
}

type UpdatePlanningProps = {
  pageId: string;
  planningId: string;
  clubId: string;
};

function UpdatePlanning({ clubId, pageId, planningId }: UpdatePlanningProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");
  const [close, setClose] = useState(false);
  const { data: sessionData } = useSession();
  const [initialData, setInitialData] = useState<
    PlanningFormValues | undefined
  >();
  const queryPlanning = api.pages.getPageSectionElementById.useQuery(
    planningId,
    {
      enabled: isCUID(planningId),
      onSuccess(data) {
        setInitialData({
          title: data?.title ?? "",
          subtitle: data?.subTitle ?? "",
          description: data?.content ?? "",
          images: undefined,
          sites: JSON.parse(data?.optionValue ?? "[]") as Array<string>,
        });
      },
      refetchOnWindowFocus: false,
    },
  );

  const updateAG = api.pages.updatePageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "PLANNINGS",
      });
      toast.success(t("planning.planning-updated"));
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

  async function handleSubmit(data: PlanningFormValues) {
    let documentId: string | undefined = undefined;
    if (data.images?.[0]) documentId = await saveImage(data.images[0]);
    updateAG.mutate({
      id: planningId,
      pageId,
      title: data.title,
      subTitle: data.subtitle,
      content: data.description,
      images: documentId ? [documentId] : undefined,
      optionValue: JSON.stringify(data.sites),
    });
    setClose(true);
  }

  return (
    <Modal
      title={t("planning.update-planning")}
      onCloseModal={() => setClose(false)}
      closeModal={close}
      cancelButtonText=""
      variant="Icon-Outlined-Primary"
      buttonIcon={<i className={`bx bx-edit ${getButtonSize("sm")}`} />}
      buttonSize="sm"
      className="w-11/12 max-w-4xl"
    >
      <h3>
        <span>{t("planning.update-planning")}</span>
      </h3>
      <PlanningForm
        onSubmit={(data) => handleSubmit(data)}
        onCancel={() => setClose(true)}
        initialValues={initialData}
        initialImageUrl={queryPlanning.data?.images?.[0]?.url}
        pageId={pageId}
        clubId={clubId}
      />
    </Modal>
  );
}

function DeletePlanning({ pageId, planningId }: UpdatePlanningProps) {
  const utils = api.useContext();
  const { t } = useTranslation("pages");

  const deletePlanning = api.pages.deletePageSectionElement.useMutation({
    onSuccess: () => {
      utils.pages.getPageSection.invalidate({
        pageId,
        section: "PLANNINGS",
      });
      toast.success(t("planning.deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("planning.deletion-message")}
      title={t("planning.deletion")}
      buttonIcon={<i className={`bx bx-trash ${getButtonSize("sm")}`} />}
      onConfirm={() => {
        deletePlanning.mutate(planningId);
      }}
      variant={"Icon-Outlined-Secondary"}
      buttonSize={"sm"}
    />
  );
}

type PlanningFormProps = {
  onSubmit: (data: PlanningFormValues) => void;
  initialValues?: PlanningFormValues;
  initialImageUrl?: string;
  onCancel: () => void;
  update?: boolean;
  pageId: string;
  clubId: string;
};

const defaultValues: PlanningFormValues = {
  title: "",
  subtitle: "",
  description: "",
  images: undefined,
  sites: [],
};

function PlanningForm({
  onSubmit,
  initialValues,
  onCancel,
  initialImageUrl,
  clubId,
}: PlanningFormProps) {
  const { t } = useTranslation("pages");
  const {
    handleSubmit,
    register,
    formState: { errors },
    control,
    reset,
    setValue,
  } = useForm<PlanningFormValues>({
    defaultValues,
  });
  const fields = useWatch({ control, defaultValue: defaultValues });
  const [imagePreview, setImagePreview] = useState(initialImageUrl);
  const sites = api.sites.getSitesForClub.useQuery(clubId, {
    enabled: isCUID(clubId),
    onSuccess(data) {
      if (data?.length) {
        const sts: boolean[] = [];
        for (const st of data) {
          sts.push(initialValues?.sites.includes(st.id) ?? false);
        }
        setPlanningGroups(sts);
      }
    },
    refetchOnWindowFocus: false,
  });
  const [planningGroups, setPlanningGroups] = useState<boolean[]>([]);

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

  const onSuccess: SubmitHandler<PlanningFormValues> = (data) => {
    const sts =
      sites.data?.filter((_, idx) => planningGroups[idx]).map((ag) => ag.id) ??
      [];
    onSubmit({ ...data, sites: sts });
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onSuccess)}
      className="grid grid-cols-[3fr_2fr] gap-2"
    >
      <div className="grid grid-cols-[auto_1fr] place-content-start gap-y-1">
        <label className="self-start">{t("planning.image")}</label>
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
                title={t("planning.delete-image")}
                buttonVariant="Icon-Outlined-Secondary"
                buttonSize="md"
              />
            </button>
          </div>
        ) : null}

        <label className="required">{t("planning.title")}</label>
        <div>
          <input
            className="input-bordered input w-full"
            {...register("title", {
              required: t("planning.title-mandatory") ?? true,
            })}
          />
          <TextError err={errors?.title?.message} />
        </div>
        <label>{t("planning.subtitle")}</label>
        <input
          className="input-bordered input w-full"
          {...register("subtitle")}
        />
        <label className="self-start">{t("planning.description")}</label>
        <textarea {...register("description")} rows={4} />
      </div>
      <div>
        <label>{t("planning.sites")}</label>
        <div className="rounded border border-primary p-2">
          {sites.data?.map((group, idx) => (
            <div key={group.id} className="form-control">
              <div className="label cursor-pointer justify-start gap-4">
                <input
                  type="checkbox"
                  className="checkbox-primary checkbox"
                  checked={planningGroups[idx] ?? false}
                  onChange={(e) => {
                    const ags = [...planningGroups];
                    ags[idx] = e.target.checked;
                    setPlanningGroups(ags);
                  }}
                />
                <span className="label-text">{group.name}</span>
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

type PlanningDisplayProps = {
  pageId: string;
};

export const PlanningDisplayCard = ({ pageId }: PlanningDisplayProps) => {
  const querySection = api.pages.getPageSection.useQuery(
    {
      pageId,
      section: "PLANNINGS",
    },
    {
      refetchOnWindowFocus: false,
    },
  );

  if (querySection.isLoading) return <Spinner />;
  if (!querySection.data) return <div>Plannings section unavailable</div>;

  return (
    <div className={`container mx-auto mt-4`}>
      {querySection.data?.elements
        .filter((e) => e.elementType === "CARD")
        .map((e) => (
          <PlanningContentCard key={e.id} planning={e} />
        ))}
    </div>
  );
};

type PlanningsContentCardProps = {
  preview?: boolean;
  planning: PlanningContentElement;
};

type PlanningContentElement = {
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

function PlanningContentCard({
  preview = false,
  planning,
}: PlanningsContentCardProps) {
  return (
    <>
      <h2
        className={`${
          preview
            ? "text-xl"
            : "text-[clamp(4rem,5vw,6rem)] leading-[clamp(6rem,7.5vw,9rem)]"
        } text-center font-bold text-white`}
      >
        {planning.title}
      </h2>
      <div
        className={`cover flex ${
          preview ? "aspect-[4/3]" : "min-h-[90vh]"
        } w-full flex-col items-center justify-center gap-4`}
        style={{
          backgroundImage: `${
            planning.images[0]?.url
              ? `url(${planning.images[0]?.url})`
              : "unset"
          }`,
          backgroundColor: "rgb(255 255 255 / 0.5)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundBlendMode: "lighten",
        }}
      ></div>
    </>
  );
}
