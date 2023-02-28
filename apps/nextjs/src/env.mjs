import { z } from "zod";

/**
 * Specify your server-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
export const server = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  NEXTAUTH_SECRET:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),
  NEXTAUTH_URL: z.preprocess(
    // This makes Vercel deployments not fail if you don't set NEXTAUTH_URL
    // Since NextAuth.js automatically uses the VERCEL_URL if present.
    (str) => process.env.VERCEL_URL ?? str,
    // VERCEL_URL doesn't include `https` so it cant be validated as a URL
    process.env.VERCEL ? z.string() : z.string().url(),
  ),
  STRAVA_CLIENT_ID: z.string(),
  STRAVA_CLIENT_SECRET: z.string(),
  FACEBOOK_ID: z.string(),
  FACEBOOK_SECRET: z.string(),
  GOOGLE_ID: z.string(),
  GOOGLE_SECRET: z.string(),
  EMAIL_FROM: z.string().email(),
  // EMAIL_SERVER: z.string(),
  EMAIL_SERVER_USER: z.string(),
  EMAIL_SERVER_PASSWORD: z.string(),
  EMAIL_SERVER_HOST: z.string(),
  EMAIL_SERVER_PORT: z.enum(["25", "587", "465", "2525", "25025"]),
  AWS_ACCESS_KEY_ID_WSC: z.string(),
  AWS_SECRET_ACCESS_KEY_WSC: z.string(),
});

/**
 * Specify your client-side environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 * To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
export const client = z.object({
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string(),
  NEXT_PUBLIC_MAPQUEST_KEY: z.string(),
});

/**
 * You can't destruct `process.env` as a regular object in the Next.js
 * edge runtimes (e.g. middlewares) or client-side so we need to destruct manually.
 * @type {Record<keyof z.infer<typeof server> | keyof z.infer<typeof client>, string | undefined>}
 */
const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  FACEBOOK_ID: process.env.FACEBOOK_ID,
  FACEBOOK_SECRET: process.env.FACEBOOK_SECRET,
  GOOGLE_ID: process.env.GOOGLE_ID,
  GOOGLE_SECRET: process.env.GOOGLE_SECRET,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
  EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
  EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
  EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
  AWS_ACCESS_KEY_ID_WSC: process.env.AWS_ACCESS_KEY_ID_WSC,
  AWS_SECRET_ACCESS_KEY_WSC: process.env.AWS_SECRET_ACCESS_KEY_WSC,

  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  NEXT_PUBLIC_MAPQUEST_KEY: process.env.NEXT_PUBLIC_MAPQUEST_KEY,
};

// Don't touch the part below
// --------------------------

const formatErrors = (
  /** @type {z.ZodFormattedError<Map<string,string>,string>} */
  errors,
) =>
  Object.entries(errors)
    .map(([name, value]) => {
      if (value && "_errors" in value)
        return `${name}: ${value._errors.join(", ")}\n`;
    })
    .filter(Boolean);

const isServer = typeof window === "undefined";

const merged = server.merge(client);
const parsed = isServer
  ? merged.safeParse(processEnv) // on server we can validate all env vars
  : client.safeParse(processEnv); // on client we can only validate the ones that are exposed

if (parsed.success === false) {
  console.error(
    "❌ Invalid environment variables:\n",
    ...formatErrors(parsed.error.format()),
  );
  throw new Error("Invalid environment variables");
}

/** @type z.infer<merged>
 *  @ts-ignore - can't type this properly in jsdoc */
export const env = new Proxy(parsed.data, {
  get(target, prop) {
    if (typeof prop !== "string") return undefined;
    // Throw a descriptive error if a server-side env var is accessed on the client
    // Otherwise it would just be returning `undefined` and be annoying to debug
    if (!isServer && !prop.startsWith("NEXT_PUBLIC_"))
      throw new Error(
        `❌ Attempted to access server-side environment variable '${prop}' on the client`,
      );

    // @ts-ignore - can't type this properly in jsdoc
    return target[prop];
  },
});
