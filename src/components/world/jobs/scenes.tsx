"use client";

/**
 * The rooms the side jobs happen in, drawn behind each game the way the mockups set them: Lab 4 at night, the lobby,
 * the dark maker space, the corridor's fuse cupboard, the staff kitchen, the workbench and (for Ozzy's phone game) a
 * floodlit pitch. Flat shapes and the house's ink, scaled to cover any
 * screen. Plus a few shared bits of juice: rain on a window, floating motes and a burst of sparks.
 */
import type { CSSProperties, ReactNode } from "react";

const INK = "#141829";

function Cover({ children, bg }: { children: ReactNode; bg: string }) {
  // A wide room (1000 x 700): a laptop sees all of it, a phone the middle 400 or so, where the important things stand.
  return (
    <svg viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true" style={{ background: bg }}>
      {children}
    </svg>
  );
}

/** Rain running down a window pane (the window's box, in the scene's units). */
function Rain({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <clipPath id={`rain-${x}-${y}`}>
        <rect x={x} y={y} width={w} height={h} />
      </clipPath>
      <g clipPath={`url(#rain-${x}-${y})`} className="world-rain-fall" stroke="#9FB2E0" strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
        {Array.from({ length: 18 }, (_, i) => (
          <line key={i} x1={x + ((i * 37) % w)} y1={y + ((i * 53) % h) - 40} x2={x + ((i * 37) % w) - 4} y2={y + ((i * 53) % h) - 12} />
        ))}
      </g>
    </g>
  );
}

function Window({ x, y, w, h, moon = false }: { x: number; y: number; w: number; h: number; moon?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="5" fill="#C9CDD6" stroke={INK} strokeWidth="5" />
      <rect x={x + 9} y={y + 9} width={w - 18} height={h - 18} fill="#0B1024" />
      {moon && <circle cx={x + w * 0.7} cy={y + h * 0.28} r="14" fill="#F4EEE4" opacity="0.9" />}
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} x={x + 30 + ((i * 47) % (w - 60))} y={y + h - 40 - ((i * 23) % 40)} width="4" height="4" fill="#F2C86B" opacity="0.8" />
      ))}
      <Rain x={x + 9} y={y + 9} w={w - 18} h={h - 18} />
      <rect x={x + w / 2 - 3} y={y + 9} width="6" height={h - 18} fill="#C9CDD6" />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={x + 9} y={y + 9 + i * 10} width={w - 18} height="6" fill="#D9DCE4" opacity="0.85" />
      ))}
    </g>
  );
}

