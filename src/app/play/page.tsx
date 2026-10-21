import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CaseRoomSoon } from "@/components/play/CaseRoomSoon";

export const metadata: Metadata = {
  title: "Case 001 — One More Clue",
};

export default function PlayPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <CaseRoomSoon />
      </main>
    </>
  );
}
