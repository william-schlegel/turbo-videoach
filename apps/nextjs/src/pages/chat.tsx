import { isCUID } from "@lib/checkValidity";
import { api } from "@trpcclient/api";
import { type GetServerSidePropsContext } from "next";
import { useSession } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { StreamChat } from "stream-chat";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";

const client = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAMCHAT_API_KEY ?? "",
);

const Chat = () => {
  const { t } = useTranslation("dashboard");
  const { data: sessionData } = useSession();
  const user = api.users.getUserById.useQuery(sessionData?.user?.id ?? "", {
    enabled: isCUID(sessionData?.user?.id),
    async onSuccess(data) {
      if (data && data.id && data.chatToken) {
        const token = data.chatToken;
        await client.connectUser(
          {
            id: data.id,
            name: data.name ?? "",
            image: data.image,
          },
          token,
        );
      }
    },
  });

  return (
    <Layout
      title={t("my-chat")}
      className="container mx-auto my-2 space-y-2 p-2"
    >
      <h1>{t("my-chat")}</h1>
      {user.data?.name}
    </Layout>
  );
};

export default Chat;

export const getServerSideProps = async ({
  locale,
}: GetServerSidePropsContext) => {
  return {
    props: {
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "dashboard"],
        nextI18nConfig,
      )),
    },
  };
};
