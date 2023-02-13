import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { appWithTranslation } from "next-i18next";
import { type AppType } from "next/app";
import { ToastContainer } from "react-toastify";

import "mapbox-gl/dist/mapbox-gl.css";
import "react-toastify/dist/ReactToastify.css";
import "../styles/globals.css";

import useLocalStorage from "@lib/useLocalstorage";
import { api } from "@trpcclient/api";
import nextI18nConfig from "~/../next-i18next.config.mjs";
import { type TThemes } from "../components/themeSelector";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  const [theme] = useLocalStorage<TThemes>("theme", "cupcake");
  return (
    <>
      <SessionProvider session={session}>
        <Component {...pageProps} />
        <ToastContainer
          autoClose={3000}
          theme={theme === "dark" ? "dark" : "colored"}
        />
      </SessionProvider>
    </>
  );
};

const I18nApp = appWithTranslation(MyApp, nextI18nConfig);
const TRPCApp = api.withTRPC(I18nApp);

export default TRPCApp;
