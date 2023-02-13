import path from "path";

/** @type {import("next-i18next").UserConfig} */
const config = {
  debug: process.env.NODE_ENV === "development",
  reloadOnPrerender: process.env.NODE_ENV === "development",
  i18n: {
    locales: ["en", "fr"],
    defaultLocale: "fr",
  },
  localePath: path.resolve("./public/locales"),

  // reloadOnPrerender: process.env.NODE_ENV === "development",
};
export default config;
