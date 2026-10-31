import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuickStart } from "@/components/game/QuickStart";
import { caseById } from "@/data/cases";

export const metadata: Metadata = {
  title: "Opening the case",
  robots: { index: false, follow: false },
};

/** Opens a room for a case in one tap, from any "Play" button. */
export default async function NewRoomPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  if (!caseById(caseId)) notFound();
  return (
    <div className="min-h-[100svh] px-4 pt-5 pb-16 sm:px-6">
      <QuickStart caseId={caseId} />
    </div>
  );
}
