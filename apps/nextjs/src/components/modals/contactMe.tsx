import { api } from "@trpcclient/api";
import { useTranslation } from "next-i18next";
import {
  SubmitHandler,
  useForm,
  type SubmitErrorHandler,
} from "react-hook-form";
import { toast } from "react-toastify";
import { isCUID } from "~/lib/checkValidity";
import Modal from "../ui/modal";
import SimpleForm from "../ui/simpleform";

type ContactFormValues = {
  message: string;
};

type ContactMeProps = {
  userId: string;
  coachId: string;
};

export const ContactMe = ({ coachId, userId }: ContactMeProps) => {
  const { t } = useTranslation("pages");
  const user = api.users.getUserById.useQuery(userId, {
    enabled: isCUID(userId),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormValues>();
  const createNotification =
    api.notifications.createNotificationToUser.useMutation({
      onSuccess: () => {
        toast.success(t("coach.message-sent"));
      },
      onError(error) {
        toast.error(error.message);
      },
    });
  const onSubmit: SubmitHandler<ContactFormValues> = (
    data: ContactFormValues,
  ) => {
    if (!userId) {
      toast.error(t("coach.must-be-connected"));
      return;
    }
    createNotification.mutate({
      from: userId,
      to: coachId,
      type: "NEW_REQUEST",
      message: data.message,
      data: JSON.stringify({
        email: user.data?.email,
        name: user.data?.name,
      }),
    });
    reset();
  };

  const onError: SubmitErrorHandler<ContactFormValues> = (errors) => {
    console.error("errors", errors);
  };

  return (
    <Modal
      title={t("coach.contact-me")}
      buttonIcon={<i className="bx bx-envelope bx-xs" />}
      handleSubmit={handleSubmit(onSubmit, onError)}
    >
      <h3>{t("coach.contact-me")}</h3>
      <SimpleForm<ContactFormValues>
        register={register}
        errors={errors}
        fields={[
          {
            name: "message",
            rows: 3,
            label: t("coach.message"),
            required: t("coach.message-mandatory"),
          },
        ]}
      />
    </Modal>
  );
};
