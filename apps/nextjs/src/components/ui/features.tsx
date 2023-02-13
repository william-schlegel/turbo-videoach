import { type ReactNode } from "react";

type FeatureProps = {
  title: string;
  description: string;
  children: ReactNode;
};

type FeatureContainerProps = {
  children: ReactNode;
};

export function FeatureContainer({ children }: FeatureContainerProps) {
  return (
    <div className="flex flex-wrap items-stretch justify-center py-12">
      {children}
    </div>
  );
}

export function Feature({ title, description, children }: FeatureProps) {
  return (
    <div className="w-full p-4 lg:w-1/2 xl:w-1/4">
      <div className={`card h-full bg-base-200 shadow-xl`}>
        <figure className="px-10 pt-10">{children}</figure>
        <div className="card-body items-center text-center">
          <h2 className="card-title text-3xl font-bold">{title}</h2>
          {description.split("\n").map((desc, id) => (
            <p key={`p-${id}`}>{desc}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
