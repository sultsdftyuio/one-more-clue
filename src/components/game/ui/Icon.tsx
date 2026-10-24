import { cx } from "@/lib/cx";

/** Line icons drawn on a 24px grid, stroked in the current text colour. */
const PATHS = {
  search: "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.3-2.2L21 21",
  pin: "M9 3h6l-1 6 4 4H6l4-4-1-6Zm3 10v8",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z",
  check: "m5 12.5 4.5 4.5L19 7",
  x: "M6 6l12 12M18 6 6 18",
  chat: "M4 5h16v11H9l-5 4V5Z",
  file: "M6 3h8l4 4v14H6V3Zm8 0v4h4M9 12h6M9 16h6",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  scale: "M12 3v18M7 21h10M4 7h16M4 7l-3 7a3.5 3.5 0 0 0 6 0L4 7Zm16 0-3 7a3.5 3.5 0 0 0 6 0l-3-7Z",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm-6-3a6 6 0 0 0 12 0M12 18v3",
  micOff: "M15 9.3V6a3 3 0 0 0-5.7-1.3M9 9v3a3 3 0 0 0 5.1 2.1M6 12a6 6 0 0 0 9.9 4.6M18 12c0 .8-.1 1.5-.4 2.2M12 18v3M3 3l18 18",
  headset: "M4 16v-4a8 8 0 0 1 16 0v4M4 16a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2v2Zm16 0a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2v2Z",
  speaker: "M4 9h4l5-4v14l-5-4H4V9Zm13 0a4 4 0 0 1 0 6m2.5-8.5a8 8 0 0 1 0 11",
  speakerOff: "M4 9h4l5-4v14l-5-4H4V9Zm13 1 5 5m0-5-5 5",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  skip: "M5 5l8 7-8 7V5Zm10 0v14",
  camera: "M3 8h4l2-3h6l2 3h4v12H3V8Zm9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  lock: "M6 11h12v10H6V11Zm2 0V8a4 4 0 0 1 8 0v3",
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  desk: "M3 8h18v11H3V8Zm6 0V5h6v3M3 13h18",
  board: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  door: "M6 21V3h12v18M3 21h18M14 12h.01",
  note: "M5 3h14v18H5V3Zm4 5h6M9 12h6M9 16h3",
  share: "M12 3v12M7 8l5-5 5 5M5 14v7h14v-7",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 6l-6 6 6 6",
  robot: "M5 9h14v10H5V9Zm7-5v5M9 14h.01M15 14h.01M9 17h6",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className, filled }: { name: IconName; className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cx("inline-block size-5 shrink-0", className)}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
