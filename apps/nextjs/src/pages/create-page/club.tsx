import { authOptions } from "@acme/auth";
import { isCUID } from "@lib/checkValidity";
import createLink from "@lib/createLink";
import {
  CreatePage,
  DeletePage,
  UpdatePage,
  usePageSection,
} from "@modals/managePage";
import { Role, type PageSectionModel } from "@prisma/client";
import { ActivityGroupCreation } from "@sections/activities";
import { ActivityCreation } from "@sections/activity";
import { HeroCreation } from "@sections/hero";
import { OfferCreation } from "@sections/offers";
import { PlanningCreation } from "@sections/planning";
import { TitleCreation } from "@sections/title";
import { api } from "@trpcclient/api";
import Spinner from "@ui/spinner";
import {
  type GetServerSidePropsContext,
  type InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { toast } from "react-toastify";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

function ClubPage({
  userId,
  clubId,
  pageId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation("pages");
  const router = useRouter();
  const queryClubs = api.clubs.getClubsForManager.useQuery(userId, {
    onSuccess(data) {
      if (!clubId) router.push(createLink({ clubId: data[0]?.id, pageId: "" }));
    },
    refetchOnWindowFocus: false,
  });
  const queryPages = api.pages.getPagesForClub.useQuery(clubId, {
    enabled: isCUID(clubId),
    refetchOnWindowFocus: false,
    onSuccess(data) {
      if (!pageId) router.push(createLink({ clubId, pageId: data[0]?.id }));
    },
  });
  const { getTargetName } = usePageSection();

  return (
    <Layout
      title={t("club.manage-page")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1 className="flex items-center">
        {t("club.manage-page")}
        <div className="ml-auto flex items-center gap-2">
          <label>{t("club.select-club")}</label>
          <select
            className="w-48 min-w-fit"
            value={clubId}
            onChange={(e) => {
              const path = `/create-page/club?clubId=${e.target.value}&pageId=`;
              router.push(path);
            }}
          >
            {queryClubs.data?.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>
      </h1>
      <div className="flex flex-col gap-4 lg:flex-row">
        <aside className="min-w-fit space-y-2">
          <h4>{t("club.pages")}</h4>
          <CreatePage clubId={clubId} />
          <ul className="menu overflow-hidden rounded border border-secondary bg-base-100">
            {queryPages.data?.map((page) => (
              <li key={page.id}>
                <div className={pageId === page.id ? "active" : ""}>
                  <button
                    onClick={() => {
                      const path = `/create-page/club?clubId=${clubId}&pageId=${page.id}`;
                      router.push(path);
                    }}
                    className="flex flex-1 items-center justify-between gap-2"
                  >
                    <span>{page.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="badge-secondary badge">
                        {getTargetName(page.target)}
                      </span>
                      <i
                        className={`bx bx-xs aspect-square rounded-full bg-base-100 ${
                          page.published
                            ? "bx-check text-success"
                            : "bx-x text-error"
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        {pageId ? <PageContent clubId={clubId} pageId={pageId} /> : null}
      </div>
    </Layout>
  );
}

export default ClubPage;

type PageContentProps = {
  pageId: string;
  clubId: string;
};

const PageContent = ({ pageId, clubId }: PageContentProps) => {
  const queryPage = api.pages.getPageById.useQuery(pageId, {
    enabled: isCUID(pageId),
    refetchOnWindowFocus: false,
    onSuccess(data) {
      if (data?.target) {
        setSections(getSections(data.target));
        setSection(defaultSection(data.target));
      }
    },
  });
  const { getSectionName, getSections, defaultSection } = usePageSection();

  const [sections, setSections] = useState<PageSectionModel[]>([]);
  const [section, setSection] = useState<PageSectionModel>("HERO");
  const { t } = useTranslation("pages");
  const utils = api.useContext();

  const publishPage = api.pages.updatePagePublication.useMutation({
    onSuccess(data) {
      utils.pages.getPageById.invalidate(pageId);
      utils.pages.getPagesForClub.invalidate(clubId);
      toast.success(t(data.published ? "page-published" : "page-unpublished"));
    },
  });

  if (queryPage.isLoading) return <Spinner />;
  return (
    <article className="flex flex-grow flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between">
        <h2> {queryPage.data?.name}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="pill">
            <div className="form-control">
              <label className="label cursor-pointer gap-4">
                <span className="label-text">{t("publish-page")}</span>
                <input
                  type="checkbox"
                  className="checkbox-primary checkbox"
                  checked={queryPage.data?.published}
                  onChange={(e) =>
                    publishPage.mutate({
                      pageId,
                      published: e.target.checked,
                    })
                  }
                />
              </label>
            </div>
          </div>
          <Link
            href={`/presentation-page/club/${clubId}/${pageId}`}
            target="_blank"
            referrerPolicy="no-referrer"
            className="btn-primary btn flex gap-2"
          >
            {t("page-preview")}
            <i className="bx bx-link-external bx-xs" />
          </Link>

          <UpdatePage clubId={clubId} pageId={pageId} size="md" />
          <DeletePage clubId={clubId} pageId={pageId} size="md" />
        </div>
      </div>
      <div className="btn-group flex-wrap">
        {sections.map((sec) => (
          <button
            key={sec}
            className={`btn btn-primary flex-1 ${
              sec === section ? "" : "btn-outline"
            }`}
            onClick={() => setSection(sec)}
          >
            {getSectionName(sec)}
          </button>
        ))}
      </div>
      <div className="w-full">
        {section === "HERO" && <HeroCreation clubId={clubId} pageId={pageId} />}
        {section === "TITLE" && (
          <TitleCreation clubId={clubId} pageId={pageId} />
        )}
        {section === "PLANNINGS" && (
          <PlanningCreation clubId={clubId} pageId={pageId} />
        )}
        {section === "ACTIVITY_GROUPS" && (
          <ActivityGroupCreation clubId={clubId} pageId={pageId} />
        )}
        {section === "ACTIVITIES" && (
          <ActivityCreation clubId={clubId} pageId={pageId} />
        )}
        {section === "OFFERS" && (
          <OfferCreation clubId={clubId} pageId={pageId} />
        )}
      </div>
    </article>
  );
};

export const getServerSideProps = async ({
  locale,
  req,
  res,
  query,
}: GetServerSidePropsContext) => {
  const session = await getServerSession(req, res, authOptions);
  if (
    session?.user?.role !== Role.MANAGER &&
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
        clubId: "",
        pageId: "",
      },
    };
  const clubId = (query?.clubId ?? "") as string;
  const pageId = (query?.pageId ?? "") as string;

  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "pages", "dashboard", "club"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
      clubId,
      pageId,
    },
  };
};
