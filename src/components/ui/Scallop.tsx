/**
 * Scalloped edge between two sections: a row of `top`-coloured half-circles
 * hanging into the `bottom` colour.
 */
export function Scallop({ top, bottom }: { top: string; bottom: string }) {
  return (
    <div
      aria-hidden
      className="h-7 w-full"
      style={{
        backgroundColor: bottom,
        backgroundImage: `radial-gradient(circle at 50% 0, ${top} 14px, transparent 15px)`,
        backgroundSize: "34px 28px",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}
