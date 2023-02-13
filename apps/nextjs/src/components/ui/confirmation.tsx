import { type DefaultTFuncReturn } from "i18next";
import { useTranslation } from "next-i18next";
import { type ReactNode } from "react";
import { type ButtonSize } from "./buttonIcon";
import Modal, { type TModalVariant } from "./modal";

type Props = {
  title: DefaultTFuncReturn;
  message: DefaultTFuncReturn;
  textConfirmation?: DefaultTFuncReturn;
  textCancel?: DefaultTFuncReturn;
  onConfirm: () => void;
  onCancel?: () => void;
  buttonIcon?: ReactNode;
  variant?: TModalVariant;
  buttonSize?: ButtonSize;
};

function Confirmation({
  title,
  message,
  textConfirmation,
  textCancel,
  onConfirm,
  onCancel,
  buttonIcon,
  variant = "Secondary",
  buttonSize = "md",
}: Props) {
  const { t } = useTranslation("common");
  return (
    <Modal
      title={title}
      handleSubmit={onConfirm}
      handleCancel={onCancel}
      submitButtonText={textConfirmation ?? t("continue")}
      cancelButtonText={textCancel}
      buttonIcon={buttonIcon}
      variant={variant}
      buttonSize={buttonSize}
    >
      <h3>{title}</h3>
      <div className="flex flex-col">
        {message && message.split("|").map((p, idx) => <p key={idx}>{p}</p>)}
      </div>
    </Modal>
  );
}

export default Confirmation;
