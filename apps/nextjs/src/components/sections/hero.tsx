/* eslint-disable @next/next/no-img-element */
import { isCUID } from "@lib/checkValidity";
import { formatSize } from "@lib/formatNumber";
import { useWriteFile } from "@lib/useManageFile";
import { usePageSection } from "@modals/managePage";
import type { PageSectionModel } from "@prisma/client";
import { api } from "@trpcclient/api";
import ButtonIcon from "@ui/buttonIcon";
import Confirmation from "@ui/confirmation";
import { getButtonSize } from "@ui/modal";
import Spinner from "@ui/spinner";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import ThemeSelector, { type TThemes } from "../themeSelector";

type HeroCreationProps = {
  clubId: string;
  pageId: string;
};

type HeroCreationForm = {
  images?: FileList;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  linkedPage: string;
  pageSection: PageSectionModel;
  protocol: string;
  url: string;
};

const MAX_SIZE = 1024 * 1024;

export const HeroCreation = ({ clubId, pageId }: HeroCreationProps) => {
  const { t } = useTranslation("pages");
  const { register, handleSubmit, getValues, control, setValue, reset } =
    useForm<HeroCreationForm>();
  const [imagePreview, setImagePreview] = useState("");
  const clubQuery = api.clubs.getClubById.useQuery(clubId, {
    enabled: isCUID(clubId),
  });
  const fields = useWatch({ control });
  const utils = api.useContext();
  const [updating, setUpdating] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<TThemes>("cupcake");
  const { getSectionName, getSections } = usePageSection();

  const querySection = api.pages.getPageSection.useQuery(
    { pageId, section: "HERO" },
    {
      onSuccess: (data) => {
        if (!data) {
          setUpdating(false);
          return;
        }
        const hc = data?.elements.find((e) => e.elementType === "HERO_CONTENT");
        const cta = data?.elements.find((e) => e.elementType === "CTA");
        setImagePreview(hc?.images?.[0]?.url ?? "");

        const linkUrl = cta?.link
          ? new URL(cta.link)
          : { protocol: "https:", host: "", pathname: "" };
        const resetData: HeroCreationForm = {
          cta: cta?.title ?? "",
          description: hc?.content ?? "",
          linkedPage: cta?.pageId ?? "url",
          pageSection: cta?.pageSection ?? "HERO",
          url: `${linkUrl.host}${linkUrl.pathname}` ?? "",
          protocol: linkUrl.protocol,
          title: hc?.title ?? "",
          subtitle: hc?.subTitle ?? "",
        };
        reset(resetData);
        setUpdating(true);
      },
      refetchOnWindowFocus: false,
    },
  );
  const [sections, setSections] = useState<PageSectionModel[]>([]);
  const queryPages = api.pages.getPagesForClub.useQuery(clubId, {
    enabled: isCUID(clubId),
  });
  const writeFile = useWriteFile(
    clubQuery.data?.managerId ?? "",
    "PAGE_IMAGE",
    MAX_SIZE,
  );
  const createSection = api.pages.createPageSection.useMutation({
    onSuccess() {
      toast.success(t("section-created"));
      utils.pages.getPageSection.invalidate({ pageId, section: "HERO" });
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
      utils.pages.getPageSection.invalidate({ pageId, section: "HERO" });
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
      utils.pages.getPageSection.invalidate({ pageId, section: "HERO" });
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

  const onSubmit: SubmitHandler<HeroCreationForm> = async (data) => {
    if (updating) {
      const hc = querySection?.data?.elements.find(
        (e) => e.elementType === "HERO_CONTENT",
      );
      const cta = querySection?.data?.elements.find(
        (e) => e.elementType === "CTA",
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
      if (data.cta) {
        if (cta) {
          await updateSectionElement.mutateAsync({
            id: cta.id,
            title: data.cta,
            link:
              data.linkedPage === "url"
                ? `${data.protocol}//${data.url}`
                : undefined,
            pageId: data.linkedPage === "url" ? undefined : data.linkedPage,
            pageSection:
              data.linkedPage === "url" ? undefined : data.pageSection,
          });
        } else {
          if (querySection.data?.id)
            await createSectionElement.mutateAsync({
              elementType: "CTA",
              sectionId: querySection.data.id,
              title: data.cta,
              link: data.url ? `${data.protocol}//${data.url}` : undefined,
              pageId: data.linkedPage === "url" ? undefined : data.linkedPage,
              pageSection:
                data.linkedPage === "url" ? undefined : data.pageSection,
            });
        }
      } else if (cta) {
        await deleteSectionElement.mutateAsync(cta.id);
      }
    } else {
      const docId = await writeFile(data.images?.[0]);
      const section = await createSection.mutateAsync({
        model: "HERO",
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
      if (data.cta) {
        await createSectionElement.mutateAsync({
          elementType: "CTA",
          sectionId: section.id,
          title: data.cta,
          link: data.url ? `${data.protocol}//${data.url}` : undefined,
          pageId: data.linkedPage === "url" ? undefined : data.linkedPage,
          pageSection: data.linkedPage === "url" ? undefined : data.pageSection,
        });
      }
    }
  };

  useEffect(() => {
    if (isCUID(fields.linkedPage)) {
      const page = queryPages?.data?.find((p) => p.id === fields.linkedPage);
      if (page) {
        setSections(getSections(page.target));
      } else setSections([]);
    } else setSections([]);
  }, [fields.linkedPage, queryPages?.data, getSections]);

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
          <label>{t("hero.image")}</label>
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
                    title={t("hero.delete-image")}
                    buttonVariant="Icon-Secondary"
                    buttonSize="sm"
                  />
                </button>
              </div>
            </div>
          ) : null}
          <label>{t("hero.title")}</label>
          <input
            {...register("title")}
            type="text"
            className="input-bordered input w-full"
          />
          <label>{t("hero.subtitle")}</label>
          <input
            {...register("subtitle")}
            type="text"
            className="input-bordered input w-full"
          />
          <label>{t("hero.description")}</label>
          <textarea {...register("description")} rows={4} />
          <label>{t("hero.button-cta")}</label>
          <input
            {...register("cta")}
            type="text"
            className="input-bordered input w-full"
          />
          {fields.cta ? (
            <>
              <label>{t("hero.linked-page")}</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  defaultValue={getValues("linkedPage")}
                  {...register("linkedPage")}
                >
                  {queryPages.data?.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name}
                    </option>
                  ))}
                  <option value={"url"}>{t("hero.external-url")}</option>
                </select>
                <select
                  defaultValue={getValues("pageSection")}
                  {...register("pageSection")}
                >
                  {sections.map((sec) => (
                    <option key={sec} value={sec}>
                      {getSectionName(sec)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
          {fields.cta && fields.linkedPage === "url" ? (
            <>
              <label className="label">
                <span>{t("hero.external-url")}</span>
              </label>
              <label className="input-group">
                <select
                  defaultValue={"https:"}
                  {...register("protocol")}
                  className="w-fit bg-primary text-primary-content"
                >
                  <option value="https:">https://</option>
                  <option value="http:">http://</option>
                </select>
                <input
                  type="text"
                  {...register("url")}
                  className="input-bordered input w-full"
                />
              </label>
            </>
          ) : null}
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
          <HeroContent
            imageSrc={imagePreview}
            title={fields.title}
            subtitle={fields.subtitle}
            description={fields.description}
            cta={fields.cta}
            preview={true}
          />
        </div>
      </div>
    </div>
  );
};

type HeroDisplayProps = {
  clubId: string;
  pageId: string;
};

export const HeroDisplay = ({ clubId, pageId }: HeroDisplayProps) => {
  const querySection = api.pages.getPageSection.useQuery({
    pageId,
    section: "HERO",
  });
  const heroContent = querySection.data?.elements.find(
    (e) => e.elementType === "HERO_CONTENT",
  );
  const cta = querySection.data?.elements.find((e) => e.elementType === "CTA");

  if (querySection.isLoading) return <Spinner />;
  if (!querySection.data) return <div>Hero section unavailable</div>;

  return (
    <HeroContent
      imageSrc={heroContent?.images?.[0]?.url}
      title={heroContent?.title ?? ""}
      subtitle={heroContent?.subTitle ?? ""}
      description={heroContent?.content ?? ""}
      cta={cta?.title ?? ""}
      ctaLink={
        cta?.link ??
        `/presentation-page/club/${clubId}/${cta?.pageId ?? ""}#${
          cta?.pageSection ?? ""
        }`
      }
    />
  );
};

type HeroContentProps = {
  imageSrc?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  cta?: string;
  ctaLink?: string;
  preview?: boolean;
};

function HeroContent({
  imageSrc,
  title,
  subtitle,
  description,
  cta,
  ctaLink,
  preview = false,
}: HeroContentProps) {
  const router = useRouter();

  return (
    <div
      className={`cover flex ${
        preview ? "aspect-[4/3]" : "min-h-screen"
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
      {cta && (
        <button
          className={`btn-primary btn ${
            preview ? "btn-sm" : "btn-xl"
          } w-fit normal-case`}
          onClick={() => {
            if (ctaLink) router.push(ctaLink);
          }}
        >
          {cta}
        </button>
      )}
    </div>
  );
}
