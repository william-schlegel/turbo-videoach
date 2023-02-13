import { useTranslation } from "next-i18next";

type Props = { label: string; limited?: boolean };
function LockedButton({ label, limited }: Props) {
  const { t } = useTranslation("common");

  return (
    <span
      className="btn tooltip tooltip-bottom tooltip-error no-animation flex cursor-default items-center gap-2 border-opacity-0 bg-neutral/20 text-base-content/20 hover:border-opacity-0 hover:bg-neutral/20 hover:text-base-content/20"
      data-tip={t(
        limited ? "navigation.limited-plan" : "navigation.insufficient-plan"
      )}
    >
      <i className="bx bx-lock bx-xs" />
      {label}
    </span>
  );
}
export default LockedButton;
