/**
 * The world's dock icons: chunky little objects in the house style (flat colour, thick ink outline) on coloured
 * discs, instead of thin line icons, so the bar reads like a game's and each button is told apart by colour and
 * shape at a glance.
 */
import type { ReactNode } from "react";
import type { Panel } from "@/components/game/Investigation";

const INK = "#141829";

function Disc({ bg, children }: { bg: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" className="size-full" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill={bg} stroke={INK} strokeWidth="3" />
      <ellipse cx="17" cy="12" rx="8" ry="4" fill="#FFFFFF" opacity="0.25" />
      {children}
    </svg>
  );
}

/** A manila case folder with papers sticking out. */
const evidence = (
  <Disc bg="#3E7FD9">
    <path d="M12 17h9l2.5 3H36v15H12Z" fill="#E9B44C" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
    <rect x="15" y="13" width="17" height="14" rx="1.5" fill="#FFF8E8" stroke={INK} strokeWidth="2" transform="rotate(-6 23 20)" />
    <path d="M18 17.5h10M18 21h8" stroke={INK} strokeWidth="1.6" strokeLinecap="round" transform="rotate(-6 23 20)" />
    <path d="M11 22h26l-2 13H13Z" fill="#F4C85E" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
    <rect x="20" y="26" width="8" height="3.5" rx="1" fill="#C0392B" stroke={INK} strokeWidth="1.4" />
  </Disc>
);

/** A corkboard with two pinned notes tied by red string. */
const board = (
  <Disc bg="#2E9C8F">
    <rect x="10" y="12" width="28" height="23" rx="2.5" fill="#C98E5A" stroke={INK} strokeWidth="2.4" />
    <rect x="13" y="15" width="22" height="17" rx="1" fill="#D9A06A" />
    <rect x="14" y="17" width="8" height="7" fill="#FFF8E8" stroke={INK} strokeWidth="1.4" transform="rotate(-5 18 20)" />
    <rect x="26" y="22" width="8" height="7" fill="#9FD6CF" stroke={INK} strokeWidth="1.4" transform="rotate(6 30 25)" />
    <path d="M18 18.5 30 23.5" stroke="#D62F3A" strokeWidth="2" strokeLinecap="round" />
    <circle cx="18" cy="18.5" r="2" fill="#D62F3A" stroke={INK} strokeWidth="1.2" />
    <circle cx="30" cy="23.5" r="2" fill="#F2B33D" stroke={INK} strokeWidth="1.2" />
    <path d="M18 35v3M30 35v3" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
  </Disc>
);

/** A magnifying glass over a fingerprint: the case's answer. */
const solve = (
  <Disc bg="#E8574A">
    <g fill="none" stroke="#FFF8E8" strokeWidth="1.5" strokeLinecap="round" opacity="0.9">
      <path d="M14 29c0-6 3-10 8-10s8 4 8 10" />
      <path d="M17 30c0-4 2-7 5-7s5 3 5 7" />
      <path d="M20 31c0-2 1-4 2-4s2 2 2 4" />
    </g>
    <circle cx="25" cy="21" r="8.5" fill="#BFE7FF" fillOpacity="0.55" stroke={INK} strokeWidth="2.6" />
    <circle cx="25" cy="21" r="8.5" fill="none" stroke="#FFF8E8" strokeWidth="1" opacity="0.6" />
    <path d="M31.5 27.5 37 33" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    <path d="M31.5 27.5 37 33" stroke="#7A4B2E" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M21 17.5a5 5 0 0 1 4-2" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </Disc>
);

/** A detective's star badge: the team. */
const team = (
  <Disc bg="#8E74E8">
    <path
      d="M24 10.5 27.6 18l8.2 1.1-6 5.7 1.5 8.1L24 29l-7.3 3.9 1.5-8.1-6-5.7 8.2-1.1Z"
      fill="#F2B33D"
      stroke={INK}
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
    <circle cx="24" cy="22" r="4" fill="#FFF8E8" stroke={INK} strokeWidth="1.8" />
    <path d="M14 34.5c3-2 6-2.5 10-2.5s7 .5 10 2.5" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
  </Disc>
);

/** A notebook with a pencil. */
const notes = (
  <Disc bg="#F2B33D">
    <rect x="13" y="11" width="19" height="25" rx="2" fill="#FFF8E8" stroke={INK} strokeWidth="2.4" />
    <path d="M13 15h-2M13 20h-2M13 25h-2M13 30h-2" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M17 17h11M17 21h11M17 25h7" stroke="#8A93B5" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M27 33 36 20l3 2-9 13-4 1Z" fill="#E8574A" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <path d="M27 33l-1 3 3-1.2" fill="#3A2E28" />
  </Disc>
);

export const DOCK_ICONS: Record<Panel, ReactNode> = { evidence, board, solve, team, notes };
