import { type ReactNode, useId } from "react";

export type TIconButtonVariant =
  | "Icon-Only-Primary"
  | "Icon-Only-Secondary"
  | "Icon-Primary"
  | "Icon-Secondary"
  | "Icon-Outlined-Primary"
  | "Icon-Outlined-Secondary";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

type Props = {
  title: string;
  iconComponent: ReactNode;
  buttonVariant?: TIconButtonVariant;
  buttonSize?: ButtonSize;
  fullButton?: boolean;
};

function ButtonIcon({
  title,
  iconComponent,
  buttonVariant = "Icon-Outlined-Primary",
  buttonSize = "md",
  fullButton,
}: Props) {
  const btnId = useId();

  const noBorder =
    buttonVariant === "Icon-Only-Primary" ||
    buttonVariant === "Icon-Only-Secondary";
  const primary =
    buttonVariant === "Icon-Only-Primary" ||
    buttonVariant === "Icon-Outlined-Primary" ||
    buttonVariant === "Icon-Primary";
  const outlined =
    buttonVariant === "Icon-Outlined-Primary" ||
    buttonVariant === "Icon-Outlined-Secondary"
      ? "btn-outlined"
      : "";

  const color = noBorder
    ? primary
      ? "txt-primary"
      : "txt-secondary"
    : primary
    ? "btn btn-primary"
    : "btn btn-secondary";

  const sz =
    buttonSize === "lg"
      ? "btn-lg"
      : buttonSize === "md"
      ? "btn-md"
      : buttonSize === "sm"
      ? "btn-sm"
      : "btn-xs";

  return fullButton ? (
    <label
      className={`${color} ${outlined} flex items-center gap-2 ${sz}`}
      tabIndex={0}
    >
      {iconComponent}
      {title}
    </label>
  ) : (
    <div className={"tooltip z-50"} data-tip={title}>
      <label
        htmlFor={btnId}
        className={`${color} ${outlined} gap-2 ${sz} `}
        tabIndex={0}
      >
        {iconComponent}
      </label>
    </div>
  );
}

export default ButtonIcon;
