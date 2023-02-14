import { authOptions } from "@acme/auth";
import { isCUID } from "@lib/checkValidity";
import useUserInfo from "@lib/useUserInfo";
import {
  CreateCertification,
  DeleteCertification,
  UpdateCertification,
} from "@modals/manageCertification";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import ButtonIcon from "@ui/buttonIcon";
import Spinner from "@ui/spinner";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useState } from "react";
import { toast } from "react-toastify";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

const ManageCertifications = ({
  userId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  const { data: sessionData } = api.auth.getSession.useQuery();
  const certificationQuery = api.coachs.getCertificationsForCoach.useQuery(
    userId,
    {
      onSuccess(data) {
        if (certificationId === "")
          setCertificationId(data?.certifications[0]?.id || "");
      },
    },
  );
  const [certificationId, setCertificationId] = useState("");
  const [docId, setDocId] = useState("");
  const { features } = useUserInfo(userId);

  const { t } = useTranslation("coach");
  api.files.getDocumentUrlById.useQuery(docId, {
    enabled: isCUID(docId),
    onSuccess(data) {
      if (data.url)
        if (data.fileType === "application/pdf") {
          setDocId("");
          window.open(data.url, "_blank");
        } else {
          toast.error(t("type-invalid"));
        }
    },
  });

  if (
    sessionData &&
    !([Role.COACH, Role.MANAGER_COACH, Role.ADMIN] as Array<Role>).includes(
      sessionData.user?.role,
    )
  )
    return <div className="alert alert-error">{t("coach-only")}</div>;
  if (!features.includes("COACH_CERTIFICATION"))
    return (
      <div className="alert alert-error">
        {t("common:navigation.insufficient-plan")}
      </div>
    );

  return (
    <Layout
      title={t("manage-my-certifications", {
        count: certificationQuery.data?.certifications?.length ?? 0,
      })}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center gap-4">
        <h1>
          {t("manage-my-certifications", {
            count: certificationQuery.data?.certifications?.length ?? 0,
          })}
        </h1>
        <CreateCertification userId={userId} />
      </div>
      <div className="flex gap-4">
        {certificationQuery.isLoading ? (
          <Spinner />
        ) : (
          <div className="flex flex-wrap gap-4">
            {certificationQuery.data?.certifications.map((certification) => (
              <div
                key={certification.id}
                className="card w-96 bg-base-100 shadow-xl"
              >
                <div className="card-body">
                  <h2 className="card-title">{certification.name}</h2>
                  <h3>{t("modules")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {certification.modules.map((mod) => (
                      <div key={mod.id} className="pill">
                        {mod.name}
                      </div>
                    ))}
                  </div>
                  <h3>{t("activities")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {certification.activityGroups.map((act) => (
                      <div key={act.id} className="pill">
                        {act.name}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-4 border-t border-base-200 pt-4">
                    {certification.documentId ? (
                      <>
                        <div className="rounded-full bg-info px-4 py-1 text-center text-info-content">
                          {t("document-ok")}
                        </div>

                        <button
                          onClick={() =>
                            setDocId(certification.documentId ?? "")
                          }
                        >
                          <ButtonIcon
                            iconComponent={<i className="bx bx-show bx-sm" />}
                            title={t("view-document")}
                            buttonSize="md"
                            buttonVariant="Icon-Outlined-Primary"
                          />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="rounded-full bg-warning px-4 py-1 text-center text-warning-content">
                          {t("document-nok")}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="card-actions justify-end">
                    <UpdateCertification
                      userId={userId}
                      certificationId={certification.id}
                    />
                    <DeleteCertification
                      userId={userId}
                      certificationId={certification.id}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ManageCertifications;

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  if (
    session?.user?.role !== Role.COACH &&
    session?.user?.role !== Role.MANAGER_COACH &&
    session?.user?.role !== Role.ADMIN
  )
    return {
      redirect: {
        permanent: false,
        destination: "/",
      },
      props: {
        userId: "",
      },
    };

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "coach"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
