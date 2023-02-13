import { z } from "zod";

export function isCUID(value: unknown) {
  const schema = z.string().cuid();
  const check = schema.safeParse(value);
  return check.success;
}
