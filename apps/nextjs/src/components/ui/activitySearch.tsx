import useDebounce from "@lib/useDebounce";
import { api } from "@trpcclient/api";
import { type DefaultTFuncReturn } from "i18next";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";

type Props = {
  label?: DefaultTFuncReturn;
  initialActivity?: string;
  onSearch: (activity: ActivityData) => void;
  onActivityChange: (value: string) => void;
  required?: boolean;
  iconActivity?: boolean;
  error?: DefaultTFuncReturn;
  className?: string;
};

type ActivityData = {
  id: string;
  name: string;
};

const ActivitySearch = ({
  initialActivity,
  label,
  onSearch,
  required,
  iconActivity = true,
  error,
  onActivityChange,
  className,
}: Props) => {
  const [activity, setActivity] = useState("");
  const debouncedActivity = useDebounce<string>(activity, 500);
  const { t } = useTranslation("common");
  const [showList, setShowList] = useState(false);

  const activities = api.coachs.getOfferActivityByName.useQuery(
    debouncedActivity,
    { enabled: debouncedActivity !== "" },
  );

  useEffect(() => {
    onActivityChange(debouncedActivity);
    setShowList(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedActivity]);

  useEffect(() => {
    if (initialActivity) setActivity(initialActivity);
  }, [initialActivity]);

  return (
    <>
      {label ? (
        <label className={`label ${required ? "required" : ""}`}>{label}</label>
      ) : null}
      <div className={`dropdown-bottom dropdown ${className ?? ""}`}>
        <div className="input-group">
          {iconActivity ? (
            <span>
              <i className="bx bx-search bx-md text-primary" />
            </span>
          ) : null}
          <input
            className="input-bordered input w-full"
            value={debouncedActivity}
            onChange={(e) => setActivity(e.currentTarget.value)}
            list="activities"
            placeholder={t("enter-activity") ?? ""}
          />
        </div>
        {error ? <p className="label-text-alt text-error">{error}</p> : null}
        {showList && activities.data?.length ? (
          <ul className="dropdown-content menu rounded-box w-full bg-base-100 p-2 shadow">
            {activities.data?.map((activity) => (
              <li key={activity.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActivity(activity.name);
                    onSearch({ id: activity.id, name: activity.name });
                    setShowList(false);
                  }}
                >
                  <TextHighlighted
                    text={activity.name}
                    highlight={debouncedActivity}
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
};

export default ActivitySearch;

function TextHighlighted({
  text,
  highlight,
}: {
  text: string;
  highlight: string;
}) {
  const regex = new RegExp(`(${highlight})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((p, idx) => (
        <span
          key={`P-${idx}`}
          className={
            p.toLocaleLowerCase() === highlight.toLocaleLowerCase()
              ? "font-semibold text-accent"
              : ""
          }
        >
          {p}
        </span>
      ))}
    </span>
  );
}
