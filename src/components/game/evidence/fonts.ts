import { Patrick_Hand, Special_Elite, VT323 } from "next/font/google";
import { cx } from "@/lib/cx";

// The faces evidence is "made" with, loaded only on game pages. See the object styles in game.css.
const typed = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-typed", display: "swap" });
const hand = Patrick_Hand({ weight: "400", subsets: ["latin"], variable: "--font-hand", display: "swap" });
const printer = VT323({ weight: "400", subsets: ["latin"], variable: "--font-printer", display: "swap" });

export const evidenceFonts = cx(typed.variable, hand.variable, printer.variable);
