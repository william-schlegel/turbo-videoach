type SpinnerProps = {
  size?: number;
};

const Spinner = ({ size = 24 }: SpinnerProps) => {
  return (
    <div className="grid h-full w-full place-items-center">
      <i
        className={`bx bx-loader text-[${size}px] animate-spin text-secondary`}
      />
    </div>
  );
};

export default Spinner;
