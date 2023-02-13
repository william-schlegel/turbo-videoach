import type { UserNotification } from "@prisma/client";
import { api } from "@trpcclient/api";
import { useTranslation } from "next-i18next";
import { useState } from "react";
import { isCUID } from "./checkValidity";

function useNotifications(userId: string | undefined | null) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const { t } = useTranslation("common");

  const getNotifications = api.notifications.getNotificationToUser.useQuery(
    { userToId: userId ?? "" },
    {
      enabled: isCUID(userId),
      onSuccess(data) {
        if (data) {
          setNotifications(data.notifications);
          setUnread(data.unread);
        }
      },
      refetchInterval: 1 * 60 * 1000, // 1'
    },
  );

  function formatMessage(notification: UserNotification) {
    if (notification.type === "NEW_SUBSCRIPTION")
      return t("api.new-subscription");
    if (notification.type === "SUBSCRIPTION_VALIDATED")
      return t("api.subscription-accepted");
    if (notification.type === "SUBSCRIPTION_REJECTED")
      return t("api.subscription-rejected");
    return notification.message;
  }

  return {
    isLoading: getNotifications.isLoading,
    notifications,
    unread,
    formatMessage,
  };
}
export default useNotifications;
