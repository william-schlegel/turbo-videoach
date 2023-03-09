import { getServerSession } from "@acme/auth";
import { isCUID } from "@lib/checkValidity";
import { DeleteGroup, NewGroup, UpdateGroup } from "@modals/manageActivity";
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

function ActivityGroupManagement() {
  const { data: sessionData } = useSession();
  const agQuery = api.activities.getAllActivityGroups.useQuery(undefined, {
    onSuccess(data) {
      if (agId === "") setAgId(data[0]?.id || "");
    },
  });
  const [agId, setAgId] = useState("");
  const { t } = useTranslation("admin");

  if (sessionData && sessionData.user?.role !== Role.ADMIN)
    return <div>{t("admin-only")}</div>;

  return (
    <Layout
      title={t("ag.manage-ag")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center gap-4">
        <h1>{t("ag.manage-ag")}</h1>
        <NewGroup />
      </div>
      <div className="flex gap-4">
        {agQuery.isLoading ? (
          <Spinner />
        ) : (
          <div className="w-1/4 ">
            <h3>{t("ag.groups")}</h3>
            <ul className="menu overflow-hidden rounded bg-base-100">
              {agQuery.data?.map((ag) => (
                <li key={ag.id}>
                  <button
                    className={`flex w-full items-center justify-between text-center ${
                      agId === ag.id ? "active" : ""
                    }`}
                    onClick={() => setAgId(ag.id)}
                  >
                    <span>{ag.name}</span>
                    {ag.default ? (
                      <i className="bx bxs-star bx-xs text-accent" />
                    ) : (
                      <span className="badge">{ag.coach?.user.name}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {agId === "" ? null : <AGContent agId={agId} />}
      </div>
    </Layout>
  );
}

export default ActivityGroupManagement;

type AGContentProps = {
  agId: string;
};

type ClubGroup = {
  id: string;
  name: string;
  activities: number;
};

export function AGContent({ agId }: AGContentProps) {
  const agQuery = api.activities.getActivityGroupById.useQuery(agId, {
    enabled: isCUID(agId),
    onSuccess() {
      setClubs([]);
    },
  });
  const activitiesQuery = api.activities.getAllActivitiesForGroup.useQuery(
    agId,
    {
      onSuccess(data) {
        const cg = new Map<string, ClubGroup>();
        for (const ac of data) {
          const g = cg.get(ac.clubId);
          if (g) {
            g.activities += 1;
          } else
            cg.set(ac.clubId, {
              id: ac.clubId,
              name: ac.club.name,
              activities: 1,
            });
        }
        setClubs(Array.from(cg.values()));
      },
    },
  );
  const [clubs, setClubs] = useState<ClubGroup[]>([]);
  const { t } = useTranslation("admin");

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2>{agQuery.data?.name}</h2>
          {agQuery.data?.default ? (
            <i className="bx bxs-star bx-sm text-accent" />
          ) : (
            <p className="badge">({agQuery.data?.name})</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <UpdateGroup
            groupId={agId}
            variant="Icon-Outlined-Primary"
            size="sm"
          />
          <DeleteGroup groupId={agId} size="sm" />
        </div>
      </div>
      <section className="grid max-h-screen grid-cols-2 gap-2 overflow-y-auto overflow-x-hidden">
        <article className="flex flex-col gap-2 rounded-md border border-primary p-2">
          <h3>{t("ag.group-activities")}</h3>
          <div className="flex flex-row flex-wrap gap-2">
            {activitiesQuery.data?.map((activity) => (
              <div key={activity.id} className="pill">
                <span>{activity.name}</span>
                <span className="badge-primary badge">
                  {activity.club.name}
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="flex flex-col gap-2 rounded-md border border-primary p-2">
          <h3>{t("ag.group-clubs")}</h3>
          <div className="flex flex-row flex-wrap gap-2">
            {clubs.map((club) => (
              <div key={club.id} className="pill">
                <span>{club.name}</span>
                <span className="badge-primary badge">{club.activities}</span>
              </div>
            ))}
          </div>
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
        ["common", "admin", "club"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
