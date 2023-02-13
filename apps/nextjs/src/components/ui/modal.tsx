import { type DefaultTFuncReturn } from "i18next";
import { useTranslation } from "next-i18next";
import { type ReactNode, useRef, useId, useEffect, useCallback } from "react";
import { type FieldErrors } from "react-hook-form";
import { type ButtonSize, type TIconButtonVariant } from "./buttonIcon";

export type TModalVariant =
  | TIconButtonVariant
  | "Primary"
  | "Secondary"
  | "Outlined-Primary"
  | "Outlined-Secondary";

type Props = {
  title: DefaultTFuncReturn | undefined;
  handleSubmit?: () => void;
  handleCancel?: () => void;
  children: ReactNode;
  submitButtonText?: DefaultTFuncReturn;
  cancelButtonText?: DefaultTFuncReturn;
  errors?: FieldErrors;
  buttonIcon?: ReactNode;
  onOpenModal?: () => void;
  onCloseModal?: () => void;
  variant?: TModalVariant;
  className?: string;
  buttonSize?: ButtonSize;
  closeModal?: boolean;
};

export default function Modal({
  title,
  handleSubmit,
  children,
  submitButtonText,
  cancelButtonText,
  handleCancel,
  errors,
  buttonIcon,
  onOpenModal,
  variant = "Primary",
  className = "",
  buttonSize = "md",
  closeModal,
  onCloseModal,
}: Props) {
  const closeRef = useRef<HTMLInputElement>(null);
  const modalId = useId();
  const { t } = useTranslation("common");

  const close = useCallback(() => {
    if (!closeRef.current) return;
    closeRef.current.checked = false;
    if (typeof onCloseModal === "function") onCloseModal();
  }, [onCloseModal]);

  useEffect(() => {
    if (closeModal) close();
  }, [closeModal, close]);

  const handleClickSubmit = () => {
    if (typeof errors === "object" && Object.keys(errors).length > 0) return;
    close();
    if (typeof handleSubmit === "function") handleSubmit();
  };

  const primary =
    variant === "Primary" ||
    variant === "Outlined-Primary" ||
    variant === "Icon-Primary" ||
    variant === "Icon-Outlined-Primary" ||
    variant === "Icon-Only-Primary";
  const outlined =
    variant === "Outlined-Primary" ||
    variant === "Outlined-Secondary" ||
    variant === "Icon-Outlined-Primary" ||
    variant === "Icon-Outlined-Secondary"
      ? "btn-outlined"
      : "";
  const iconOnly =
    variant === "Icon-Outlined-Primary" ||
    variant === "Icon-Outlined-Secondary" ||
    variant === "Icon-Primary" ||
    variant === "Icon-Secondary" ||
    variant === "Icon-Only-Primary" ||
    variant === "Icon-Only-Secondary";
  const noBorder =
    variant === "Icon-Only-Primary" || variant === "Icon-Only-Secondary";

  const color = noBorder
    ? `hover:outline hover:outline-offset-2 rounded-full hover:outline-secondary cursor-pointer ${
        primary ? "text-primary" : "text-secondary"
      }`
    : primary
    ? "btn btn-primary"
    : "btn btn-secondary";

  return (
    <>
      <div className={iconOnly ? "tooltip" : ""} data-tip={title}>
        <label
          htmlFor={modalId}
          className={`${color} ${outlined} gap-2 py-0 btn-${buttonSize} `}
          tabIndex={0}
        >
          {buttonIcon ? buttonIcon : null}
          {iconOnly ? null : title}
        </label>
      </div>
      <input
        type="checkbox"
        id={modalId}
        className="modal-toggle"
        ref={closeRef}
        onChange={(e) => {
          if (e.target.checked && typeof onOpenModal === "function")
            onOpenModal();
        }}
      />
      <div className={`modal`}>
        <div
          className={`modal-box relative overflow-hidden ${className ?? ""}`}
        >
          <label
            htmlFor={modalId}
            className="btn btn-secondary btn-sm btn-circle absolute right-1 top-1"
          >
            <i className="bx bx-x bx-sm" />
          </label>
          {children}
          <div className="modal-action">
            {cancelButtonText !== "" ? (
              <button
                className="btn-outline btn btn-secondary"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof handleCancel === "function") handleCancel();
                  close();
                }}
              >
                {cancelButtonText ?? t("cancel")}
              </button>
            ) : null}
            {typeof handleSubmit === "function" ? (
              <button
                className="btn btn-primary"
                onClick={(e) => {
                  e.preventDefault();
                  handleClickSubmit();
                }}
              >
                {submitButtonText ?? t("save")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export function getButtonSize(size: ButtonSize) {
  switch (size) {
    case "lg":
      return "bx-md";
    case "md":
      return "bx-sm";
    default:
      return "bx-xs";
  }
}
