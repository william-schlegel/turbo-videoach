type Props = { note: number; className?: string };

function Rating({ note, className }: Props) {
  return (
    <div className={`flex h-6 ${className ?? ""}`}>
      {Array.from({ length: 5 }, (v, k) => k).map((i) => (
        <Star
          key={`STAR-${i}`}
          cover={i + 1 < note ? 100 : Math.round((note - i) * 100)}
        />
      ))}
      <div className="ml-2">({note.toFixed(1)})</div>
    </div>
  );
}

export default Rating;

function Star({ cover }: { cover: number }) {
  return (
    <div className="mask mask-star aspect-square h-full bg-base-300">
      <div
        className={`h-full bg-accent`}
        style={{ width: `${cover < 0 ? 0 : cover}%` }}
      ></div>
    </div>
  );
}