/** Lab 4 at night: the HALO cabinet, rainy windows, the clock, the poster and the long bench. */
export function LabScene({ calm = 0 }: { calm?: number }) {
  return (
    <>
      <Cover bg="#2B3556">
        <rect x="0" y="0" width="1000" height="520" fill="#33406A" />
        <rect x="0" y="0" width="1000" height="60" fill="#C9CDD6" />
        {[200, 500, 800].map((x) => (
          <rect key={x} x={x - 70} y="18" width="140" height="22" rx="4" fill="#FFFDF2" />
        ))}
        <rect x="0" y="516" width="1000" height="184" fill="#202842" />
        <rect x="0" y="512" width="1000" height="8" fill={INK} opacity="0.5" />
        {/* the HALO cabinet */}
        <rect x="90" y="180" width="130" height="330" rx="7" fill="#4A5578" stroke={INK} strokeWidth="5" />
        <rect x="104" y="204" width="102" height="96" rx="5" fill="#1F2742" stroke={INK} strokeWidth="4" />
        <circle cx="138" cy="252" r="16" fill="none" stroke="#8FB0D8" strokeWidth="5" />
        <circle cx="172" cy="252" r="16" fill="none" stroke="#8FB0D8" strokeWidth="5" />
        <rect x="104" y="320" width="102" height="70" rx="5" fill="#2A3355" stroke={INK} strokeWidth="4" />
        <path d="M114 356 q10 -20 20 0 t20 0 t20 0 t20 0" fill="none" stroke="#5FD38A" strokeWidth="4" />
        <text x="155" y="196" textAnchor="middle" fontSize="16" fontWeight="900" fill="#F4EEE4">B</text>
        {/* windows, clock, poster, whiteboard */}
        <Window x={400} y={140} w={200} h={210} moon />
        <circle cx="690" cy="190" r="38" fill="#F4EEE4" stroke={INK} strokeWidth="5" />
        <line x1="690" y1="190" x2="690" y2="164" stroke={INK} strokeWidth="5" strokeLinecap="round" />
        <line x1="690" y1="190" x2="708" y2="202" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        <rect x="260" y="200" width="90" height="116" fill="#F4EEE4" stroke={INK} strokeWidth="4" transform="rotate(-3 305 258)" />
        <text x="305" y="248" textAnchor="middle" fontSize="20" fontWeight="900" fill={INK} transform="rotate(-3 305 258)">HALO</text>
        <circle cx="290" cy="282" r="12" fill="none" stroke={INK} strokeWidth="4" transform="rotate(-3 305 258)" />
        <circle cx="320" cy="282" r="12" fill="none" stroke={INK} strokeWidth="4" transform="rotate(-3 305 258)" />
        <rect x="770" y="160" width="170" height="130" fill="#F4F2EC" stroke={INK} strokeWidth="5" />
        <path d="M790 250 q30 -70 60 -30 t60 -40" fill="none" stroke="#E8574A" strokeWidth="4" />
        <path d="M790 190h50M790 210h40" stroke="#3E7FD9" strokeWidth="4" />
        {/* the bench */}
        <rect x="240" y="440" width="760" height="26" fill="#4A4F66" stroke={INK} strokeWidth="5" />
        <rect x="270" y="466" width="12" height="50" fill={INK} />
        <rect x="960" y="466" width="12" height="50" fill={INK} />
        <rect x="760" y="400" width="80" height="40" rx="4" fill="#3B6FD9" stroke={INK} strokeWidth="4" />
        <rect x="780" y="384" width="12" height="18" rx="3" fill="#E8574A" stroke={INK} strokeWidth="3" />
      </Cover>
      {/* The room calms as she does: a warm wash that grows with each good breath. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_55%_45%,rgba(255,206,140,0.38),transparent_65%)] transition-opacity duration-1000" style={{ opacity: calm }} />
      <Motes />
    </>
  );
}

/** The lobby: warm wall and wood floor, the building's name, the noticeboard, the way out and the security desk. */
export function LobbyScene() {
  return (
    <Cover bg="#B9AA90">
      <rect x="0" y="0" width="1000" height="520" fill="#C2B194" />
      <rect x="0" y="330" width="1000" height="190" fill="#AE9C7E" />
      <rect x="0" y="0" width="1000" height="56" fill="#E4DCCB" />
      {[180, 500, 820].map((x) => (
        <g key={x}>
          <rect x={x - 60} y="52" width="120" height="14" rx="4" fill="#FFFDF2" />
          <path d={`M${x - 120} 66 L${x + 120} 66 L${x + 220} 330 L${x - 220} 330 Z`} fill="#FFF6DC" opacity="0.18" />
        </g>
      ))}
      <rect x="0" y="520" width="1000" height="180" fill="#7A5A3E" />
      {Array.from({ length: 22 }, (_, i) => (
        <rect key={i} x={i * 46} y="520" width="2" height="180" fill="#5E432C" opacity="0.6" />
      ))}
      <rect x="0" y="516" width="1000" height="8" fill={INK} opacity="0.35" />
      <text x="500" y="146" textAnchor="middle" fontSize="44" fontWeight="900" fill="#5A4636" opacity="0.75" letterSpacing="8">HALDEN</text>
      <text x="500" y="180" textAnchor="middle" fontSize="22" fontWeight="900" fill="#5A4636" opacity="0.7" letterSpacing="9">INNOVATION</text>
      <rect x="250" y="210" width="150" height="110" fill="#B88A5A" stroke={INK} strokeWidth="4" />
      <rect x="264" y="224" width="46" height="56" fill="#F2EFE6" stroke={INK} strokeWidth="2.5" transform="rotate(-4 287 252)" />
      <rect x="320" y="232" width="60" height="40" fill="#F6D36B" stroke={INK} strokeWidth="2.5" transform="rotate(5 350 252)" />
      <rect x="40" y="200" width="140" height="316" fill="#6A4A30" stroke={INK} strokeWidth="5" />
      <rect x="58" y="218" width="104" height="282" fill="#2A3355" />
      <rect x="60" y="150" width="100" height="36" rx="4" fill="#1E7A4E" stroke={INK} strokeWidth="3" />
      <text x="110" y="175" textAnchor="middle" fontSize="20" fontWeight="900" fill="#E8FFF2">EXIT</text>
      <rect x="660" y="400" width="300" height="120" fill="#5A3A26" stroke={INK} strokeWidth="5" />
      <rect x="690" y="430" width="120" height="30" rx="4" fill="#E9DCC6" stroke={INK} strokeWidth="3" />
      <text x="750" y="452" textAnchor="middle" fontSize="16" fontWeight="900" fill={INK}>RECEPTION</text>
      <rect x="860" y="350" width="70" height="52" rx="4" fill="#1F2742" stroke={INK} strokeWidth="4" />
      <ellipse cx="610" cy="512" rx="34" ry="8" fill={INK} opacity="0.25" />
      <path d="M590 512 l10 -60 h20 l10 60 Z" fill="#C86B3E" stroke={INK} strokeWidth="4" />
      <path d="M610 452 q-30 -50 -10 -80 M610 452 q20 -60 40 -70 M610 452 q-5 -60 5 -90" fill="none" stroke="#4E9A5E" strokeWidth="9" strokeLinecap="round" />
    </Cover>
  );
}

/** The maker space after hours: blue gloom, the pegboard of tools, filament spools, a moonlit window and benches. */
export function MakerScene() {
  return (
    <>
      <Cover bg="#1B2140">
        <rect x="0" y="0" width="1000" height="520" fill="#222A4D" />
        {Array.from({ length: 14 }, (_, r) =>
          Array.from({ length: 17 }, (_, c) => <rect key={`${r}-${c}`} x={c * 60 + (r % 2) * 30 - 20} y={r * 40} width="56" height="36" fill="none" stroke="#2C3560" strokeWidth="2" />),
        )}
        <rect x="0" y="520" width="1000" height="180" fill="#151A33" />
        <rect x="80" y="170" width="200" height="150" fill="#5E4A36" stroke={INK} strokeWidth="4" />
        {Array.from({ length: 17 }, (_, i) =>
          Array.from({ length: 11 }, (_, j) => <circle key={`${i}-${j}`} cx={92 + i * 11} cy={180 + j * 12.5} r="1.6" fill="#3A2C20" />),
        )}
        <rect x="104" y="196" width="8" height="90" fill="#3A3E4A" />
        <circle cx="160" cy="236" r="18" fill="none" stroke="#3A3E4A" strokeWidth="6" />
        <path d="M206 300h34l-9 -76h-16Z" fill="#3A3E4A" />
        <rect x="246" y="200" width="8" height="90" fill="#C9A877" />
        <Window x={420} y={80} w={160} h={130} moon />
        <rect x="720" y="210" width="220" height="10" fill="#4E3E2E" />
        <rect x="720" y="300" width="220" height="10" fill="#4E3E2E" />
        {["#EF5B5B", "#3FB8AF", "#F2B33D", "#9B87F5", "#F4EEE4"].map((c, i) => (
          <g key={c}>
            <circle cx={742 + i * 44} cy="238" r="18" fill={c} stroke={INK} strokeWidth="3" />
            <circle cx={742 + i * 44} cy="238" r="6" fill="#1B1F2A" />
            <circle cx={742 + ((i + 2) % 5) * 44} cy="328" r="18" fill={c} stroke={INK} strokeWidth="3" />
            <circle cx={742 + ((i + 2) % 5) * 44} cy="328" r="6" fill="#1B1F2A" />
          </g>
        ))}
        <rect x="40" y="430" width="300" height="20" fill="#3A3F4E" stroke={INK} strokeWidth="4" />
        <rect x="680" y="430" width="300" height="20" fill="#3A3F4E" stroke={INK} strokeWidth="4" />
        <rect x="760" y="380" width="90" height="50" rx="5" fill="#C9CDD6" stroke={INK} strokeWidth="4" />
        <circle cx="782" cy="405" r="5" fill="#EF6B5C" />
      </Cover>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_25%,rgba(93,123,216,0.28),transparent_60%)]" />
      <Motes />
    </>
  );
}

/** The corridor by the water cooler: lab doors, a noticeboard, the strip lights, and the fuse cupboard's open door. */
export function CupboardScene({ lit = false }: { lit?: boolean }) {
  return (
    <>
      <Cover bg="#B9C0CE">
        <rect x="0" y="0" width="1000" height="270" fill="#B9C0CE" />
        <rect x="0" y="270" width="1000" height="250" fill="#3B4868" />
        <rect x="0" y="264" width="1000" height="8" fill="#3FB8AF" />
        <rect x="0" y="272" width="1000" height="5" fill="#F2B33D" />
        <rect x="0" y="520" width="1000" height="180" fill="#22293F" />
        <rect x="0" y="0" width="1000" height="50" fill="#C9CDD6" />
        {[150, 500, 850].map((x) => (
          <rect key={x} x={x - 80} y="12" width="160" height="26" rx="4" fill={lit ? "#FFFDF2" : "#9EA4B4"} />
        ))}
        {[80, 790].map((x) => (
          <g key={x}>
            <rect x={x} y="190" width="130" height="330" fill="#8A6A4A" stroke={INK} strokeWidth="5" />
            <rect x={x + 20} y="320" width="24" height="110" fill="#151A2E" />
            <rect x={x + 30} y="148" width="70" height="28" fill="#2C3266" />
          </g>
        ))}
        <text x="145" y="169" textAnchor="middle" fontSize="18" fontWeight="900" fill="#F4EEE4">LAB 3</text>
        <text x="855" y="169" textAnchor="middle" fontSize="18" fontWeight="900" fill="#F4EEE4">LAB 5</text>
        <rect x="250" y="160" width="140" height="100" fill="#B88A5A" stroke={INK} strokeWidth="4" />
        <rect x="264" y="174" width="44" height="54" fill="#F2EFE6" stroke={INK} strokeWidth="2" transform="rotate(-4 286 201)" />
        <rect x="318" y="180" width="56" height="40" fill="#9FD6CF" stroke={INK} strokeWidth="2" transform="rotate(5 346 200)" />
        <path d="M300 150 L340 140 L340 600 L300 610 Z" fill="#8D93A3" stroke={INK} strokeWidth="5" />
        <path d="M300 380 L340 374" stroke="#F2B33D" strokeWidth="8" />
        <rect x="660" y="380" width="56" height="140" rx="6" fill="#E4E7EC" stroke={INK} strokeWidth="4" />
        <rect x="666" y="330" width="44" height="56" rx="12" fill="#9CC8F0" stroke={INK} strokeWidth="4" opacity="0.9" />
      </Cover>
      <div className={`absolute inset-0 transition-colors duration-700 ${lit ? "bg-transparent" : "bg-[rgba(8,12,30,0.45)]"}`} />
    </>
  );
}

/** A floodlit pitch at night behind Ozzy's goal: the sky, two floodlight towers and the stands, whose fans jump when you score. */
export function PitchScene({ cheer = 0 }: { cheer?: number }) {
  const colours = ["#E8574A", "#3E7FD9", "#F2B33D", "#F4EEE4", "#8E74E8", "#3FB8AF"];
  return (
    <Cover bg="#0E1430">
      <defs>
        <linearGradient id="pitch-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#080C22" />
          <stop offset="1" stopColor="#253063" />
        </linearGradient>
        <radialGradient id="pitch-lamp">
          <stop offset="0" stopColor="#FFF6D8" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#FFF6D8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#FFF6D8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="700" fill="url(#pitch-sky)" />
      {Array.from({ length: 24 }, (_, i) => (
        <circle key={i} cx={(i * 131) % 1000} cy={20 + ((i * 67) % 150)} r={i % 3 ? 1.5 : 2.4} fill="#F4EEE4" opacity="0.6" />
      ))}
      {/* the stands, tier on tier */}
      <path d="M0 140 L1000 140 L1000 600 L0 600 Z" fill="#161C40" />
      {Array.from({ length: 17 }, (_, r) => (
        <g key={r} className={cheer ? "world-cheer" : "world-crowd"} style={{ animationDelay: `${(r % 4) * (cheer ? 0.06 : 0.4)}s` }}>
          {Array.from({ length: 46 }, (_, c) => (
            <circle key={c} cx={c * 22 + (r % 2) * 11} cy={162 + r * 26} r="8.5" fill={colours[(r * 7 + c * 3) % colours.length]} opacity={0.45 + (r / 17) * 0.45} />
          ))}
        </g>
      ))}
      {Array.from({ length: 17 }, (_, r) => (
        <rect key={r} x="0" y={172 + r * 26} width="1000" height="4" fill="#0C1130" opacity="0.8" />
      ))}
      {/* camera flashes when you score */}
      {cheer > 0 &&
        Array.from({ length: 16 }, (_, i) => (
          <circle key={`${cheer}-${i}`} className="world-flashbulb" cx={(i * 173) % 1000} cy={240 + ((i * 97) % 300)} r="7" fill="#FFFFFF" style={{ animationDelay: `${(i % 8) * 0.12}s` }} />
        ))}
      {/* floodlights */}
      {[170, 830].map((x) => (
        <g key={x}>
          <path d={`M${x} 120 L${x < 500 ? x + 300 : x - 300} 620 L${x < 500 ? x + 80 : x - 80} 620 Z`} fill="#FFF6D8" opacity="0.07" />
          <rect x={x - 6} y="110" width="12" height="500" fill="#0A0E24" />
          <circle cx={x} cy="90" r="80" fill="url(#pitch-lamp)" />
          <rect x={x - 46} y="64" width="92" height="52" rx="5" fill="#2A3157" stroke={INK} strokeWidth="4" />
          {[0, 1, 2].map((c) =>
            [0, 1].map((r) => <circle key={`${c}-${r}`} cx={x - 28 + c * 28} cy={80 + r * 20} r="8" fill="#FFF9E6" />),
          )}
        </g>
      ))}
    </Cover>
  );
}

/** The staff kitchen's wall: tiles, cupboards, a rainy window, a shelf of jars and a note. The counter is drawn by the game. */
export function KitchenScene() {
  return (
    <Cover bg="#E9DFC9">
      <defs>
        <pattern id="kitchen-tiles" width="60" height="32" patternUnits="userSpaceOnUse">
          <rect width="60" height="32" fill="#DCE7E4" />
          <rect x="1.5" y="1.5" width="57" height="29" rx="3" fill="#E9F1EE" />
          <rect x="1.5" y="1.5" width="57" height="6" rx="3" fill="#FFFFFF" opacity="0.6" />
        </pattern>
      </defs>
      <rect width="1000" height="700" fill="url(#kitchen-tiles)" />
      {/* upper cupboards */}
      {[60, 220, 380].map((x) => (
        <g key={x}>
          <rect x={x} y="40" width="150" height="190" rx="6" fill="#4E9A8E" stroke={INK} strokeWidth="5" />
          <rect x={x + 14} y="54" width="122" height="162" rx="4" fill="none" stroke="#3B7C72" strokeWidth="4" />
          <rect x={x + 112} y="186" width="10" height="26" rx="4" fill="#F2B33D" stroke={INK} strokeWidth="2.5" />
        </g>
      ))}
      {/* the shelf of jars */}
      <rect x="70" y="330" width="420" height="12" fill="#8A5A3A" stroke={INK} strokeWidth="4" />
      {[
        { x: 90, w: 50, h: 60, c: "#C98E5A", l: "TEA" },
        { x: 160, w: 44, h: 50, c: "#F4EEE4", l: "SUGAR" },
        { x: 224, w: 56, h: 66, c: "#7A4A22", l: "COFFEE" },
        { x: 300, w: 40, h: 44, c: "#E8574A", l: "" },
        { x: 360, w: 60, h: 56, c: "#F2B33D", l: "BISCUITS" },
      ].map((j) => (
        <g key={j.x}>
          <rect x={j.x} y={330 - j.h} width={j.w} height={j.h} rx="6" fill={j.c} stroke={INK} strokeWidth="4" />
          <rect x={j.x - 3} y={322 - j.h} width={j.w + 6} height="12" rx="3" fill="#3A3E4A" stroke={INK} strokeWidth="3" />
          {j.l && <rect x={j.x + 6} y={330 - j.h * 0.62} width={j.w - 12} height="16" rx="2" fill="#FFF8E8" stroke={INK} strokeWidth="2" />}
          {j.l && (
            <text x={j.x + j.w / 2} y={330 - j.h * 0.62 + 12} textAnchor="middle" fontSize={j.l.length > 5 ? 7 : 10} fontWeight="900" fill={INK}>
              {j.l}
            </text>
          )}
        </g>
      ))}
      <Window x={690} y={90} w={230} h={230} moon />
      <circle cx="590" cy="120" r="38" fill="#F4EEE4" stroke={INK} strokeWidth="5" />
      <line x1="590" y1="120" x2="590" y2="94" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <line x1="590" y1="120" x2="610" y2="128" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="560" y="230" width="86" height="80" fill="#F6D36B" stroke={INK} strokeWidth="3" transform="rotate(4 603 270)" />
      <path d="M574 258h56M574 274h44M574 290h50" stroke="#8A6A3A" strokeWidth="3" transform="rotate(4 603 270)" />
    </Cover>
  );
}

/** The workbench: a pegboard and a parts shelf on the wall, a desk lamp shining down, a multimeter and a soldering iron. */
export function BenchScene() {
  return (
    <>
      <Cover bg="#6E7A92">
        <rect width="1000" height="330" fill="#7D8AA3" />
        <rect y="300" width="1000" height="30" fill="#66728A" />
        <rect x="60" y="80" width="250" height="190" fill="#B88A5A" stroke={INK} strokeWidth="4" />
        {Array.from({ length: 21 }, (_, i) =>
          Array.from({ length: 15 }, (_, j) => <circle key={`${i}-${j}`} cx={72 + i * 11.3} cy={92 + j * 12} r="1.8" fill="#7A5A3A" />),
        )}
        <path d="M90 110h20v110h-20z" fill="#3A3E4A" />
        <circle cx="160" cy="150" r="22" fill="none" stroke="#E8574A" strokeWidth="7" />
        <path d="M220 240h40l-10 -100h-20Z" fill="#F2B33D" stroke={INK} strokeWidth="3" />
        <rect x="680" y="110" width="260" height="170" fill="#5A6680" stroke={INK} strokeWidth="4" />
        {Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 5 }, (_, c) => (
            <g key={`${r}-${c}`}>
              <rect x={692 + c * 49} y={122 + r * 38} width="42" height="30" rx="3" fill={["#3E7FD9", "#E8574A", "#F2B33D", "#3FB8AF", "#8E74E8"][(r + c) % 5]} stroke={INK} strokeWidth="2.5" />
              <rect x={705 + c * 49} y={133 + r * 38} width="16" height="6" rx="2" fill="#FFF8E8" />
            </g>
          )),
        )}
        {/* the desk */}
        <rect y="330" width="1000" height="370" fill="#9C6B43" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M0 ${360 + i * 38} Q 250 ${352 + i * 38} 500 ${362 + i * 38} T 1000 ${358 + i * 38}`} stroke="#86592F" strokeWidth="3" fill="none" opacity="0.6" />
        ))}
        <rect y="326" width="1000" height="8" fill={INK} opacity="0.4" />
        {/* the lamp over the bench (its shade sits up under the header; its light falls on the board) */}
        <rect x="497" y="0" width="6" height="40" fill="#3A3E4A" />
        <path d="M450 80 Q500 20 550 80 Z" fill="#E8574A" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M455 80 L545 80 L820 700 L180 700 Z" fill="#FFF3C8" opacity="0.12" />
        {/* a multimeter and a soldering iron */}
        <rect x="60" y="420" width="120" height="170" rx="12" fill="#F2B33D" stroke={INK} strokeWidth="5" />
        <rect x="76" y="436" width="88" height="44" rx="4" fill="#B9D7A8" stroke={INK} strokeWidth="3" />
        <text x="120" y="467" textAnchor="middle" fontSize="22" fontWeight="900" fill={INK} fontFamily="monospace">9.0</text>
        <circle cx="120" cy="536" r="28" fill="#3A3E4A" stroke={INK} strokeWidth="4" />
        <path d="M120 536 L136 516" stroke="#FFF8E8" strokeWidth="5" strokeLinecap="round" />
        <rect x="830" y="470" width="120" height="30" rx="6" fill="#3A3E4A" stroke={INK} strokeWidth="4" />
        <path d="M860 470 q10 -40 30 -60 q20 -20 40 -20" fill="none" stroke="#C9CDD6" strokeWidth="6" />
        <path d="M800 560 L960 420" stroke={INK} strokeWidth="14" strokeLinecap="round" />
        <path d="M800 560 L880 490" stroke="#3E7FD9" strokeWidth="9" strokeLinecap="round" />
      </Cover>
      <Motes />
    </>
  );
}

/** Dust motes drifting in the light (still with reduced motion). */
export function Motes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          className="world-mote absolute block size-1.5 rounded-full bg-[#FFE9B8]"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * -1.3}s`, opacity: 0.25 + (i % 4) * 0.12 } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** A burst of sparks at a point (percent of the area), re-fired whenever `fire` changes. */
export function Sparks({ fire, x, y, colour = "#F2B33D" }: { fire: number; x: number; y: number; colour?: string }) {
  if (!fire) return null;
  return (
    <div key={fire} aria-hidden="true" className="pointer-events-none absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <span
            key={i}
            className="world-spark absolute block h-1.5 w-4 rounded-full"
            style={{ background: colour, transform: `rotate(${a}rad)`, ["--sx" as string]: `${Math.cos(a) * 60}px`, ["--sy" as string]: `${Math.sin(a) * 60}px` }}
          />
        );
      })}
    </div>
  );
}

