import { appRouter } from "@acme/api";
import { getServerSession } from "@acme/auth";
import { isCUID } from "@lib/checkValidity";
import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { type NextApiRequest, type NextApiResponse } from "next";

type ResponseData = {
  success?: string;
  error?: string;
  step?: string;
  trpcerror?: string;
};

const cancelSubscription = async (
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>,
) => {
  const session = await getServerSession({ req, res });
  const prisma = new PrismaClient({ log: ["error"] });

  const caller = appRouter.createCaller({ session, prisma });

  const notificationId = req.query.notificationId as string;

  if (!notificationId || !isCUID(notificationId))
    return res.status(500).json({
      error: "common:api.error-cancel-subscription",
      step: "notificationId",
    });

  if (session) {
    try {
      const notification = await caller.notifications.getNotificationById({
        notificationId: notificationId,
        updateViewDate: false,
      });
      if (!notification)
        return res.status(500).json({
          error: "common:api.error-cancel-subscription",
          step: "notification",
        });
      const sData = notification.data as {
        subscriptionId: string;
        monthly: boolean;
        online: boolean;
      };
      if (!isCUID(sData.subscriptionId))
        return res.status(500).json({
          error: "common:api.error-cancel-subscription",
          step: "subscriptionId",
        });

      // create aswer notification
      const answer = await caller.notifications.createNotificationToUser({
        from: notification.userToId,
        to: notification.userFromId,
        type: "SUBSCRIPTION_REJECTED",
        message: "",
        linkedNotification: notification.id,
        data: JSON.stringify(sData),
      });
      // update notification answered
      await caller.notifications.updateNotification({
        id: notificationId,
        answered: new Date(Date.now()),
        answer: "common:api.reject",
        linkedNotification: answer.id,
      });
      res.status(200).json({ success: "common:api.subscription-rejected" });
    } catch (e) {
      if (e instanceof TRPCError) {
        // We can get the specific HTTP status code coming from tRPC (e.g. 404 for `NOT_FOUND`).
        const httpStatusCode = getHTTPStatusCodeFromError(e);

        res.status(httpStatusCode).json({ trpcerror: e.message });
        return;
      }
      res.status(500).json({ error: "common:api.error" });
    }
  }
};

export default cancelSubscription;
