import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CaseRoomSoon } from "@/components/play/CaseRoomSoon";
import { gameOpen } from "@/lib/game-open";

export const metadata: Metadata = {
  title: "Case 001",
  description: "Case 001: The Last Message opens soon. Get notified the moment it does.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Links from videos can say where they came from: /play?ref=tiktok or ?utm_source=... */
export default async function PlayPage({ searchParams }: Props) {
  // Once the game is open, old /play links (videos, bios) go straight to hosting.
  if (gameOpen()) redirect("/host");
  const params = await searchParams;
  const raw = params.ref ?? params.utm_source;
  const source = (Array.isArray(raw) ? raw[0] : raw) ?? "direct";

  return (
    <>
      <SiteHeader />
      <main>
        <CaseRoomSoon source={source} />
      </main>
    </>
  );
}
