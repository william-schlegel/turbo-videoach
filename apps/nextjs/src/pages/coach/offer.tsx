import { authOptions } from "@auth/[...nextauth]";
import { isCUID } from "@lib/checkValidity";
import createLink from "@lib/createLink";
import {
  CreateOffer,
  DeleteOffer,
  UpdateOffer,
  useCoachingTarget,
} from "@modals/manageCoach";
import { Role } from "@prisma/client";
import { CoachOfferPage } from "@sections/coachOffer";
import { api } from "@trpcclient/api";
import Spinner from "@ui/spinner";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getServerSession } from "next-auth";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { useRouter } from "next/router";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

function CoachOffer({
  userId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { data: sessionData } = useSession();
  const router = useRouter();
  const offerId = router.query.offerId as string;
  const { t } = useTranslation("coach");
  const { getName } = useCoachingTarget();
  const offerQuery = api.coachs.getCoachOffers.useQuery(userId, {
    enabled: isCUID(userId),
    onSuccess(data) {
      if (!offerId) router.push(createLink({ offerId: data[0]?.id }));
    },
  });
  if (
    sessionData &&
    !([Role.COACH, Role.MANAGER_COACH, Role.ADMIN] as Array<Role>).includes(
      sessionData.user?.role,
    )
  )
    return <div>{t("coach-only")}</div>;

  return (
    <Layout
      title={t("offer.my-offer", { count: offerQuery.data?.length ?? 0 })}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <div className="mb-4 flex flex-row items-center gap-4">
        <h1>{t("offer.my-offer", { count: offerQuery.data?.length ?? 0 })}</h1>
        <CreateOffer userId={sessionData?.user?.id ?? ""} />
      </div>
      <div className="flex flex-col gap-4 lg:flex-row">
        {offerQuery.isLoading ? (
          <Spinner />
        ) : (
          <ul className="menu rounded bg-base-100 lg:w-1/4">
            {offerQuery.data?.map((offer) => (
              <li key={offer.id}>
                <Link
                  href={createLink({ offerId: offer.id })}
                  className={`flex w-full justify-between ${
                    offerId === offer.id ? "active" : ""
                  }`}
                >
                  <span>{offer.name}</span>
                  <span className="badge badge-secondary">
                    {getName(offer.target)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {offerId === "" ? null : (
          <OfferContent userId={userId} offerId={offerId} />
        )}
      </div>
    </Layout>
  );
}
export default CoachOffer;

type OfferContentProps = {
  userId: string;
  offerId: string;
};

function OfferContent({ userId, offerId }: OfferContentProps) {
  const { t } = useTranslation("coach");
  const offerQuery = api.coachs.getOfferById.useQuery(offerId, {
    enabled: isCUID(offerId),
  });
  if (offerQuery.isLoading) return <Spinner />;
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <h2>{offerQuery.data?.name}</h2>
          <Link
            className="btn btn-primary flex items-center gap-4"
            href={`/company/${offerId}`}
            target="_blank"
            rel="noreffer"
          >
            {t("offer.see-public-offer")}
            <i className="bx bx-link-external bx-xs" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <UpdateOffer userId={userId} offerId={offerId} />
          <DeleteOffer userId={userId} offerId={offerId} />
        </div>
      </div>
      {/* <CoachOfferDisplay offerId={offerId} /> */}
      <CoachOfferPage offerId={offerId} condensed />
    </div>
  );
}

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