/** Prof. Squires's office after hours: wood panelling, a rainy window, the bookcase, the framed HALO sketch, a lamp's pool of light. */
export function OfficeScene() {
  return (
    <Cover bg="#3E4F58">
      <rect width="1000" height="700" fill="#46606A" />
      <rect x="0" y="420" width="1000" height="280" fill="#5E4630" />
      {Array.from({ length: 21 }, (_, i) => (
        <rect key={i} x={i * 50} y="420" width="3" height="280" fill="#3E2C1E" opacity="0.7" />
      ))}
      <rect x="0" y="412" width="1000" height="14" fill="#7A5A3E" stroke={INK} strokeWidth="3" />
      <Window x={60} y={70} w={250} h={260} moon />
      {/* the bookcase */}
      <rect x="360" y="40" width="200" height="380" fill="#6B4E36" stroke={INK} strokeWidth="5" />
      {[0, 1, 2, 3].map((r) => (
        <g key={r}>
          <rect x="372" y={130 + r * 90} width="176" height="9" fill="#7A5A3E" />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={378 + i * 19} y={70 + r * 90 + (i % 3) * 6} width="15" height={60 - (i % 3) * 6} fill={["#8E3B32", "#2C4A6E", "#3F6B4E", "#C9A877", "#5D4E9C"][(i + r) % 5]} stroke={INK} strokeWidth="2" />
          ))}
        </g>
      ))}
      {/* the framed sketch */}
      <rect x="620" y="110" width="150" height="150" fill="#3A2C22" stroke={INK} strokeWidth="5" />
      <rect x="634" y="124" width="122" height="122" fill="#F2EBD8" />
      <circle cx="672" cy="186" r="22" fill="none" stroke="#5A5D64" strokeWidth="4" />
      <circle cx="720" cy="186" r="22" fill="none" stroke="#5A5D64" strokeWidth="4" />
      <line x1="694" y1="186" x2="698" y2="186" stroke="#5A5D64" strokeWidth="4" />
      {/* the lamp's pool */}
      <ellipse cx="880" cy="430" rx="190" ry="60" fill="#FFE2A8" opacity="0.18" />
      <path d="M850 210 l60 -30 l20 30 l-60 30 Z" fill="#2E6B4E" stroke={INK} strokeWidth="4" />
      <path d="M880 220 L800 420 L980 420 Z" fill="#FFE2A8" opacity="0.12" />
      <Motes />
    </Cover>
  );
}

