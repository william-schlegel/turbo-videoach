import useLocalStorage from "@lib/useLocalstorage";
import { useTranslation } from "next-i18next";
import { useEffect } from "react";

export const Themes = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
] as const;
export type TThemes = typeof Themes[number];

type Props = {
  onSelect: (t: TThemes) => void;
  onSave?: (t: TThemes) => void;
};

const ThemeSelector = ({ onSelect, onSave }: Props) => {
  const [theme, setTheme] = useLocalStorage<TThemes>("pageTheme", "cupcake");
  const { t } = useTranslation("pages");

  useEffect(() => {
    onSelect(theme);
  }, [theme, onSelect]);

  return (
    <div className="flex items-center gap-2">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as TThemes)}
        className="w-fit"
      >
        {Themes.map((theme) => (
          <option key={theme} value={theme}>
            {theme}
          </option>
        ))}
      </select>
      {onSave ? (
        <button className="btn-primary btn" onClick={() => onSave(theme)}>
          {t("save-style")}
        </button>
      ) : null}
    </div>
  );
};

export default ThemeSelector;
