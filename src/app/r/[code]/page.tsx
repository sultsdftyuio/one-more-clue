import type { Metadata } from "next";
import { GameRoom } from "@/components/game/GameRoom";
import { normalizeCode } from "@/lib/rooms";

export const metadata: Metadata = {
  title: "Case room",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ code: string }> };

export default async function RoomPage({ params }: Props) {
  const code = normalizeCode((await params).code);
  return <GameRoom code={code} />;
}
