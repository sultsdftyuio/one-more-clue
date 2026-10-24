import type { Metadata } from "next";
import Link from "next/link";
import { HostForm, type BundleOffer, type CaseOption, type Notice } from "@/components/game/HostForm";
import { bundles, paidCaseById, productIdFor } from "@/data/catalog";
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

/** "$11.99" bundle against three "$4.99" cases → "$2.98". */
function saving(bundlePrice: string, caseIds: string[]) {
  const cents = (price?: string) => Math.round(Number(price?.replace(/[^0-9.]/g, "")) * 100);
  const separately = caseIds.reduce((sum, id) => sum + cents(paidCaseById(id)?.price), 0);
  const diff = separately - cents(bundlePrice);
  return diff > 0 ? `$${(diff / 100).toFixed(2)}` : null;
}

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
    };
  });

  const offers: BundleOffer[] = bundles
    .filter((b) => selling && productIdFor(b))
    .map((b) => ({
      id: b.id,
      title: b.title,
      price: b.price,
      caseTitles: (b.includes ?? []).map((id) => paidCaseById(id)?.title ?? id),
      saving: saving(b.price, b.includes ?? []),
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
  const preselect = item?.includes?.[0] ?? item?.id;

  return (
    <div className="min-h-[100svh] px-4 pt-5 pb-16 sm:px-6">
      <div className="mx-auto mb-6 flex max-w-2xl items-center justify-between gap-3">
        <Link href="/" className="font-display text-xl text-cream text-pop">
          One More Clue
        </Link>
        {selling && (
          <Link href={user ? "/account" : "/login?next=%2Fhost"} className="text-sm font-extrabold text-cream/75 hover:text-mustard">
            {user ? "My cases" : "Log in"}
          </Link>
        )}
      </div>
      <HostForm cases={options} bundles={offers} signedIn={Boolean(user)} notice={notice} preselect={preselect} />
    </div>
  );
}
