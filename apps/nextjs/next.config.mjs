/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds and Linting.
 */
import config from "./next-i18next.config.mjs";

!process.env.SKIP_ENV_VALIDATION && (await import("./src/env.mjs"));

/**
 * @template {import('next').NextConfig} T
 * @param {T} config - A generic parameter that flows through to the return type
 * @constraint {{import('next').NextConfig}}
 */
function defineNextConfig(config) {
  return config;
}

/** @type {import("next").NextConfig} */
const configNext = {
  reactStrictMode: true,
  swcMinify: true,
  i18n: config.i18n,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudfront.net" },
      { protocol: "https", hostname: "platform-lookaside.fbsbx.com" },
      { protocol: "https", hostname: "videoach-*.s3.eu-west-3.amazonaws.com" },
    ],
  },
};
export default defineNextConfig(configNext);
