import { StreamChat } from "stream-chat";
import { env } from "@root/src/env/server.mjs";

export const streamchatClient = StreamChat.getInstance(
  env.STREAMCHAT_API_KEY,
  env.STREAMCHAT_SECRET_KEY
);
if (!streamchatClient.secret)
  streamchatClient.secret = env.STREAMCHAT_SECRET_KEY;

export function createToken(userId: string) {
  const token = streamchatClient.createToken(userId);
  return token;
}
