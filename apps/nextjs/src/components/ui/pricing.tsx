import { api } from "@trpcclient/api";
import { useTranslation } from "next-i18next";
import { useState, type ReactNode } from "react";
import Spinner from "./spinner";

type Props = {
  pricingId: string;
  onSelect?: (id: string, monthly: boolean) => void;
  compact?: boolean;
  forceHighlight?: boolean;
};

export function Pricing({
  pricingId,
  onSelect,
  compact = false,
  forceHighlight,
}: Props) {
  const pricingQuery = api.pricings.getPricingById.useQuery(pricingId);
  const [monthlyPrice, setMonthlyPrice] = useState(true);
  const { t } = useTranslation("home");

  if (pricingQuery.isLoading) return <Spinner />;
  const hl =
    forceHighlight ||
    (forceHighlight === undefined && pricingQuery.data?.highlighted);
  return (
    <div
      className={`card ${compact ? "w-fit" : "w-96"} bg-base-100 ${
        hl ? "border-4 border-primary" : ""
      } shadow-xl ${
        pricingQuery.data?.deleted ? "border-4 border-red-600" : ""
      }`}
    >
      <div
        className={`card-body items-center text-center ${compact ? "p-2" : ""}`}
      >
        {pricingQuery.data?.deleted ? (
          <div className="alert alert-warning text-center">
            {t("pricing.deleted", {
              date: pricingQuery.data?.deletionDate?.toLocaleDateString(),
            })}
          </div>
        ) : null}
        <h2 className="card-title text-3xl font-bold">
          {pricingQuery.data?.title}
        </h2>
        <p>{pricingQuery.data?.description}</p>
        {!compact ? (
          <ul className="self-start py-8">
            {pricingQuery.data?.options.map((option) => (
              <li key={option.id} className="flex items-center gap-4">
                <i className="bx bx-chevron-right bx-sm text-accent" />
                <span className="text-start">{option.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {pricingQuery.data?.free ? (
          <p
            className={`${
              compact ? "py-1" : "py-4"
            } text-xl font-bold text-accent`}
          >
            {t("pricing.free")}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button
                className={`btn-primary btn-sm btn ${
                  monthlyPrice ? "" : "btn-outline"
                }`}
                onClick={() => setMonthlyPrice(true)}
                type="button"
              >
                {t("pricing.monthly")}
              </button>
              <button
                className={`btn-primary btn-sm btn ${
                  monthlyPrice ? "btn-outline" : ""
                }`}
                onClick={() => setMonthlyPrice(false)}
                type="button"
              >
                {t("pricing.yearly")}
              </button>
            </div>
            <p
              className={`${
                compact ? "py-1" : "py-4"
              } text-xl font-bold text-accent`}
            >
              {monthlyPrice
                ? t("pricing.price-monthly", {
                    price: pricingQuery.data?.monthly,
                  })
                : t("pricing.price-yearly", {
                    price: pricingQuery.data?.yearly,
                  })}
            </p>
          </>
        )}
        {typeof onSelect === "function" && (
          <div className="card-actions">
            <button
              className="btn-primary btn-block btn"
              type="button"
              onClick={() =>
                onSelect(pricingQuery.data?.id ?? "", monthlyPrice)
              }
            >
              {t("pricing.select")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type PricingContainerProps = {
  children: ReactNode;
  compact?: boolean;
};

export function PricingContainer({
  children,
  compact = false,
}: PricingContainerProps) {
  return (
    <div
      className={`flex flex-wrap items-stretch gap-4 ${
        compact ? "justify-start" : "justify-center  py-12"
      }`}
    >
      {children}
    </div>
  );
}
