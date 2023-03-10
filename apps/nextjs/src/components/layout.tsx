import useLocalStorage from "@lib/useLocalstorage";
import Head from "next/head";
import { useEffect, useRef, type ReactNode } from "react";
import Footer from "./footer";
import Navbar from "./navbar";
import { type TThemes } from "./themeSelector";

type Props = {
  children: ReactNode;
  title?: string | null;
  className?: string;
};

export default function Layout({ children, className, title }: Props) {
  const [theme, setTheme] = useLocalStorage<TThemes>("theme", "cupcake");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    wrapperRef.current?.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <>
      <Head>
        <title>Videoach{typeof title === "string" ? ` - ${title}` : ""}</title>
        <meta name="description" content="Management de clubs de sport" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div
        ref={wrapperRef}
        className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-base-200"
        data-theme={theme}
      >
        <Navbar
          theme={theme}
          onChangeTheme={(newTheme) => setTheme(newTheme)}
        />
        <main className={`bg-base-200 pb-4 lg:mt-16 ${className ?? ""}`}>
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
