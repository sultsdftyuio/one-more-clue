import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WorldRoom } from "@/components/world/WorldRoom";
import { normalizeCode, worldRoomCase } from "@/lib/rooms";

export const metadata: Metadata = {
  title: "World preview",
  robots: { index: false, follow: false },
};

/**
 * The hidden world route (W0.2 in docs/world-overhaul.md): a world room opens in its case's painted
 * building. Classic rooms, and rooms that are gone, go to the classic screens, which explain.
 * Nothing links here yet; world rooms come from /world/<caseId>.
 */
export default async function WorldRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const caseId = await worldRoomCase(code);
  if (!caseId) redirect(`/r/${code}`);
  return <WorldRoom code={code} caseId={caseId} />;
}