/** The security office: grey-blue walls, lockers, the bank of screens glowing over the desk. The game draws the screens. */
export function SecurityScene() {
  return (
    <Cover bg="#3B4660">
      <rect width="1000" height="700" fill="#55617A" />
      <rect x="0" y="470" width="1000" height="230" fill="#3B4660" />
      <rect x="0" y="462" width="1000" height="12" fill="#22293F" />
      {[30, 110, 190].map((x) => (
        <g key={x}>
          <rect x={x} y="160" width="76" height="440" rx="4" fill="#7E8BA0" stroke={INK} strokeWidth="5" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={x + 16} y={186 + i * 10} width="44" height="4" fill="#4A5268" />
          ))}
          <rect x={x + 54} y="380" width="10" height="40" rx="3" fill="#C9CDD6" stroke={INK} strokeWidth="2" />
        </g>
      ))}
      <rect x="800" y="150" width="120" height="160" fill="#8A6A4A" stroke={INK} strokeWidth="4" />
      <rect x="812" y="162" width="96" height="136" fill="#F2EFE6" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x="822" y={180 + i * 18} width={70 - (i % 3) * 14} height="5" fill="#5A5D64" opacity="0.6" />
      ))}
      <ellipse cx="560" cy="330" rx="320" ry="220" fill="#7FA2FF" opacity="0.10" />
    </Cover>
  );
}

