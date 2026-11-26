import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { presenceLabOpen } from "@/lib/presence/lab";
import { JobsLab } from "./JobsLab";

export const metadata: Metadata = { title: "Side-game lab", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Search = Record<string, string | string[] | undefined>;

/**
 * A test page for the side games: /lab/jobs?game=penalty opens that game in its frame, with Case 001's suspect, and
 * no room, walk or team needed. Off on the live site, like the presence lab.
 */
export default async function JobsLabPage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!presenceLabOpen()) notFound();
  const game = (await searchParams).game;
  return <JobsLab game={(Array.isArray(game) ? game[0] : game) ?? ""} />;
}
