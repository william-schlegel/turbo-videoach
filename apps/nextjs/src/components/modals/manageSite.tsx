import { LATITUDE, LONGITUDE } from "@lib/defaultValues";
import { api } from "@trpcclient/api";
import AddressSearch from "@ui/addressSearch";
import Confirmation from "@ui/confirmation";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { useEffect, useState, type PropsWithoutRef } from "react";
import {
  useForm,
  useWatch,
  type SubmitErrorHandler,
  type SubmitHandler,
} from "react-hook-form";
import { Map as MapComponent, Marker } from "react-map-gl";
import { toast } from "react-toastify";
import Modal, { type TModalVariant } from "../ui/modal";

type SiteFormValues = {
  name: string;
  address: string;
  searchAddress: string;
  longitude: number;
  latitude: number;
};

type CreateSiteProps = {
  clubId: string;
};

export const CreateSite = ({ clubId }: CreateSiteProps) => {
  const utils = api.useContext();
  const { t } = useTranslation("club");

  const [closeModal, setCloseModal] = useState(false);

  const createSite = api.sites.createSite.useMutation({
    onSuccess: () => {
      utils.clubs.getClubById.invalidate(clubId);
      utils.sites.getSitesForClub.invalidate(clubId);
      toast.success(t("site.created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const onSubmit = (data: SiteFormValues) => {
    createSite.mutate({ clubId, ...data });
  };

  return (
    <Modal
      title={t("site.create")}
      buttonIcon={<i className="bx bx-plus bx-xs" />}
      className="w-11/12 max-w-5xl"
      cancelButtonText=""
      closeModal={closeModal}
      onCloseModal={() => setCloseModal(false)}
    >
      <h3>{t("site.create")}</h3>
      <p className="py-4">{t("site.enter-info-new-site")}</p>
      <SiteForm onSubmit={onSubmit} onCancel={() => setCloseModal(true)} />
    </Modal>
  );
};

type UpdateSiteProps = {
  siteId: string;
  clubId: string;
};

export const UpdateSite = ({ siteId, clubId }: UpdateSiteProps) => {
  const utils = api.useContext();
  const [initialData, setInitialData] = useState<SiteFormValues | undefined>();
  const [closeModal, setCloseModal] = useState(false);
  const querySite = api.sites.getSiteById.useQuery(siteId, {
    onSuccess(data) {
      if (data) {
        setInitialData({
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          searchAddress: data.searchAddress ?? "",
        });
      }
    },
  });
  const updateSite = api.sites.updateSite.useMutation({
    onSuccess: () => {
      utils.sites.getSiteById.invalidate(siteId);
      utils.sites.getSitesForClub.invalidate(clubId);
      toast.success(t("site.updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const { t } = useTranslation("club");

  const onSubmit = (data: SiteFormValues) => {
    updateSite.mutate({ id: siteId, ...data });
  };

  return (
    <Modal
      title={t("site.update", { siteName: querySite.data?.name })}
      buttonIcon={<i className="bx bx-edit bx-sm" />}
      variant={"Icon-Outlined-Primary"}
      className="w-2/3 max-w-5xl"
      cancelButtonText=""
      closeModal={closeModal}
      onCloseModal={() => setCloseModal(false)}
    >
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-4">
          {t("site.update")}
          <span className="text-primary">{querySite?.data?.name}</span>
        </h3>
      </div>
      <SiteForm
        initialData={initialData}
        onSubmit={onSubmit}
        onCancel={() => setCloseModal(true)}
      />
    </Modal>
  );
};

type PropsUpdateDelete = {
  clubId: string;
  siteId: string;
  variant?: TModalVariant;
};

export const DeleteSite = ({
  clubId,
  siteId,
  variant = "Icon-Outlined-Secondary",
}: PropsWithoutRef<PropsUpdateDelete>) => {
  const utils = api.useContext();
  const { data: sessionData } = useSession();
  const { t } = useTranslation("club");

  const deleteSite = api.sites.deleteSite.useMutation({
    onSuccess: () => {
      utils.clubs.getClubsForManager.invalidate(sessionData?.user?.id ?? "");
      utils.clubs.getClubById.invalidate(clubId);
      toast.success(t("site.deleted"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  return (
    <Confirmation
      message={t("site.deletion-message")}
      title={t("site.deletion")}
      buttonIcon={<i className="bx bx-trash bx-sm" />}
      onConfirm={() => {
        deleteSite.mutate(siteId);
      }}
      variant={variant}
    />
  );
};

type SiteFormProps = {
  onSubmit: (data: SiteFormValues) => void;
  onCancel: () => void;
  initialData?: SiteFormValues;
};

function SiteForm({
  onSubmit,
  onCancel,
  initialData,
}: SiteFormProps): JSX.Element {
  const { t } = useTranslation("club");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<SiteFormValues>();
  const fields = useWatch({ control });

  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  const onSubmitForm: SubmitHandler<SiteFormValues> = (data) => {
    onSubmit(data);
    reset();
  };

  const onError: SubmitErrorHandler<SiteFormValues> = (errors) => {
    console.error("errors", errors);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmitForm, onError)}
      className={`grid grid-cols-2 items-start gap-4`}
    >
      <div className="flex flex-col gap-2">
        <label className="required w-fit">{t("club.name")}</label>
        <div>
          <input
            {...register("name", {
              required: t("name-mandatory") ?? true,
            })}
            type={"text"}
            className="input-bordered input w-full"
          />
          {errors.name ? (
            <p className="text-sm text-error">{errors.name.message}</p>
          ) : null}
        </div>
        <label className="required w-fit">{t("club.address")}</label>
        <div>
          <input
            {...register("address", {
              required: t("address-mandatory") ?? true,
            })}
            type={"text"}
            className="input-bordered input w-full"
          />
          {errors.address ? (
            <p className="text-sm text-error">{errors.address.message}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[auto_1fr] items-center gap-2">
          <AddressSearch
            label={t("club.search-address")}
            defaultAddress={fields.searchAddress}
            onSearch={(adr) => {
              setValue("searchAddress", adr.address);
              setValue("latitude", adr.lat);
              setValue("longitude", adr.lng);
            }}
            className="col-span-2"
            required
          />
        </div>
        <MapComponent
          initialViewState={{ zoom: 8 }}
          style={{ width: "100%", height: "20rem" }}
          mapStyle="mapbox://styles/mapbox/streets-v9"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          attributionControl={false}
          longitude={fields.longitude ?? LONGITUDE}
          latitude={fields.latitude ?? LATITUDE}
        >
          <Marker
            longitude={fields.longitude ?? LONGITUDE}
            latitude={fields.latitude ?? LATITUDE}
            anchor="bottom"
          >
            <i className="bx bxs-map bx-md text-primary" />
          </Marker>
        </MapComponent>
      </div>

      <div className="col-span-2 flex items-center justify-end gap-2">
        <button
          type="button"
          className="btn-outline btn-secondary btn"
          onClick={(e) => {
            e.preventDefault();
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
