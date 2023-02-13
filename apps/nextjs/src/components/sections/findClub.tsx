import { LATITUDE, LONGITUDE } from "@lib/defaultValues";
import hslToHex from "@lib/hslToHex";
import { useHover } from "@lib/useHover";
import useLocalStorage from "@lib/useLocalstorage";
import { api } from "@trpcclient/api";
import turfCircle from "@turf/circle";
import AddressSearch, { type AddressData } from "@ui/addressSearch";
import ButtonIcon from "@ui/buttonIcon";
import { useTranslation } from "next-i18next";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Marker, Source, useMap } from "react-map-gl";
import { type TThemes } from "../themeSelector";

type FindClubProps = {
  address?: string;
};

function FindClub({ address = "" }: FindClubProps) {
  const { t } = useTranslation("home");
  const [myAddress, setMyAddress] = useState<AddressData>({
    address,
    lat: LATITUDE,
    lng: LONGITUDE,
  });
  const [range, setRange] = useState(25);
  const [hoveredId, setHoveredId] = useState("");
  const clubSearch = api.sites.getSitesFromDistance.useQuery(
    {
      locationLat: myAddress.lat,
      locationLng: myAddress.lng,
      range,
    },
    { enabled: false },
  );
  const [theme] = useLocalStorage<TThemes>("theme", "cupcake");
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const map = useMap();
  const handleSearch = () => clubSearch.refetch();
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

  type TSiteItem = typeof clubSearch.data extends (infer U)[] | undefined
    ? U
    : never;

  function getGroups(site: TSiteItem) {
    const grps = site.club.activities.map((a) => a.group.name).flat();
    const set = new Set(grps);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }
  const circle = useMemo(() => {
    const center = [myAddress.lng ?? LONGITUDE, myAddress.lat ?? LATITUDE];
    const c = turfCircle(center, range ?? 10, {
      steps: 64,
      units: "kilometers",
      properties: {},
    });
    return c;
  }, [myAddress.lat, myAddress.lng, range]);

  function ClubRow({
    item,
    onHover,
  }: {
    item: TSiteItem;
    onHover: (id: string) => void;
  }) {
    const ref = useRef<HTMLTableRowElement | null>(null);
    const isHovered = useHover(ref);

    useEffect(() => {
      if (isHovered) onHover(item.id);
    }, [isHovered, onHover, item]);

    return (
      <tr ref={ref} className="hover">
        <td>
          <div className="flex flex-wrap items-center gap-2">
            <span>{item.club.name}</span>
            <span className="badge-primary badge">{item.name}</span>
          </div>
        </td>
        <td>{item.distance.toFixed(0)}&nbsp;km</td>
        <td>
          <div className="flex flex-wrap gap-1">
            {getGroups(item).map((g) => (
              <span key={g} className="pill pill-xs">
                {g}
              </span>
            ))}
          </div>
        </td>
        <td>
          {item.club.pages.find((p) => p.target === "HOME")?.published ? (
            <Link
              href={`/presentation-page/club/${item.clubId}/${
                item.club.pages.find((p) => p.target === "HOME")?.id ?? ""
              }`}
              target="_blank"
              rel="noreferrer"
            >
              <ButtonIcon
                title={t("page-club", { name: item.club.name })}
                iconComponent={<i className="bx bx-link-external bx-xs" />}
                buttonSize="sm"
                buttonVariant="Icon-Outlined-Primary"
              />
            </Link>
          ) : (
            <span></span>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
          {t("search-club")}
          <i className="bx bx-search bx-xs" />
        </button>
        <div className="mt-8 max-h-[40vh]">
          <table className="table-zebra table border border-base-300">
            <thead>
              <tr>
                <th>{t("club")}</th>
                <th>{t("distance")}</th>
                <th>{t("activities")}</th>
                <th>{t("page")}</th>
              </tr>
            </thead>
            <tbody>
              {clubSearch.data?.map((res) => (
                <ClubRow
                  key={res.id}
                  item={res}
                  onHover={(id) => setHoveredId(id)}
                />
              ))}
            </tbody>
          </table>
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
            onRender={(event) => event.target.resize()}
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
            {clubSearch.data?.map((res) => (
              <Marker
                key={res.id}
                latitude={res.latitude}
                longitude={res.longitude}
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
export default FindClub;
