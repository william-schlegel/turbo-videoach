import { appRouter, createTRPCContext } from "@acme/api";
import { createNextApiHandler } from "@trpc/server/adapters/next";
import { env } from "~/env.mjs";

// export API handler
export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }) => {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          console.error(`❌ tRPC failed on ${path}: ${error}`);
        }
      : undefined,
});

// If you need to enable cors, you can do so like this:
// const handler = async (req: NextApiRequest, res: NextApiResponse) => {
//   // Enable cors
//   await cors(req, res);

//   // Let the tRPC handler do its magic
//   return createNextApiHandler({
//     router: appRouter,
//     createContext,
//   })(req, res);
// };

// export default handler;
