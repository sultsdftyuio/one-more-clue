import type { Metadata } from "next";
import { NightLanding } from "@/components/night/NightLanding";

/** Prototype of the scroll-driven "One Night" landing page. Kept out of search until it replaces the home page. */
export const metadata: Metadata = {
  title: "One Night (prototype)",
  robots: { index: false, follow: false },
};

export default function NightPage() {
  return <NightLanding />;
}
