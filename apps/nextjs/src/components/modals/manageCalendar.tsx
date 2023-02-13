import { fieldSet } from "@lib/fieldGetSet";
import { formatDateAsYYYYMMDD } from "@lib/formatDate";
import { DAYS } from "@lib/useDayName";
import { type DayName } from "@prisma/client";
import { api } from "@trpcclient/api";
import ButtonIcon from "@ui/buttonIcon";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Modal from "../ui/modal";

type WorkingHoursSchema = {
  opening: string;
  closing: string;
};

type OpeningTimeSchema = {
  name: DayName;
  wholeDay: boolean;
  closed: boolean;
  workingHours: WorkingHoursSchema[];
};
type CalendarFormSchema = {
  startDate: Date;
  openingTime: OpeningTimeSchema[];
};

function useFormCalendar(initialCalendar?: CalendarFormSchema) {
  const calendarDefaultValues: CalendarFormSchema = {
    startDate: new Date(),
    openingTime: DAYS.map((day) => ({
      name: day.value,
      wholeDay: true,
      closed: false,
      workingHours: [
        {
          opening: "00:00",
          closing: "23:59",
        },
      ],
    })),
  };
  const [calendar, setCalendar] = useState(calendarDefaultValues);
  useEffect(() => {
    if (initialCalendar) setCalendar(initialCalendar);
  }, [initialCalendar]);

  function updateCalendar(cal: CalendarFormSchema) {
    setCalendar(cal);
  }

  return { calendar, updateCalendar };
}

type FormCalendarProps = {
  calendarValues: CalendarFormSchema;
  onCalendarChange: (cal: CalendarFormSchema) => void;
};

