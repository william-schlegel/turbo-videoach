import { useState, type ReactNode } from "react";

type Props = {
  groupName: string;
  children: ReactNode;
  className?: string;
};

function CollapsableGroup({ groupName, children, className }: Props) {
  const [opened, setOpened] = useState(false);
  return (
    <button
      onClick={() => setOpened((p) => !p)}
      className={`pill ${className ?? ""}`}
      type="button"
    >
      <span className="text-primary">{groupName}</span>
      <div className="flex flex-wrap items-center gap-2 transition-transform duration-200">
        {opened ? <>{children}</> : null}
        <i
          className={`bx bx-chevron-right bx-sm ${
            opened ? "rotate-180" : "rotate-0"
          }`}
        />
      </div>
    </button>
  );
}

export default CollapsableGroup;
