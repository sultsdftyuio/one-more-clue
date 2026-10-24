import type { Metadata } from "next";
import Link from "next/link";
import { HostForm } from "@/components/game/HostForm";
import { paidCaseById } from "@/data/catalog";
import { cases } from "@/data/cases";

// Not linked from the site yet: the game is still being built.
export const metadata: Metadata = {
  title: "Host a case",
  robots: { index: false, follow: false },
};

export default function HostPage() {
  const options = cases.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    players: `${c.minPlayers}–${c.maxPlayers} players`,
    tagline: c.tagline,
    // Paid cases show their price; until checkout is wired to rooms they're free to play.
    price: paidCaseById(c.id)?.price ?? null,
  }));
  return (
    <div className="min-h-[100svh] px-4 pt-5 pb-16 sm:px-6">
      <Link href="/" className="mx-auto mb-6 block max-w-2xl font-display text-xl text-cream text-pop">
        One More Clue
      </Link>
      <HostForm cases={options} />
    </div>
  );
}
