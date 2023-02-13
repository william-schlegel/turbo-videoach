const DEFAULT_COLOR = "lightblue";

/**
 * Convert a daisyui css var (--p, --s) from hsl value to rgb
 * @param theme daisyui theme
 * @param cssVar css var to convert
 * @returns value as a color #RRGGBB
 */
export default function hslToHex(theme: string, cssVar: string) {
  if (typeof window === "undefined") return DEFAULT_COLOR;
  if (typeof document === "undefined") return DEFAULT_COLOR;
  const element = document.querySelector(`[data-theme=${theme}]`);
  if (!element) return DEFAULT_COLOR;
  const values = getComputedStyle(element).getPropertyValue(cssVar).split(" ");
  const h = Number(values[1]);
  const s = Number(values[2]?.slice(0, -1));
  let l = Number(values[3]?.slice(0, -1));
  if (isNaN(h) || isNaN(s) || isNaN(l)) return DEFAULT_COLOR;
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0"); // convert to Hex and prefix "0" if needed
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
