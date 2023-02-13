type Props = {
  text: string | string[];
  offset: number | string;
  bgColor: "primary" | "secondary" | "accent" | string;
  textColor?: string;
};

function Ribbon({ text, offset, bgColor, textColor = "text-neutral" }: Props) {
  const folder = "1rem";
  const ribbonShape = "1rem";
  const topOffset = typeof offset === "number" ? `${offset}px` : offset;

  let bgClass = "";
  let txtClass = "";
  let bgStyle = "";
  let txtStyle = "";
  switch (bgColor) {
    case "primary":
      bgClass = "bg-primary";
      txtClass = "text-primary-content";
      break;
    case "secondary":
      bgClass = "bg-secondary";
      txtClass = "text-secondary-content";
      break;
    case "accent":
      bgClass = "bg-accent";
      txtClass = "text-accent-content";
      break;
    default:
      bgStyle = bgColor;
      txtStyle = textColor;
  }

  const style = {
    inset: `${topOffset} calc(-1*${folder}) auto auto`,
    padding: `0.25rem 0.5rem calc(0.25rem + ${folder}) calc(0.5rem + ${ribbonShape})`,
    clipPath: `polygon(0 0,100% 0,100% calc(100% - ${folder}),calc(100% - ${folder}) 100%,
        calc(100% - ${folder}) calc(100% - ${folder}),0 calc(100% - ${folder}),
        ${ribbonShape} calc(50% - ${folder}/2))`,
    backgroundColor: bgStyle,
    textColor: txtStyle,
    boxShadow: `0 calc(-1*${folder}) 0 inset #0005`,
  };

  return (
    <div
      className={`${bgClass} ${txtClass}`}
      style={{ position: "absolute", ...style }}
    >
      {Array.isArray(text) ? text.map((p, i) => <p key={i}>{p}</p>) : text}
    </div>
  );
}
export default Ribbon;