function FormCalendar({ calendarValues, onCalendarChange }: FormCalendarProps) {
  const { t } = useTranslation("calendar");

  const onChange = (path: string, value: unknown) => {
    const cv = { ...calendarValues };
    fieldSet(cv, path, value);
    onCalendarChange(cv);
  };
  return (
    <>
      <div className="mb-2 grid grid-cols-[max-content,_1fr] gap-4">
        <label>{t("start-date")}</label>
        <input
          type="date"
          value={formatDateAsYYYYMMDD(calendarValues.startDate)}
          onChange={(e) => onChange("startDate", new Date(e.target.value))}
          className="input-bordered input w-full text-center"
        />
      </div>
      <table className="w-full table-auto">
        {/* header */}
        <thead>
          <tr>
            <th>{t("day")}</th>
            <th>{t("whole-day")}</th>
            <th>{t("closed")}</th>
            <th>{t("times")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, idx) => (
            <tr key={day.value}>
              <td>{t(day.label)}</td>
              <td className="text-center">
                <input
                  type="checkbox"
                  className="checkbox-primary checkbox"
                  checked={calendarValues.openingTime[idx]?.wholeDay ?? true}
                  onChange={(e) =>
                    onChange(`openingTime.${idx}.wholeDay`, e.target.checked)
                  }
                />
              </td>
              {!calendarValues.openingTime[idx]?.wholeDay ? (
                <>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      className="checkbox-primary checkbox"
                      checked={calendarValues.openingTime[idx]?.closed ?? false}
                      onChange={(e) =>
                        onChange(`openingTime.${idx}.closed`, e.target.checked)
                      }
                    />
                  </td>

                  {!calendarValues.openingTime[idx]?.closed ? (
                    <>
                      <td className="flex gap-2">
                        <input
                          type="time"
                          value={
                            calendarValues.openingTime[idx]?.workingHours?.[0]
                              ?.opening
                          }
                          onChange={(e) =>
                            onChange(
                              `openingTime.${idx}.workingHours.0.opening`,
                              e.target.value,
                            )
                          }
                          className="input-bordered input input-sm w-fit text-center"
                        />
                        <input
                          type="time"
                          value={
                            calendarValues.openingTime[idx]?.workingHours?.[0]
                              ?.closing
                          }
                          onChange={(e) =>
                            onChange(
                              `openingTime.${idx}.workingHours.0.closing`,
                              e.target.value,
                            )
                          }
                          className="input-bordered input input-sm w-fit text-center"
                        />
                      </td>
                      <td>
                        <ButtonIcon
                          title={t("more-times")}
                          iconComponent={<i className="bx bx-plus bx-xs" />}
                          buttonVariant="Icon-Outlined-Secondary"
                          buttonSize="sm"
                        />
                      </td>
                    </>
                  ) : null}
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

type ClubCalendarProps = {
  clubId: string;
};

export const CreateClubCalendar = ({ clubId }: ClubCalendarProps) => {
  const { t } = useTranslation("calendar");
  const utils = api.useContext();
  const { calendar, updateCalendar } = useFormCalendar();
  const saveCalendar = api.calendars.createCalendar.useMutation();
  const updateClub = api.clubs.updateClubCalendar.useMutation();

  function onSubmit() {
    saveCalendar.mutate(calendar, {
      async onSuccess(data) {
        if (data.id)
          updateClub.mutate({
            id: clubId,
            calendarId: data.id,
          });
        await utils.calendars.getCalendarForClub.invalidate(clubId);
      },
    });
  }

  return (
    <Modal
      title={t("create-club-calendar")}
      handleSubmit={onSubmit}
      submitButtonText={t("save-calendar")}
      buttonIcon={<i className="bx bx-time bx-sm" />}
      variant="Icon-Outlined-Primary"
      className="w-2/3 max-w-xl"
    >
      <h3>{t("create-club-calendar")}</h3>
      <FormCalendar
        calendarValues={calendar}
        onCalendarChange={updateCalendar}
      />
    </Modal>
  );
};

type SiteCalendarProps = {
  siteId: string;
  clubId: string;
};

export const CreateSiteCalendar = ({ siteId, clubId }: SiteCalendarProps) => {
  const { t } = useTranslation("calendar");
  const [showCalendar, setShowCalendar] = useState(false);
  const { calendar, updateCalendar } = useFormCalendar();
  const saveCalendar = api.calendars.createCalendar.useMutation();
  const updateSite = api.sites.updateSiteCalendar.useMutation();
  const utils = api.useContext();

  function onSubmit() {
    saveCalendar.mutate(calendar, {
      async onSuccess(data) {
        if (data.id)
          updateSite.mutate({
            id: siteId,
            calendarId: data.id,
          });
        await utils.calendars.getCalendarForSite.invalidate({ clubId, siteId });
      },
    });
  }

  return (
    <Modal
      title={t("create-site-calendar")}
      handleSubmit={onSubmit}
      submitButtonText={t("save-calendar")}
      buttonIcon={<i className="bx bx-time bx-sm" />}
      variant="Icon-Outlined-Primary"
      className="w-2/3 max-w-xl"
    >
      <h3>{t("create-site-calendar")}</h3>
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-4">
          <input
            type="checkbox"
            className="checkbox-primary checkbox"
            checked={!showCalendar}
            onChange={(e) => setShowCalendar(!e.target.checked)}
          />
          <span className="label-text">{t("same-as-club")}</span>
        </label>
      </div>
      {showCalendar ? (
        <FormCalendar
          calendarValues={calendar}
          onCalendarChange={updateCalendar}
        />
      ) : null}
    </Modal>
  );
};

type RoomCalendarProps = {
  clubId: string;
  siteId: string;
  roomId: string;
};

export const CreateRoomCalendar = ({
  roomId,
  siteId,
  clubId,
}: RoomCalendarProps) => {
  const { t } = useTranslation("calendar");
  const [sameAsClub, setSameAsClub] = useState(true);
  const [sameAsSite, setSameAsSite] = useState(true);
  const { calendar, updateCalendar } = useFormCalendar();
  const utils = api.useContext();

  const saveCalendar = api.calendars.createCalendar.useMutation({
    async onSuccess() {
      await utils.calendars.getCalendarForRoom.invalidate({
        clubId,
        roomId,
        siteId,
      });
      toast.success(t("calendar-created"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const updateRoomCal = api.sites.updateRoomCalendar.useMutation({
    async onSuccess() {
      await utils.calendars.getCalendarForRoom.invalidate({
        clubId,
        roomId,
        siteId,
      });
      toast.success(t("calendar-updated"));
    },
    onError(error) {
      toast.error(error.message);
    },
  });
  const updateRoom = api.sites.updateRoom.useMutation({
    async onSuccess() {
      await utils.calendars.getCalendarForRoom.invalidate({
        clubId,
        roomId,
        siteId,
      });
    },
  });

  function onSubmit() {
    if (sameAsClub || sameAsSite) {
      updateRoom.mutate({
        id: roomId,
        openWithClub: sameAsClub,
        openWithSite: sameAsSite,
      });
    } else {
      saveCalendar.mutate(calendar, {
        onSuccess(data) {
          if (data.id)
            updateRoomCal.mutate({
              id: roomId,
              calendarId: data.id,
            });
        },
      });
    }
  }

  return (
    <Modal
      title={t("create-room-calendar")}
      handleSubmit={onSubmit}
      submitButtonText={t("save-calendar")}
      buttonIcon={<i className="bx bx-time bx-sm" />}
      variant="Icon-Outlined-Primary"
      className="w-2/3 max-w-xl"
    >
      <h3>{t("create-room-calendar")}</h3>
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-4">
          <input
            type="checkbox"
            className="checkbox-primary checkbox"
            checked={sameAsClub}
            onChange={(e) => setSameAsClub(e.target.checked)}
          />
          <span className="label-text">{t("same-as-club")}</span>
        </label>
      </div>
      {sameAsClub ? null : (
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-4">
            <input
              type="checkbox"
              className="checkbox-primary checkbox"
              checked={sameAsSite}
              onChange={(e) => setSameAsSite(e.target.checked)}
            />
            <span className="label-text">{t("same-as-site")}</span>
          </label>
        </div>
      )}
      {!sameAsClub && !sameAsSite ? (
        <FormCalendar
          calendarValues={calendar}
          onCalendarChange={updateCalendar}
        />
      ) : null}
    </Modal>
  );
};
