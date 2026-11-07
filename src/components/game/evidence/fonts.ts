import localFont from "next/font/local";
import { cx } from "@/lib/cx";

// The faces evidence is "made" with, loaded only on game pages. See the object styles in game.css.
// Self-hosted (see src/assets/fonts) so builds never depend on Google Fonts.
const typed = localFont({ src: "../../../assets/fonts/special-elite-400.woff2", weight: "400", variable: "--font-typed", display: "swap" });
const hand = localFont({ src: "../../../assets/fonts/patrick-hand-400.woff2", weight: "400", variable: "--font-hand", display: "swap" });
const printer = localFont({ src: "../../../assets/fonts/vt323-400.woff2", weight: "400", variable: "--font-printer", display: "swap" });

export const evidenceFonts = cx(typed.variable, hand.variable, printer.variable);
