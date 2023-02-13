import { formatDateLocalized } from "@lib/formatDate";
import { useDayName } from "@lib/useDayName";
import { type DayName } from "@prisma/client";
import { addDays, startOfToday, subDays } from "date-fns";

type SelectDayProps = {
  day: DayName;
  onNewDay: (newDay: DayName) => void;
};

export default function SelectDay({ day, onNewDay }: SelectDayProps) {
  const { getName, getNextDay, getPreviousDay, getToday } = useDayName();

  return (
    <div className="btn-group">
      <button
        className="btn btn-primary"
        onClick={() => onNewDay(getPreviousDay(day))}
      >
        <i className="bx bx-chevron-left bx-sm" />
      </button>
      <span className="btn btn-primary w-32 text-center">{getName(day)}</span>
      <button className="btn btn-primary" onClick={() => onNewDay(getToday())}>
        <i className="bx bx-calendar-event bx-sm" />
      </button>
      <button
        className="btn btn-primary"
        onClick={() => onNewDay(getNextDay(day))}
      >
        <i className="bx bx-chevron-right bx-sm" />
      </button>
    </div>
  );
}

type SelectDateProps = {
  day: Date;
  onNewDay: (newDay: Date) => void;
};

export function SelectDate({ day, onNewDay }: SelectDateProps) {
  return (
    <div className="btn-group">
      <button
        className="btn btn-primary"
        onClick={() => onNewDay(subDays(day, 1))}
      >
        <i className="bx bx-chevron-left bx-sm" />
      </button>
      <span className="btn btn-primary w-32 text-center">
        {formatDateLocalized(day, { withDay: true })}
      </span>
      <button
        className="btn btn-primary"
        onClick={() => onNewDay(startOfToday())}
      >
        <i className="bx bx-calendar-event bx-sm" />
      </button>
      <button
        className="btn btn-primary"
        onClick={() => onNewDay(addDays(day, 1))}
      >
        <i className="bx bx-chevron-right bx-sm" />
      </button>
    </div>
  );
}
