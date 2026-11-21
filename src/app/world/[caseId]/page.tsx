import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorldStart } from "@/components/world/WorldStart";
import { caseById } from "@/data/cases";
import { hasWorld } from "@/lib/world/plates";

export const metadata: Metadata = {
  title: "World preview",
  robots: { index: false, follow: false },
};

/**
 * Opens a world room for a case with a painted building, then shows it in the world (W0.2).
 * Hidden: nothing links here, so the classic game stays everyone's default.
 */
export default async function WorldStartPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  if (!caseById(caseId) || !hasWorld(caseId)) notFound();
  return (
    <div className="min-h-[100svh] px-4 pt-5 pb-16 sm:px-6">
      <WorldStart caseId={caseId} />
    </div>
  );
}
