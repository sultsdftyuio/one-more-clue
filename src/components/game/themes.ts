import { Monoton, Mountains_of_Christmas, Playfair_Display, Special_Elite } from "next/font/google";
import type { ThemeId } from "@/lib/game/types";

// Each case's display font, loaded only on game pages. They all set --font-case.
const typewriter = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-case", display: "swap" });
const neon = Monoton({ weight: "400", subsets: ["latin"], variable: "--font-case", display: "swap" });
const serif = Playfair_Display({ weight: ["700", "900"], style: ["italic"], subsets: ["latin"], variable: "--font-case", display: "swap" });
const frosty = Mountains_of_Christmas({ weight: "700", subsets: ["latin"], variable: "--font-case", display: "swap" });

export type Weather = "rain" | "radio" | "steam" | "snow";

export type Theme = {
  id: ThemeId;
  /** Class that sets --font-case for titles. */
  font: string;
  /** Background and accent styles, see game.css. */
  className: string;
  weather: Weather;
};

/**
 * A case's identity: its title font, colours and the weather drifting behind
 * every screen. Music sets live in audio/sound.ts under the same ids.
 */
export const THEMES: Record<ThemeId, Theme> = {
  noir: { id: "noir", font: typewriter.variable, className: "theme-noir", weather: "rain" },
  radio: { id: "radio", font: neon.variable, className: "theme-radio", weather: "radio" },
  bistro: { id: "bistro", font: serif.variable, className: "theme-bistro", weather: "steam" },
  frost: { id: "frost", font: frosty.variable, className: "theme-frost", weather: "snow" },
};

export const themeOf = (id?: ThemeId) => THEMES[id ?? "noir"];
