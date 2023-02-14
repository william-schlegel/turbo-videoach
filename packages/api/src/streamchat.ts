import { StreamChat } from "stream-chat";

export const streamchatClient = StreamChat.getInstance(
  process.env.STREAMCHAT_API_KEY as string,
  process.env.STREAMCHAT_SECRET_KEY,
);
if (!streamchatClient.secret)
  streamchatClient.secret = process.env.STREAMCHAT_SECRET_KEY;

export function createToken(userId: string) {
  const token = streamchatClient.createToken(userId);
  return token;
}
