import { DayName } from "@prisma/client";
import { getDay } from "date-fns";

export function getDayName(dt: Date) {
  const day = getDay(dt);
  switch (day) {
    case 0:
      return DayName.SUNDAY;
    case 1:
      return DayName.MONDAY;
    case 2:
      return DayName.TUESDAY;
    case 3:
      return DayName.WEDNESDAY;
    case 4:
      return DayName.THURSDAY;
    case 5:
      return DayName.FRIDAY;
    case 6:
      return DayName.SATURDAY;
    default:
      return DayName.SUNDAY;
  }
}
