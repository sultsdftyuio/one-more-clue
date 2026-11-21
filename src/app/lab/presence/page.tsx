import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { presenceLabOpen } from "@/lib/presence/lab";
import { liveConfigured } from "@/lib/rooms/live";
import { supabaseConfig } from "@/lib/supabase/env";
import { PresenceLab } from "./PresenceLab";

export const metadata: Metadata = { title: "Presence lab", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/**
 * W0.5 spike (throwaway): 2–4 phones or tabs walk dots along a strip over the
 * live presence channel, and each one measures what it sees. Not linked from
 * anywhere; off on the live site. See docs/world-overhaul.md, section 7.
 */
export default async function PresenceLabPage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!presenceLabOpen()) notFound();
  const search = await searchParams;
  const hz = Number(one(search.hz));
  return (
    <PresenceLab
      supabase={supabaseConfig()}
      livekit={liveConfigured()}
      transport={one(search.transport) === "livekit" ? "livekit" : "supabase"}
      hz={[2, 5, 10].includes(hz) ? hz : 10}
      room={one(search.room).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 24) || "lab"}
      name={one(search.name).replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 16)}
      auto={one(search.auto)}
    />
  );
}
