/* eslint-disable @next/next/no-img-element */
import { isCUID } from "@lib/checkValidity";
import { formatSize } from "@lib/formatNumber";
import { useWriteFile } from "@lib/useManageFile";
import { api } from "@trpcclient/api";
import ButtonIcon from "@ui/buttonIcon";
import Confirmation from "@ui/confirmation";
import { getButtonSize } from "@ui/modal";
import Spinner from "@ui/spinner";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import ThemeSelector, { type TThemes } from "../themeSelector";

type TitleCreationProps = {
  clubId: string;
  pageId: string;
};

type TitleCreationForm = {
  images?: FileList;
  title: string;
  subtitle: string;
  description: string;
};

const MAX_SIZE = 1024 * 1024;

export const TitleCreation = ({ clubId, pageId }: TitleCreationProps) => {
  const { t } = useTranslation("pages");
  const { register, handleSubmit, control, setValue, reset } =
    useForm<TitleCreationForm>();
  const [imagePreview, setImagePreview] = useState("");
  const clubQuery = api.clubs.getClubById.useQuery(clubId, {
    enabled: isCUID(clubId),
    refetchOnWindowFocus: false,
  });
  const fields = useWatch({ control });
  const utils = api.useContext();
  const [updating, setUpdating] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<TThemes>("cupcake");

  const querySection = api.pages.getPageSection.useQuery(
    { pageId, section: "TITLE" },
    {
      onSuccess: (data) => {
        if (!data) {
          setUpdating(false);
          return;
        }
        const hc = data?.elements.find((e) => e.elementType === "HERO_CONTENT");
        setImagePreview(hc?.images?.[0]?.url ?? "");

        const resetData: TitleCreationForm = {
          description: hc?.content ?? "",
          title: hc?.title ?? "",
          subtitle: hc?.subTitle ?? "",
        };
        reset(resetData);
        setUpdating(true);
      },
      refetchOnWindowFocus: false,
    },
  );
  const writeFile = useWriteFile(
    clubQuery.data?.managerId ?? "",
    "PAGE_IMAGE",
    MAX_SIZE,
  );
  const createSection = api.pages.createPageSection.useMutation({
    onSuccess() {
      toast.success(t("section-created"));
      utils.pages.getPageSection.invalidate({ pageId, section: "TITLE" });
      reset();
      setImagePreview("");
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const deleteSectionElement = api.pages.deletePageSectionElement.useMutation({
    onSuccess(data) {
      Promise.all(
        data.images.map((doc) =>
          deleteUserDocument.mutate({ userId: doc.userId, documentId: doc.id }),
        ),
      );
    },
  });
  const deleteSection = api.pages.deletePageSection.useMutation({
    onSuccess(data) {
      Promise.all(
        data.elements.map((elem) => deleteSectionElement.mutateAsync(elem.id)),
      );
      toast.success(t("section-deleted"));
      utils.pages.getPageSection.invalidate({ pageId, section: "TITLE" });
      reset();
      setImagePreview("");
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const createSectionElement = api.pages.createPageSectionElement.useMutation();
  const updateSectionElement = api.pages.updatePageSectionElement.useMutation({
    onSuccess() {
      toast.success(t("section-updated"));
      utils.pages.getPageSection.invalidate({ pageId, section: "TITLE" });
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const deleteUserDocument = api.files.deleteUserDocument.useMutation();
  const updatePageStyle = api.pages.updatePageStyleForClub.useMutation({
    onSuccess() {
      toast.success(t("style-saved"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const onSubmit: SubmitHandler<TitleCreationForm> = async (data) => {
    if (updating) {
      const hc = querySection?.data?.elements.find(
        (e) => e.elementType === "HERO_CONTENT",
      );
      let docId: string | undefined;
      if (data.images?.[0]) {
        if (hc?.images?.[0])
          await deleteUserDocument.mutateAsync({
            userId: hc.images[0].userId,
            documentId: hc.images[0].docId,
          });
        docId = await writeFile(data?.images?.[0]);
      }
      if (hc) {
        await updateSectionElement.mutateAsync({
          id: hc.id,
          title: data.title,
          subTitle: data.subtitle,
          content: data.description,
          images: docId ? [docId] : undefined,
        });
      }
    } else {
      const docId = await writeFile(data.images?.[0]);
      const section = await createSection.mutateAsync({
        model: "TITLE",
        pageId,
      });
      await createSectionElement.mutateAsync({
        elementType: "HERO_CONTENT",
        sectionId: section.id,
        title: data.title,
        subTitle: data.subtitle,
        content: data.description,
        images: docId ? [docId] : undefined,
      });
    }
  };

  useEffect(() => {
    if (fields.images?.length) {
      const image = fields.images[0];
      if (!image) return;
      if (image.size > MAX_SIZE) {
        toast.error(t("image-size-error", { size: formatSize(MAX_SIZE) }));
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

  const handleDeleteSection = () => {
    deleteSection.mutate({ pageId, sectionId: querySection.data?.id ?? "" });
  };

  if (querySection.isLoading) return <Spinner />;

  return (
    <div className="grid w-full auto-rows-auto gap-2 lg:grid-cols-2">
      <div>
        <h3>{t(updating ? "updating-section" : "creation-section")}</h3>

        <form
          className="grid grid-cols-[auto_1fr] gap-2 rounded border border-primary p-2"
          onSubmit={handleSubmit(onSubmit)}
        >
          <label>{t("title.image")}</label>
          <input
            type="file"
            className="file-input-bordered file-input-primary file-input w-full"
            {...register("images")}
            accept="image/*"
          />
          <p className="col-span-2 text-sm text-gray-500">
            {t("image-size", { size: formatSize(MAX_SIZE) })}
          </p>
          {imagePreview ? (
            <div className="col-span-2 flex items-center justify-center gap-2">
              <div className="relative w-60 max-w-full">
                <img src={imagePreview} alt="" />
                <button
                  onClick={handleDeleteImage}
                  className="absolute right-2 bottom-2 z-10"
                >
                  <ButtonIcon
                    iconComponent={<i className="bx bx-trash" />}
                    title={t("title.delete-image")}
                    buttonVariant="Icon-Secondary"
                    buttonSize="sm"
                  />
                </button>
              </div>
            </div>
          ) : null}
          <label>{t("title.title")}</label>
          <input
            {...register("title")}
            type="text"
            className="input-bordered input w-full"
          />
          <label>{t("title.subtitle")}</label>
          <input
            {...register("subtitle")}
            type="text"
            className="input-bordered input w-full"
          />
          <label>{t("title.description")}</label>
          <textarea {...register("description")} rows={4} />

          <div className="col-span-2 flex justify-between">
            <button className="btn-primary btn" type="submit">
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
          <TitleContent
            imageSrc={imagePreview}
            title={fields.title}
            subtitle={fields.subtitle}
            description={fields.description}
            preview={true}
          />
        </div>
      </div>
    </div>
  );
};

type TitleDisplayProps = {
  clubId: string;
  pageId: string;
};

export const TitleDisplay = ({ pageId }: TitleDisplayProps) => {
  const querySection = api.pages.getPageSection.useQuery(
    {
      pageId,
      section: "TITLE",
    },
    {
      refetchOnWindowFocus: false,
    },
  );
  const titleContent = querySection.data?.elements.find(
    (e) => e.elementType === "HERO_CONTENT",
  );
  if (querySection.isLoading) return <Spinner />;
  if (!querySection.data) return <div>Title section unavailable</div>;

  return (
    <TitleContent
      imageSrc={titleContent?.images?.[0]?.url}
      title={titleContent?.title ?? ""}
      subtitle={titleContent?.subTitle ?? ""}
      description={titleContent?.content ?? ""}
    />
  );
};

type TitleContentProps = {
  imageSrc?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  preview?: boolean;
};

function TitleContent({
  imageSrc,
  title,
  subtitle,
  description,
  preview = false,
}: TitleContentProps) {
  return (
    <div
      className={`cover flex ${
        preview ? "aspect-[4/1]" : "min-h-[30vh]"
      } w-full flex-col items-center justify-center gap-4`}
      style={{
        backgroundImage: `${imageSrc ? `url(${imageSrc})` : "unset"}`,
        backgroundColor: "rgb(0 0 0 / 0.5)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundBlendMode: "darken",
      }}
    >
      <p
        className={`${
          preview
            ? "text-3xl"
            : "text-[clamp(4rem,5vw,6rem)] leading-[clamp(6rem,7.5vw,9rem)]"
        } font-bold text-white`}
      >
        {title}
      </p>
      <p
        className={`${
          preview
            ? "text-lg"
            : "text-[clamp(1.5rem,2.5vw,3rem)] leading-[clamp(2.25rem,3.75vw,4.5rem)]"
        } font-semibold text-white`}
      >
        {subtitle}
      </p>
      <p className="text-gray-100">{description}</p>
    </div>
  );
}
