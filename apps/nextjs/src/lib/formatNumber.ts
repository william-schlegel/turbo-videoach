/**
 * format a number to display a price
 * @param value value to format
 * @param lang locale (default fr)
 * @returns number formated to currency format (EUR)
 */
export function formatMoney(value?: number | null, lang?: string) {
  const f = new Intl.NumberFormat(lang ?? "fr-fr", {
    currency: "EUR",
    style: "currency",
  });
  return f.format(value ?? 0);
}

/**
 * convert a file size to a readable value (in bytes/Mb, Gb...)
 * @param value value to format
 * @param lang locale (default fr)
 * @returns formated value as storage unit
 */
export function formatSize(value?: number | null, lang?: string) {
  const f = new Intl.NumberFormat(lang ?? "fr-fr", {
    notation: "compact",
    compactDisplay: "short",
    style: "unit",
    unit: "byte",
    unitDisplay: "narrow",
  });
  return f.format(value ?? 0);
}
