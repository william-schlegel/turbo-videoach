import React from "react";

type Props = {
  count: number;
  actualPage: number;
  onPageClick: (page: number) => void;
  perPage: number;
};

function Pagination({ count, actualPage, onPageClick, perPage }: Props) {
  const nbPage = Math.ceil(count / perPage);
  if (nbPage < 2) return null;
  return (
    <div className="btn-group">
      {Array.from({ length: nbPage }, (_, k) => k).map((pg) => (
        <button
          key={`page-${pg}`}
          className={`btn btn-sm ${pg === actualPage ? "btn-active" : ""}`}
          onClick={() => onPageClick(pg)}
        >
          {pg}
        </button>
      ))}
    </div>
  );
}

export default Pagination;