/** The car park at night, in the rain: wet tarmac, a street lamp, the gatehouse's lit window. The game draws the barrier and the cars. */
export function CarParkScene() {
  return (
    <Cover bg="#0E1430">
      <rect width="1000" height="700" fill="#121A3A" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 90 - 20} y={260 - ((i * 53) % 160)} width="80" height={300 + ((i * 53) % 160)} fill="#0C0F22" />
      ))}
      {Array.from({ length: 30 }, (_, i) => (
        <rect key={i} x={(i * 71) % 980 + 10} y={200 + ((i * 37) % 220)} width="6" height="8" fill="#FFCF6B" opacity={0.3 + (i % 4) * 0.12} />
      ))}
      <circle cx="820" cy="90" r="34" fill="#F2EBD8" />
      <rect x="0" y="470" width="1000" height="230" fill="#24262F" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={i * 140 + 20} y="585" width="80" height="6" fill="#C9C2A0" opacity="0.45" />
      ))}
      <rect x="150" y="160" width="10" height="312" fill="#262A34" />
      <rect x="120" y="150" width="70" height="20" rx="6" fill="#3A3E4A" stroke={INK} strokeWidth="3" />
      <path d="M128 170 L60 470 L260 470 L182 170 Z" fill="#FFE6A8" opacity="0.12" />
      <rect x="820" y="250" width="130" height="222" fill="#B9B3A6" stroke={INK} strokeWidth="5" />
      <rect x="842" y="280" width="86" height="80" fill="#F6D9A0" stroke={INK} strokeWidth="4" />
      <rect x="812" y="230" width="146" height="26" fill="#1F2C4E" stroke={INK} strokeWidth="4" />
      <text x="885" y="249" textAnchor="middle" fontSize="16" fontWeight="900" fill="#F2E6D2" letterSpacing="2">NORTH GATE</text>
      <g className="world-rain-fall" stroke="#9FB2E0" strokeWidth="1.6" strokeLinecap="round" opacity="0.45">
        {Array.from({ length: 40 }, (_, i) => (
          <line key={i} x1={(i * 97) % 1000} y1={(i * 61) % 700 - 30} x2={(i * 97) % 1000 - 6} y2={(i * 61) % 700} />
        ))}
      </g>
    </Cover>
  );
}
