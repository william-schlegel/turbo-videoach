import { LATITUDE, LONGITUDE } from "@lib/defaultValues";
import hslToHex from "@lib/hslToHex";
import { useHover } from "@lib/useHover";
import useLocalStorage from "@lib/useLocalstorage";
import { api } from "@trpcclient/api";
import turfCircle from "@turf/circle";
import AddressSearch, { type AddressData } from "@ui/addressSearch";
import ButtonIcon from "@ui/buttonIcon";
import Rating from "@ui/rating";
import { useTranslation } from "next-i18next";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Source, useMap } from "react-map-gl";
import { type TThemes } from "../themeSelector";

type FindCoachProps = {
  address?: string;
  onSelect?: (coachDataId: string) => void;
  onSelectMultiple?: (coachDataIds: string[]) => void;
  className?: string;
};

function FindCoach({
  address = "",
  onSelect,
  onSelectMultiple,
  className,
}: FindCoachProps) {
  const { t } = useTranslation("home");
  const [myAddress, setMyAddress] = useState<AddressData>({
    address: "",
    lat: LATITUDE,
    lng: LONGITUDE,
  });
  const [range, setRange] = useState(10);
  const [hoveredId, setHoveredId] = useState("");
  const coachSearch = api.coachs.getCoachsFromDistance.useQuery(
    {
      locationLat: myAddress.lat,
      locationLng: myAddress.lng,
      range,
    },
    { enabled: false, refetchOnWindowFocus: false },
  );
  const [theme] = useLocalStorage<TThemes>("theme", "cupcake");

  type TCoachItem = typeof coachSearch.data extends (infer U)[] | undefined
    ? U
    : never;
  const handleSearch = () => {
    setSelectedCoachs(new Set());
    coachSearch.refetch();
  };
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const map = useMap();
  const handleResize = useCallback(() => {
    if (map.current) map.current.resize();
  }, [map]);

  useEffect(() => {
    if (mapContainerRef.current)
      new ResizeObserver(handleResize).observe(mapContainerRef.current);
  }, [handleResize]);

  useEffect(() => {
    setMyAddress({
      address,
      lat: LATITUDE,
      lng: LONGITUDE,
    });
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);
  const circle = useMemo(() => {
    const center = [myAddress.lng ?? LONGITUDE, myAddress.lat ?? LATITUDE];
    const c = turfCircle(center, range ?? 10, {
      steps: 64,
      units: "kilometers",
      properties: {},
    });
    return c;
  }, [myAddress.lat, myAddress.lng, range]);
  const [selectedCoachs, setSelectedCoachs] = useState(new Set<string>());

  const withSelect = typeof onSelect === "function";
  const withSelectMultiple = typeof onSelectMultiple === "function";

  function handleSelect(id: string, checked: boolean) {
    const selected = new Set(selectedCoachs);
    if (checked) selected.add(id);
    else selected.delete(id);
    setSelectedCoachs(selected);
  }

  function CoachRow({
    item,
    onHover,
  }: {
    item: TCoachItem;
    onHover: (id: string) => void;
  }) {
    const ref = useRef<HTMLTableRowElement | null>(null);
    const isHovered = useHover(ref);

    useEffect(() => {
      if (isHovered) onHover(item.id);
    }, [isHovered, onHover, item]);

    return (
      <tr className={`hover ${className ?? ""}`} ref={ref}>
        <td>{item.publicName}</td>
        <td>{item.distance.toFixed(0)}&nbsp;km</td>
        <td>
          <Rating note={item.rating ?? 0} />
        </td>
        <td>
          <div className="flex flex-wrap gap-1">
            {item.coachingActivities.length ? (
              item.coachingActivities.map((activity) => (
                <span key={activity.id} className="pill pill-xs">
                  {activity.name}
                </span>
              ))
            ) : (
              <span>&nbsp;</span>
            )}
          </div>
        </td>
        <td>
          {item?.page?.published ? (
            <Link
              href={`/presentation-page/coach/${item.id}/${item.page.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <ButtonIcon
                title={t("page-coach", { name: item.publicName })}
                iconComponent={<i className="bx bx-link-external bx-xs" />}
                buttonSize="sm"
                buttonVariant="Icon-Outlined-Primary"
              />
            </Link>
          ) : (
            <span>&nbsp;</span>
          )}
        </td>
        {withSelect ? (
          <td>
            <span
              className="btn-primary btn-xs btn"
              tabIndex={0}
              onClick={() => onSelect(item.userId)}
            >
              {t("select")}
            </span>
          </td>
        ) : null}
        {withSelectMultiple ? (
          <td>
            <input
              type="checkbox"
              checked={selectedCoachs.has(item.userId)}
              className="checkbox-primary checkbox"
              onChange={(e) => handleSelect(item.userId, e.target.checked)}
            />
          </td>
        ) : null}
      </tr>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-2">
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-sm text-start">
          <AddressSearch
            label={t("my-address")}
            onSearch={(adr) => setMyAddress(adr)}
            defaultAddress={myAddress.address}
            className="w-full"
          />
        </div>
        <div className="grid w-full max-w-sm grid-flow-col gap-4 text-start">
          <label>{t("search-radius")}</label>
          <div className="input-group">
            <input
              type="number"
              className="input-bordered input w-full text-end"
              value={range}
              onChange={(e) => setRange(e.target.valueAsNumber)}
            />
            <span>Km</span>
          </div>
        </div>
        <button
          className="btn-primary btn flex items-center gap-4"
          onClick={() => handleSearch()}
        >
          {t("search-coach")}
          <i className="bx bx-search bx-xs" />
        </button>
        <div className="mt-8">
          <table className="table-zebra table border border-base-300">
            <thead>
              <tr>
                <th>{t("coach")}</th>
                <th>{t("distance")}</th>
                <th>{t("rating")}</th>
                <th>{t("activities")}</th>
                <th>{t("page")}</th>
                {withSelect ? <th>{t("action")}</th> : null}
                {withSelectMultiple ? <th>{t("select")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {coachSearch.data?.map((res) => (
                <CoachRow
                  key={res.id}
                  item={res}
                  onHover={(id) => setHoveredId(id)}
                />
              ))}
            </tbody>
          </table>
          {withSelectMultiple && selectedCoachs.size > 0 ? (
            <div className="mt-2 flex justify-end">
              <button
                className="btn-primary btn-sm btn"
                type="button"
                onClick={() => onSelectMultiple(Array.from(selectedCoachs))}
              >
                {t("select")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div className="min-h-[30vh]">
        <div className="h-[30vh] border border-primary" ref={mapContainerRef}>
          <Map
            initialViewState={{ zoom: 9 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/streets-v9"
            mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            attributionControl={false}
            longitude={myAddress.lng}
            latitude={myAddress.lat}
          >
            <Source type="geojson" data={circle}>
              <Layer
                type="fill"
                paint={{
                  "fill-color": hslToHex(theme, "--p"),
                  "fill-opacity": 0.2,
                }}
              />
              <Layer
                type="line"
                paint={{
                  "line-color": hslToHex(theme, "--p"),
                  "line-opacity": 1,
                  "line-width": 2,
                }}
              />
            </Source>
            {coachSearch.data?.map((res) => (
              <Marker
                key={res.id}
                latitude={res.latitude ?? LATITUDE}
                longitude={res.longitude ?? LONGITUDE}
                anchor="bottom"
              >
                <i
                  className={`bx bxs-map bx-md ${
                    res.id === hoveredId ? "text-secondary" : "text-primary"
                  }`}
                />
              </Marker>
            ))}
          </Map>
        </div>
      </div>
    </div>
  );
}
export default FindCoach;
