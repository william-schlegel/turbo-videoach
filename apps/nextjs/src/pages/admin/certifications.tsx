import { getServerSession } from "@acme/auth";
import {
  CreateCertificationGroup,
  DeleteCertificationGroup,
  UpdateCertificationGroup,
} from "@modals/manageCertification";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import Spinner from "@ui/spinner";
import { type GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useState } from "react";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

function CertificationsManagement() {
  const { data: sessionData } = useSession();
  const cgQuery = api.coachs.getCertificationGroups.useQuery(undefined, {
    onSuccess(data) {
      if (cgId === "") setCgId(data[0]?.id || "");
    },
  });
  const [cgId, setCgId] = useState("");
  const { t } = useTranslation("admin");

  if (sessionData && sessionData.user?.role !== Role.ADMIN)
    return <div>{t("admin-only")}</div>;

  return (
    <Layout
      title={t("certification.manage-cg")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center gap-4">
        <h1>{t("certification.manage-cg")}</h1>
        <CreateCertificationGroup />
      </div>
      <div className="flex gap-4">
        {cgQuery.isLoading ? (
          <Spinner />
        ) : (
          <div className="w-1/4 ">
            <h3>{t("certification.groups")}</h3>
            <ul className="menu overflow-hidden rounded bg-base-100">
              {cgQuery.data?.map((cg) => (
                <li key={cg.id}>
                  <button
                    className={`flex w-full items-center justify-between text-center ${
                      cgId === cg.id ? "active" : ""
                    }`}
                    onClick={() => setCgId(cg.id)}
                  >
                    <span>{cg.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {cgId === "" ? null : <CGContent cgId={cgId} />}
      </div>
    </Layout>
  );
}

export default CertificationsManagement;

type CGContentProps = {
  cgId: string;
};

export function CGContent({ cgId }: CGContentProps) {
  const cgQuery = api.coachs.getCertificationGroupById.useQuery(cgId);
  const { t } = useTranslation("admin");

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2>{cgQuery.data?.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <UpdateCertificationGroup groupId={cgId} />
          <DeleteCertificationGroup groupId={cgId} />
        </div>
      </div>
      <section className="grid max-h-screen grid-cols-2 gap-2 overflow-y-auto overflow-x-hidden">
        <article className="flex flex-col gap-2 rounded-md border border-primary p-2">
          <h3>{t("certification.group-modules")}</h3>
          <div className="flex flex-row flex-wrap gap-2">
            {cgQuery.data?.modules?.map((module) => (
              <div key={module.id} className="pill">
                <span>{module.name}</span>
                <span className="badge-primary badge">
                  {module.activityGroups?.length}
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="flex flex-col gap-2 rounded-md border border-primary p-2">
          <h3>{t("certification.group-coachs")}</h3>
        </article>
      </section>
    </div>
  );
}

export const getServerSideProps = async ({
  locale,
  req,
  res,
}: GetServerSidePropsContext) => {
  const session = await getServerSession({ req, res });
  if (session?.user?.role !== Role.ADMIN)
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
        ["common", "admin", "coach"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
