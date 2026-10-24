import type { PaidCase } from "@/data/catalog";

/**
 * Who may host a case, as pure functions (no Supabase or Dodo calls), so the
 * rules are easy to test.
 *
 * - free: not for sale (Case 001, the practice case)
 * - testing: for sale, but payments aren't switched on yet, so it plays free
 * - owned: bought, alone or in a bundle
 * - locked: for sale and not owned
 */
export type CaseAccess = "free" | "testing" | "owned" | "locked";

type Purchase = { case_id: string; status: string };

/** Every case id a player's paid purchases unlock, bundles expanded. */
export function unlockedCases(purchases: Purchase[], catalog: PaidCase[]) {
  const unlocked = new Set<string>();
  for (const p of purchases) {
    if (p.status !== "paid") continue;
    unlocked.add(p.case_id);
    catalog.find((c) => c.id === p.case_id)?.includes?.forEach((id) => unlocked.add(id));
  }
  return unlocked;
}

export function accessFor(input: {
  /** The catalog entry, or null for a free case. */
  paidCase: PaidCase | null;
  /** Payments are configured and this case has a Dodo product, so it can actually be bought. */
  purchasable: boolean;
  unlocked: Set<string>;
}): CaseAccess {
  if (!input.paidCase) return "free";
  if (input.unlocked.has(input.paidCase.id)) return "owned";
  return input.purchasable ? "locked" : "testing";
}
