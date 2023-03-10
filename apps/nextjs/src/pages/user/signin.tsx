import { getProviders } from "@acme/auth";
import useLocalStorage from "@lib/useLocalstorage";
import { api } from "@trpcclient/api";
import Modal from "@ui/modal";
import SimpleForm from "@ui/simpleform";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { signIn } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  useForm,
  type SubmitErrorHandler,
  type SubmitHandler,
} from "react-hook-form";
import { toast } from "react-toastify";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import Layout from "~/components/layout";
import { type TThemes } from "~/components/themeSelector";

export default function SignIn({
  providers,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [theme] = useLocalStorage<TThemes>("theme", "cupcake");
  const { data: sessionData } = api.auth.getSession.useQuery();

  const signInEmail = router.query.email;
  const signInCredentials = router.query.password;
  const callback = router.query.callback as string | undefined;

  if (signInEmail)
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-base-200"
        data-theme={theme}
      >
        <Head>
          <title>Videoach - Magic link</title>
        </Head>
        <div className="rounded border border-primary bg-base-100 p-12 text-center">
          <h1>{t("signin.continue-with-link")}</h1>
          <p className="text-lg font-semibold">
            {t("signin.check-your-mail", { email: signInEmail })}
          </p>
          <p>{t("signin.close-page")}</p>
        </div>
      </div>
    );
  if (signInCredentials) {
    if (sessionData?.user?.id) router.push("/videoach");
  }

  return (
    <Layout
      title={t("signin.connect")}
      className="grid h-screen place-items-center"
    >
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{t("signin.connect")}</h2>
          {signInCredentials ? (
            <div className="alert alert-error">
              {t("signin.wrong-credentials")}
            </div>
          ) : null}
          {providers
            ? Object.values(providers)
                .filter((p) => p.id !== "email" && p.id !== "credentials")
                .map((provider) => (
                  <button
                    className="btn-outline btn w-full"
                    key={provider.name}
                    onClick={() =>
                      signIn(provider.id, {
                        redirect: true,
                        callbackUrl: callback ?? "/",
                      })
                    }
                  >
                    {t("signin.connect-with-account")} {provider.name}
                  </button>
                ))
            : null}
          <div className="divider">{t("signin.or")}</div>
          <form
            onSubmit={() =>
              signIn("email", { email, redirect: true, callbackUrl: "/" })
            }
            className="grid grid-cols-[auto,1fr] gap-2"
          >
            <label className="required">{t("signin.my-email")}</label>
            <input
              type="email"
              required
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-bordered input w-full"
            />
            <div className="col-span-full flex flex-col gap-4">
              <p>{t("signin.magic-link")}</p>
              <button type="submit" className="btn-outline btn w-full">
                {t("signin.connect-with-account")} {"Email"}
              </button>
            </div>
          </form>
          <div className="divider">{t("signin.or")}</div>
          <form
            onSubmit={() =>
              signIn("credentials", {
                email,
                password,
                redirect: true,
                callbackUrl: "/",
              })
            }
            className="grid grid-cols-[auto,1fr] gap-2"
          >
            <label className="required">{t("signin.password")}</label>
            <input
              type="password"
              required
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-bordered input w-full"
            />
            <div className="col-span-full flex flex-col gap-4">
              <p>{t("signin.credentials")}</p>
              <button type="submit" className="btn-outline btn w-full">
                {t("signin.connect-with-account")} {t("signin.local")}
              </button>
            </div>
          </form>
          <div className="divider"></div>
          <CreateAccount />
        </div>
      </div>
    </Layout>
  );
}

type AccountFormValues = {
  name: string;
  email: string;
  password: string;
};

function CreateAccount() {
  const { t } = useTranslation("auth");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormValues>();
  const createUser = api.users.createUserWithCredentials.useMutation({
    onSuccess() {
      toast.success(t("signin.user-created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const onSubmit: SubmitHandler<AccountFormValues> = (data) => {
    console.log("data", data);
    createUser.mutate(data);
  };

  const onError: SubmitErrorHandler<AccountFormValues> = (errors) => {
    console.error("errors", errors);
  };

  return (
    <Modal
      title={t("signin.create-account")}
      handleSubmit={handleSubmit(onSubmit, onError)}
      errors={errors}
      buttonIcon={<i className="bx bx-user bx-xs" />}
      variant={"Outlined-Primary"}
    >
      <SimpleForm
        errors={errors}
        register={register}
        fields={[
          { name: "name", label: t("profile.name"), required: true },
          {
            name: "email",
            label: t("profile.my-email"),
            type: "email",
            required: true,
          },
          {
            name: "password",
            label: t("profile.password"),
            type: "password",
            required: true,
          },
        ]}
      />
    </Modal>
  );
}

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  const providers = await getProviders();
  return {
    props: {
      providers,
      ...(await serverSideTranslations(
        locale ?? "fr",
        ["common", "auth"],
        nextI18nConfig,
      )),
    },
  };
}
