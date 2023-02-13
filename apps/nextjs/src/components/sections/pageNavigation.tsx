/* eslint-disable @next/next/no-img-element */
import type { PageSectionModel, PageTarget } from "@prisma/client";
import Link from "next/link";

type PageProps = {
  id: string;
  target: PageTarget;
  name: string;
  sections: {
    id: string;
    model: PageSectionModel;
    title: string | null;
  }[];
};

type Props = {
  clubId: string;
  logoUrl: string | undefined;
  pages: PageProps[];
};

const PageNavigation = ({ clubId, logoUrl, pages }: Props) => {
  const homePageId = pages.find((p) => p.target === "HOME")?.id ?? "";

  return (
    <nav className="navbar fixed bg-base-100/50">
      <div className="navbar-start">
        <div className="dropdown">
          <label tabIndex={0} className="btn btn-ghost lg:hidden">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content menu rounded-box menu-compact mt-3 w-52 bg-base-100 p-2 shadow"
          >
            <PageMenu menus={pages} clubId={clubId} />
          </ul>
        </div>
        <Link
          className="max-h-full"
          href={`/presentation-page/club/${clubId}/${homePageId}`}
        >
          <img className="h-12" src={logoUrl} alt="" />
        </Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal space-x-4">
          <PageMenu menus={pages} clubId={clubId} />
        </ul>
      </div>
      <div className="navbar-end"></div>
    </nav>
  );
};

export default PageNavigation;

function PageMenu({ menus, clubId }: { menus: PageProps[]; clubId: string }) {
  return (
    <>
      {menus.map((menu) => {
        if (menu.target === "HOME") {
          return (
            <>
              {menu.sections
                .filter((s) => s.title)
                .map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/presentation-page/club/${clubId}/${menu.id}#${s.model}`}
                    >
                      {s.title}
                    </Link>
                  </li>
                ))}
            </>
          );
        }
        return (
          <li key={menu.id}>
            <Link href={`/presentation-page/club/${clubId}/${menu.id}`}>
              {menu.name}
            </Link>
          </li>
        );
      })}
    </>
  );
}
