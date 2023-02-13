import useDebounce from "@lib/useDebounce";
import { type DefaultTFuncReturn } from "i18next";
import { useTranslation } from "next-i18next";
import { useEffect, useState } from "react";

type Props = {
  label?: DefaultTFuncReturn;
  defaultAddress?: string;
  onSearch: (adr: AddressData) => void;
  required?: boolean;
  iconSearch?: boolean;
  error?: DefaultTFuncReturn;
  className?: string;
};

export type AddressData = {
  lat: number;
  lng: number;
  address: string;
};

const AddressSearch = ({
  defaultAddress,
  label,
  onSearch,
  required,
  iconSearch = true,
  error,
  className,
}: Props) => {
  const [address, setAddress] = useState("");
  const debouncedAddress = useDebounce<string>(address, 500);
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const { t } = useTranslation("common");

  useEffect(() => {
    if (defaultAddress) setAddress(defaultAddress);
  }, [defaultAddress]);

  useEffect(() => {
    if (debouncedAddress) {
      searchAddresses(debouncedAddress).then((found) => setAddresses(found));
    } else setAddresses([]);
  }, [debouncedAddress]);

  function handleSelect(value: string) {
    setAddress(value);
  }

  function handleClickIcon() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const address = t("your-location");
      setAddress(address);
      setAddresses([]);
      onSearch({
        address,
        lng: position.coords.longitude,
        lat: position.coords.latitude,
      });
    });
  }

  return (
    <>
      {label ? (
        <label className={`label ${required ? "required" : ""}`}>{label}</label>
      ) : null}
      <div className={`dropdown-bottom dropdown ${className ?? ""}`}>
        <div className="input-group">
          {iconSearch ? (
            <span>
              <i
                className="bx bx-map-pin bx-md cursor-pointer text-primary hover:text-secondary"
                onClick={handleClickIcon}
              />
            </span>
          ) : null}
          <input
            className="input-bordered input w-full"
            value={address}
            onChange={(e) => handleSelect(e.currentTarget.value)}
            list="addresses"
            placeholder={t("location") ?? ""}
            required={required}
          />
        </div>
        {error ? <p className="label-text-alt text-error">{error}</p> : null}
        {addresses.length > 0 ? (
          <ul className="dropdown-content menu rounded-box w-full bg-base-100 p-2 shadow">
            {addresses.map((adr, idx) => (
              <li key={`ADR-${idx}`}>
                <button
                  type="button"
                  onClick={() => {
                    setAddress(adr.address);
                    onSearch(adr);
                    setAddresses([]);
                  }}
                >
                  {adr.address}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
};

export default AddressSearch;

async function searchAddresses(address: string): Promise<AddressData[]> {
  const url = new URL("http://www.mapquestapi.com/geocoding/v1/address");
  url.searchParams.append("key", process.env.NEXT_PUBLIC_MAPQUEST_KEY ?? "");
  url.searchParams.append("location", address);
  const res = await fetch(url.href);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data = await res.json();
  const chunks: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const locations =
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    data.results?.[0]?.locations?.map(
      (location: {
        street: string;
        postalCode: string;
        adminArea5: string;
        latLng: { lat: number; lng: number };
      }) => {
        if (location.street) chunks.push(location.street);
        if (location.postalCode) chunks.push(location.postalCode);
        if (location.adminArea5) chunks.push(location.adminArea5);
        return {
          lat: location.latLng.lat,
          lng: location.latLng.lng,
          address: chunks.reduce(
            (prev, chunk) => (prev ? `${prev}, ${chunk}` : chunk),
            "",
          ),
        };
      },
    ) ?? [];
  return locations as AddressData[];
}
