import type { Metadata } from "next";
import { HostForm, type BundleOffer, type CaseOption, type Notice } from "@/components/game/HostForm";
import { bundleSaving, bundles, paidCaseById, productIdFor } from "@/data/catalog";
import { cases } from "@/data/cases";
import { getCurrentUser } from "@/lib/auth/session";
import { accessFor } from "@/lib/billing/access";
import { paymentsEnabled } from "@/lib/billing/env";
import { myUnlockedCases } from "@/lib/billing/purchases";

export const metadata: Metadata = {
  title: "Host a case",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function HostPage({ searchParams }: Props) {
  const params = await searchParams;
  const selling = paymentsEnabled();
  const user = selling ? await getCurrentUser() : null;
  const unlocked = user ? await myUnlockedCases().catch(() => new Set<string>()) : new Set<string>();

  const options: CaseOption[] = cases.map((c) => {
    const paidCase = paidCaseById(c.id);
    return {
      id: c.id,
      code: c.code,
      title: c.title,
      players: `${c.minPlayers}–${c.maxPlayers} players`,
      tagline: c.tagline,
      price: paidCase?.price ?? null,
      access: accessFor({ paidCase, purchasable: Boolean(paidCase && selling && productIdFor(paidCase)), unlocked }),
      chapters: c.chapters.length,
      video: c.cinematic?.video ?? null,
    };
  });

  const offers: BundleOffer[] = bundles
    .filter((b) => selling && productIdFor(b))
    .map((b) => ({
      id: b.id,
      title: b.title,
      price: b.price,
      caseTitles: (b.includes ?? []).map((id) => paidCaseById(id)?.title ?? id),
      saving: bundleSaving(b),
      owned: (b.includes ?? []).every((id) => unlocked.has(id)),
    }));

  // Coming back from checkout: say what happened, and select what was bought.
  const purchased = one(params.purchased);
  const owned = one(params.owned);
  const item = paidCaseById(purchased ?? owned ?? "");
  const notice: Notice = purchased
    ? { kind: "purchased", itemTitle: item?.title }
    : owned
      ? { kind: "owned", itemTitle: item?.title }
      : one(params.purchase) === "failed"
        ? { kind: "failed" }
        : null;
  // A poster's link (or sign-in coming back) names the case to show first: /host?case=case-002.
  const preselect = item?.includes?.[0] ?? item?.id ?? one(params.case);

  return (
    <div className="min-h-[100svh] bg-black">
      <HostForm cases={options} bundles={offers} signedIn={Boolean(user)} notice={notice} preselect={preselect} />
    </div>
  );
}
