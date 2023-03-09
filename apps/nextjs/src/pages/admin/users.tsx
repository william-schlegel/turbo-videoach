import { getServerSession } from "@acme/auth";
import { formatMoney } from "@lib/formatNumber";
import { getRoleName, ROLE_LIST } from "@lib/useUserInfo";
import { DeleteUser, UpdateUser } from "@modals/manageUser";
import { Role } from "@prisma/client";
import { api } from "@trpcclient/api";
import Pagination from "@ui/pagination";
import SimpleForm from "@ui/simpleform";
import Spinner from "@ui/spinner";
import { type GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  useForm,
  type SubmitErrorHandler,
  type SubmitHandler,
} from "react-hook-form";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

type UserFilter = {
  name?: string;
  email?: string;
  role?: Role;
  dueDate?: Date;
};

const PER_PAGE = 20;

function UserManagement() {
  const { data: sessionData } = useSession();
  const [filter, setFilter] = useState<UserFilter>({});
  const [page, setPage] = useState(0);
  const userQuery = api.users.getAllUsers.useQuery({
    filter,
    skip: page * PER_PAGE,
    take: PER_PAGE,
  });
  const [userId, setUserId] = useState("");
  const { t } = useTranslation("admin");
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<UserFilter>();

  const onSubmit: SubmitHandler<UserFilter> = (data) => {
    const flt: UserFilter = {};
    if (data.name) flt.name = data.name;
    if (data.email) flt.email = data.email;
    if (data.role) flt.role = data.role;
    setFilter(flt);
  };

  const onError: SubmitErrorHandler<UserFilter> = (errors) => {
    console.error("errors", errors);
  };

  if (sessionData && sessionData.user?.role !== Role.ADMIN)
    return <div>{t("admin-only")}</div>;

  return (
    <Layout
      title={t("user.manage-users")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center gap-4">
        <h1>{t("user.manage-users")}</h1>
      </div>
      <div className="flex gap-4">
        {userQuery.isLoading ? (
          <Spinner />
        ) : (
          <div className="flex w-1/4 flex-col gap-4">
            <div className="collapse-arrow rounded-box collapse border border-base-300 bg-base-100">
              <input type="checkbox" />
              <div className="collapse-title text-xl font-medium">
                <span className="flex items-center gap-4">
                  {t("user.filter")}
                  <span className="badge-info badge">
                    {Object.keys(filter).length}
                  </span>
                </span>
              </div>
              <div className="collapse-content">
                <SimpleForm
                  errors={errors}
                  register={register}
                  fields={[
                    {
                      label: t("auth:name"),
                      name: "name",
                    },
                    {
                      label: t("auth:email"),
                      name: "email",
                    },
                    {
                      label: t("auth:role"),
                      name: "role",
                      component: (
                        <select className="max-w-xs" {...register("role")}>
                          <option></option>
                          {ROLE_LIST.filter(
                            (rl) => rl.value !== Role.ADMIN,
                          ).map((rl) => (
                            <option key={rl.value} value={rl.value}>
                              {t(`auth:${rl.label}`)}
                            </option>
                          ))}
                        </select>
                      ),
                    },
                  ]}
                />
                <button
                  onClick={handleSubmit(onSubmit, onError)}
                  className="btn-primary btn-block btn mt-2 flex gap-4"
                >
                  <i className="bx bx-search bx-sm" />
                  {t("user.search")}
                </button>
              </div>
            </div>
            <ul className="menu overflow-hidden rounded bg-base-100">
              {userQuery.data?.[1]?.map((user) => (
                <li key={user.id}>
                  <button
                    className={`flex w-full items-center justify-between text-center ${
                      userId === user.id ? "active" : ""
                    }`}
                    onClick={() => setUserId(user.id)}
                  >
                    <span>{user.name}</span>
                    <span
                      className={`${
                        user.role === "MEMBER"
                          ? "badge-secondary"
                          : "badge-accent"
                      } badge`}
                    >
                      {t(`auth:${getRoleName(user.role)}`)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination
              actualPage={page}
              count={userQuery.data?.[0] ?? 0}
              onPageClick={(page) => setPage(page)}
              perPage={PER_PAGE}
            />
          </div>
        )}
        {userId === "" ? null : <UserContent userId={userId} />}
      </div>
    </Layout>
  );
}

export default UserManagement;

type UserContentProps = {
  userId: string;
};

export function UserContent({ userId }: UserContentProps) {
  const userQuery = api.users.getUserFullById.useQuery(userId);
  const { t } = useTranslation("admin");
  const periodicityMutation = api.users.updatePaymentPeriod.useMutation({
    onSuccess() {
      utils.users.getUserFullById.invalidate(userId);
    },
  });
  const utils = api.useContext();
  const isInTrial =
    userQuery.data?.trialUntil &&
    new Date(userQuery.data?.trialUntil) > new Date(Date.now());

  const managerCount = useMemo(
    () =>
      userQuery.data?.managerData?.managedClubs?.reduce(
        (acc, c) => {
          acc.sites += c._count.sites;
          acc.activities += c._count.activities;
          acc.members += c._count.members;
          return acc;
        },
        { sites: 0, activities: 0, members: 0 },
      ) ?? { sites: 0, activities: 0, members: 0 },
    [userQuery.data],
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2>{userQuery.data?.name}</h2>
          <p>({userQuery.data?.email})</p>
        </div>
        <div className="flex items-center gap-2">
          <UpdateUser userId={userId} />
          <DeleteUser userId={userId} />
        </div>
      </div>
      <section className="grid grid-cols-2 gap-2">
        <article className="flex flex-col gap-2 rounded-md border border-primary p-2">
          <h2 className="flex items-center justify-between gap-2">
            {t("user.plan")}
            <span className="badge-primary badge">
              {t(`auth:${getRoleName(userQuery.data?.role ?? "MEMBER")}`)}
            </span>
          </h2>
          {isInTrial && (
            <div className="alert alert-info">
              {t("user.trial-until", {
                trialDate: userQuery.data?.trialUntil?.toLocaleDateString(),
              })}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span>{t("user.pricing")}</span>
            <span className="rounded border border-secondary px-2 py-1 text-secondary">
              {userQuery.data?.pricing?.title}
            </span>
            <span>
              {userQuery.data?.pricing?.free
                ? t("pricing.free")
                : userQuery.data?.monthlyPayment
                ? `${formatMoney(userQuery.data?.pricing?.monthly)}${t(
                    "user.per-month",
                  )}`
                : `${formatMoney(userQuery.data?.pricing?.yearly)}${t(
                    "user.per-year",
                  )}`}
            </span>
            <span className="flex flex-grow items-center justify-between rounded border border-primary px-2 text-primary">
              <span>{t("user.modify-period")}</span>
              <label className="swap">
                <input
                  type="checkbox"
                  checked={userQuery.data?.monthlyPayment ?? false}
                  onChange={(e) =>
                    periodicityMutation.mutate({
                      userId,
                      monthlyPayment: e.currentTarget.checked,
                    })
                  }
                  className="bg-primary"
                />
                <div className="swap-on px-4 text-primary-content">
                  {t("user.per-month")}
                </div>
                <div className="swap-off px-4 text-primary-content">
                  {t("user.per-year")}
                </div>
              </label>
            </span>
          </div>
          {userQuery.data?.role === "MANAGER" ||
          userQuery.data?.role === "MANAGER_COACH" ? (
            <>
              <h3>{t("user.manager-activity")}</h3>
              <div className="stats shadow">
                <div className="stat">
                  <div className="stat-title">
                    {t("dashboard:clubs", {
                      count:
                        userQuery.data?.managerData?.managedClubs?.length ?? 0,
                    })}
                  </div>
                  <div className="stat-value text-primary">
                    {userQuery.data?.managerData?.managedClubs?.length}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">
                    {t("dashboard:sites", { count: managerCount.sites })}
                  </div>
                  <div className="stat-value text-primary">
                    {managerCount.sites}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">
                    {t("dashboard:activities", {
                      count: managerCount.activities,
                    })}
                  </div>
                  <div className="stat-value text-primary">
                    {managerCount.activities}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">
                    {t("dashboard:members", { count: managerCount.members })}
                  </div>
                  <div className="stat-value text-primary">
                    {managerCount.members}
                  </div>
                </div>
              </div>
            </>
          ) : null}
          {userQuery.data?.role === "COACH" ||
          userQuery.data?.role === "MANAGER_COACH" ? (
            <>
              <h3>{t("user.coach-activity")}</h3>
              <div className="stats shadow">
                <div className="stat">
                  <div className="stat-title">
                    {t("dashboard:clubs", {
                      count: userQuery.data?.coachData?.clubs?.length ?? 0,
                    })}
                  </div>
                  <div className="stat-value text-primary">
                    {userQuery.data?.coachData?.clubs?.length ?? 0}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">
                    {t("dashboard:certifications", {
                      count:
                        userQuery.data.coachData?.certifications.length ?? 0,
                    })}
                  </div>
                  <div className="stat-value text-primary">
                    {userQuery.data.coachData?.certifications.length ?? 0}
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-title">{t("dashboard:rating")}</div>
                  <div className="stat-value text-primary">
                    {userQuery.data.coachData?.rating?.toFixed(1) ??
                      t("user.unrated")}
                  </div>
                </div>
              </div>
            </>
          ) : null}
          {(userQuery.data?.role === "COACH" ||
            userQuery.data?.role === "MANAGER_COACH") &&
          userQuery.data?.coachData?.page &&
          userQuery.data.coachData.page.published ? (
            <Link
              href={`/presentation-page/coach/${userId}/${userQuery.data.coachData.page.id}`}
              target="_blank"
              referrerPolicy="no-referrer"
              className="btn-primary btn flex gap-2"
            >
              {t("pages:page-preview")}
              <i className="bx bx-link-external bx-xs" />
            </Link>
          ) : null}
        </article>
        <article className="rounded-md border border-primary p-2">
          <h2>{t("user.payments")}</h2>
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
        ["common", "admin", "auth", "home", "dashboard", "pages"],
        nextI18nConfig,
      )),
      userId: session?.user?.id || "",
    },
  };
};
