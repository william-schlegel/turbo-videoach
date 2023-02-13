import { intervalToDuration, startOfToday, format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { i18n } from "next-i18next";

/**
 * Convert a date to a compatible format fo date input
 * @param dt date to covert (default = now)
 * @returns date formated as YYYY-MM-DD
 */
export const formatDateAsYYYYMMDD = (
  dt: Date = startOfToday(),
  withTime?: boolean
) => {
  let d = format(dt, "yyyy-MM-dd");
  if (withTime) d = d.concat("T").concat(format(dt, "HH:mm:ss"));
  return d;
};

/**
 * calculate nthe number of days from a certain date to now
 * @param startDate date to start calculation from
 * @returns nimber of days since the start date
 */
export const remainingDays = (startDate: Date) => {
  const days =
    intervalToDuration({ start: startDate, end: startOfToday() }).days ?? 0;
  return Math.max(days, 0);
};

type TformatDateLocalizedOptions = {
  withTime?: boolean;
  withDay?: boolean | "short" | "long";
  dateFormat?: "number" | "short" | "long" | "month-year";
};

export const formatDateLocalized = (
  dt: Date | null | undefined,
  options: TformatDateLocalizedOptions = {
    withDay: false,
    withTime: false,
    dateFormat: "number",
  }
) => {
  const { withTime, withDay, dateFormat } = options;
  let frmt = "";
  if (withDay === true || withDay === "short") frmt = "E ";
  if (withDay === "long") frmt = "EEEE ";
  if (dateFormat === "number") frmt = frmt.concat("P");
  if (dateFormat === "short") frmt = frmt.concat("PP");
  if (dateFormat === "long") frmt = frmt.concat("PPP");
  if (dateFormat === "month-year") frmt = frmt.concat("d MMMM");
  if (withTime) frmt = frmt.concat("p");
  return format(dt ?? startOfToday(), frmt, {
    locale: i18n?.language === "en" ? enUS : fr,
  });
};
