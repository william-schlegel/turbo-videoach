import { DAYS } from "@lib/useDayName";
import type {
  DayOpeningTime,
  OpeningTime,
  OpeningCalendar,
} from "@prisma/client";
import Spinner from "@ui/spinner";
import { useTranslation } from "next-i18next";
import { Fragment } from "react";

type Props = {
  calendar?:
    | (OpeningCalendar & {
        openingTime: (DayOpeningTime & { workingHours: OpeningTime[] })[];
      })
    | null
    | undefined;
  isLoading: boolean;
};

function CalendarWeek({ calendar, isLoading }: Props) {
  const { t } = useTranslation("calendar");

  if (isLoading) return <Spinner />;
  if (!calendar) return <div>{t("no-calendar")}</div>;
  return (
    <div className="rounded border border-primary p-1">
      <table className="w-full table-auto">
        <thead>
          <tr>
            {DAYS.map((day) => (
              <td key={day.value} className="text-center">
                {t(day.label)}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {calendar.openingTime.map((ot) => {
              if (ot.wholeDay)
                return (
                  <td
                    key={ot.id}
                    className="bg-primary text-center text-primary-content"
                  >
                    {t("whole-day")}
                  </td>
                );
              if (ot.closed)
                return (
                  <td
                    key={ot.id}
                    className="bg-secondary text-center text-secondary-content"
                  >
                    {t("closed")}
                  </td>
                );
              return (
                <td
                  key={ot.id}
                  className="bg-primary text-center text-primary-content"
                >
                  {ot.workingHours.map((wh) => (
                    <Fragment key={wh.id}>
                      <span>{wh.opening}</span>
                      <span className="ml-2">{wh.closing}</span>
                    </Fragment>
                  ))}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default CalendarWeek;
