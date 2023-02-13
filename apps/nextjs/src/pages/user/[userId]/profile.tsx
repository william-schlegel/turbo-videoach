/* eslint-disable @next/next/no-img-element */
import { isCUID } from "@lib/checkValidity";
import { formatSize } from "@lib/formatNumber";
import { useWriteFileDirect } from "@lib/useManageFile";
import { api } from "@trpcclient/api";
import ButtonIcon from "@ui/buttonIcon";
import type { GetServerSidePropsContext } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { toast } from "react-toastify";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  image?: FileList;
  imageUrl?: string;
  deleteImage: boolean;
};

const MAX_SIZE_IMAGE = 512 * 1024;

export default function Profile() {
  const router = useRouter();
  const { userId } = router.query;
  const myUserId = (Array.isArray(userId) ? userId[0] : userId) || "";
  const [imagePreview, setImagePreview] = useState("");

  const userQuery = api.users.getUserById.useQuery(myUserId, {
    enabled: isCUID(myUserId),
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      reset({
        name: data?.name ?? "",
        email: data?.email ?? "",
        phone: data?.phone ?? "",
        address: data?.address ?? "",
      });
      if (data.profileImageUrl) setImagePreview(data.profileImageUrl);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<FormValues>();
  const fields = useWatch({ control });

  const utils = api.useContext();
  const updateUser = api.users.updateUser.useMutation({
    onSuccess() {
      utils.users.getUserById.invalidate(myUserId);
      toast.success(t("user-updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("auth");
  const saveImage = useWriteFileDirect(myUserId, MAX_SIZE_IMAGE);

  useEffect(() => {
    if (fields.image?.[0]) {
      if (fields.image[0].size > MAX_SIZE_IMAGE) {
        toast.error(
          t("image-size-error", { size: formatSize(MAX_SIZE_IMAGE) }),
        );
        setValue("image", undefined);
        return;
      }

      const src = URL.createObjectURL(fields.image[0]);
      setImagePreview(src);
    }
  }, [fields.image, t, setValue]);

  const handleDeleteImage = () => {
    setImagePreview("");
    setValue("deleteImage", true);
    setValue("image", undefined);
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    let imageId: string | undefined = undefined;
    if (data.image?.[0])
      imageId = (await saveImage(data.image[0])) ?? undefined;
    updateUser.mutate({
      id: myUserId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      profileImageId: imageId,
    });
    reset();
    setImagePreview("");
  };

  return (
    <Layout
      title={t("profile.your-profile")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1>{t("profile.your-profile")}</h1>
      <form
        className={`flex flex-col gap-4 xl:grid xl:grid-cols-2 xl:items-start`}
        onSubmit={handleSubmit(onSubmit)}
      >
        <section className={`grid grid-cols-[auto_1fr] gap-2`}>
          <label>{t("profile.change-name")}</label>
          <div>
            <input
              {...register("name", {
                required: t("profile.name-mandatory") ?? true,
              })}
              type={"text"}
              className="input-bordered input w-full"
            />
            {errors.name ? (
              <p className="text-sm text-error">{errors.name.message}</p>
            ) : null}
          </div>
          <label>{t("profile.my-email")}</label>
          <input
            {...register("email")}
            type={"email"}
            className="input-bordered input w-full"
          />
          <label>{t("profile.phone")}</label>
          <input
            {...register("phone")}
            type="tel"
            className="input-bordered input w-full"
          />
          <label className="place-self-start">{t("profile.address")}</label>
          <textarea {...register("address")} rows={2} />
          <label>{t("profile.account-provider")}</label>
          <div className="flex gap-2">
            {!userQuery.data?.accounts?.length ? (
              <span className="rounded border border-primary px-4 py-2">
                email
              </span>
            ) : (
              userQuery.data.accounts?.map((account) => (
                <span
                  key={account.id}
                  className="rounded border border-primary px-4 py-2"
                >
                  {account.provider}
                </span>
              ))
            )}
          </div>
        </section>
        <section>
          <div className="col-span-2 flex flex-col items-center justify-start gap-4">
            <div className="w-full ">
              <label>{t("profile.profile-image")}</label>
              <input
                type="file"
                className="file-input-bordered file-input-primary file-input w-full"
                {...register("image")}
                accept="image/*"
              />
              <p className="col-span-2 text-sm text-gray-500">
                {t("image-size", { size: formatSize(MAX_SIZE_IMAGE) })}
              </p>
            </div>
            {imagePreview ? (
              <div className="relative w-60 max-w-full">
                <img
                  src={imagePreview}
                  alt=""
                  className="aspect-square rounded-full object-cover"
                />
                <button
                  onClick={handleDeleteImage}
                  className="absolute right-2 bottom-2 z-10"
                >
                  <ButtonIcon
                    iconComponent={<i className="bx bx-trash" />}
                    title={t("delete-image")}
                    buttonVariant="Icon-Secondary"
                    buttonSize="sm"
                  />
                </button>
              </div>
            ) : null}
          </div>
        </section>
        <button
          className="btn btn-primary col-span-2 w-fit"
          disabled={updateUser.isLoading}
        >
          {t("profile.save-profile")}
        </button>
      </form>
    </Layout>
  );
}

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "auth", "home"],
        nextI18nConfig,
      )),
    },
  };
}
