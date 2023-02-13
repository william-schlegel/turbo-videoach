import { useTranslation } from "next-i18next";
import { format } from "date-fns";

export default function Footer() {
  const { t } = useTranslation("common");
  return (
    <footer className="footer mt-auto gap-4 bg-neutral p-10 text-neutral-content">
      <div className="flex items-center gap-4">
        <i className="bx bxl-slack-old text-[60px]" />
        <p>
          Videoach
          <br />
          {t("tag-line")}
          <br />
          &copy; {format(new Date(Date.now()), "yyyy")}
        </p>
      </div>
      <div>
        <span className="footer-title">{t("social")}</span>
        <div className="grid grid-flow-col gap-4">
          <a>
            <i className="bx bxl-twitter bx-sm" />
          </a>
          <a>
            <i className="bx bxl-youtube bx-sm" />
          </a>
          <a>
            <i className="bx bxl-facebook bx-sm" />
          </a>
        </div>
      </div>
    </footer>
  );
}
