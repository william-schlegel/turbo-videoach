import { isCUID } from "@lib/checkValidity";
import { Role, type Feature } from "@prisma/client";
import { api } from "@trpcclient/api";
import { differenceInDays, startOfToday } from "date-fns";
import { useSession } from "next-auth/react";
import { useState } from "react";

export const ROLE_LIST = [
  { label: "user", value: Role.MEMBER },
  { label: "coach", value: Role.COACH },
  { label: "manager", value: Role.MANAGER },
  { label: "manager-coach", value: Role.MANAGER_COACH },
  { label: "admin", value: Role.ADMIN },
] as const;

export function getRoleName(role: Role) {
  return ROLE_LIST.find((r) => r.value === role)?.label ?? "???";
}

export default function useUserInfo(userId?: string | null) {
  const [remainTrial, setRemainTrial] = useState(0);
  const [features, setFeatures] = useState<Feature[]>([]);
  const { data: sessionData } = useSession();

  const uId = userId ?? sessionData?.user?.id ?? "";

  api.users.getUserById.useQuery(uId, {
    enabled: isCUID(uId),
    onSuccess(data) {
      const trialLimit = data?.trialUntil ?? new Date(0);
      const today = startOfToday();
      setRemainTrial(differenceInDays(trialLimit, today));
      setFeatures(data?.pricing?.features.map((f) => f.feature) ?? []);
    },
  });

  return { trial: remainTrial > 0, remainTrial, features };
}
