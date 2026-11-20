import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountView } from "@/components/account/AccountView";
import { AuthDisabled } from "@/components/auth/AuthDisabled";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { accountCopy } from "@/data/account";
import { bundleSaving, bundles, paidCaseById, paidCases, productIdFor } from "@/data/catalog";
import { cases } from "@/data/cases";
import { getCurrentUser } from "@/lib/auth/session";
import { unlockedCases } from "@/lib/billing/access";
import { paymentsEnabled } from "@/lib/billing/env";
import { listMyPurchases } from "@/lib/billing/purchases";
import { normalizeCode, roomsForSeats } from "@/lib/rooms";
import { authEnabled } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ purchase?: string; buy?: string }> };

const notices = {
  complete: { tone: "success", text: accountCopy.purchase.complete },
  owned: { tone: "success", text: accountCopy.purchase.owned },
  failed: { tone: "error", text: accountCopy.purchase.failed },
} as const;

async function loadPurchases() {
  if (!paymentsEnabled()) return [];
  try {
    return await listMyPurchases();
  } catch (error) {
    console.error("[account] purchases unavailable", error);
    return [];
  }
}

/** Rooms this device is still in, from the room cookies the game sets (they last a day, like a room). */
async function loadRooms() {
  try {
    const seats = (await cookies())
      .getAll()
      .filter((c) => c.name.startsWith("omc_room_"))
      .map((c) => ({ code: normalizeCode(c.name.slice("omc_room_".length)), token: c.value }));
    return seats.length ? await roomsForSeats(seats) : [];
  } catch (error) {
    console.error("[account] rooms unavailable", error);
    return [];
  }
}

/** Name from Google if they signed in with it, otherwise the part of the email before the @. */
function displayName(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata ?? {};
  const name = [meta.full_name, meta.name].find((v): v is string => typeof v === "string" && v.trim() !== "");
  return name?.trim() || user.email?.split("@")[0] || accountCopy.fallbackName;
}

export default async function AccountPage({ searchParams }: Props) {
  if (!authEnabled()) {
    return (
      <>
        <SiteHeader />
        <AuthDisabled />
      </>
    );
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const { purchase, buy } = await searchParams;
  const notice = purchase && purchase in notices ? notices[purchase as keyof typeof notices] : null;
  const caseToBuy = buy ? paidCaseById(buy) : null;
  const [purchases, rooms] = await Promise.all([loadPurchases(), loadRooms()]);
  const unlocked = unlockedCases(purchases, paidCases);
  const refunded = new Set(purchases.filter((p) => p.status === "refunded").map((p) => p.case_id));
  const selling = paymentsEnabled();

  const name = displayName(user);
  const joined = new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const shelf = cases.map((caseFile) => ({ caseFile, owned: unlocked.has(caseFile.id), refunded: refunded.has(caseFile.id) }));
  const playable = shelf.filter(({ caseFile, owned }) => owned || !paidCaseById(caseFile.id)).length;

  const bundle = bundles.find((b) => selling && productIdFor(b) && !(b.includes ?? []).every((id) => unlocked.has(id)));
  const saving = bundle ? bundleSaving(bundle) : null;

  return (
    <AccountView
      name={name}
      email={user.email}
      joined={joined}
      playable={playable}
      total={shelf.length}
      notice={notice}
      caseToBuy={caseToBuy && !unlocked.has(caseToBuy.id) ? caseToBuy : null}
      rooms={rooms}
      shelf={shelf}
      selling={selling}
      bundle={bundle ?? null}
      saving={saving}
      purchases={purchases}
    />
  );
}
