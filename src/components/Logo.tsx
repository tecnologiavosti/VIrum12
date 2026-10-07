interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = "h-9 w-auto", showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/virum-logo.svg"
        alt="VIRUM"
        className={`${className} dark:invert`}
        draggable={false}
      />
      {showText && (
        <span className="font-serif text-xl font-semibold tracking-[0.32em] text-foreground -ml-1">
          IRUM
        </span>
      )}
    </div>
  );
}
