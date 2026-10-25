import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CaseShelf } from "@/components/account/CaseShelf";
import { AuthDisabled } from "@/components/auth/AuthDisabled";
import { FormNotice } from "@/components/auth/FormNotice";
import { BuyCaseButton } from "@/components/billing/BuyCaseButton";
import { CONTACT_EMAIL } from "@/components/layout/LegalPage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { accountCopy } from "@/data/account";
import { bundleSaving, bundles, paidCaseById, paidCases, productIdFor } from "@/data/catalog";
import { cases } from "@/data/cases";
import { getCurrentUser } from "@/lib/auth/session";
import { propArt, sceneArt } from "@/lib/art";
import { unlockedCases } from "@/lib/billing/access";
import { paymentsEnabled } from "@/lib/billing/env";
import { listMyPurchases } from "@/lib/billing/purchases";
import { authEnabled } from "@/lib/supabase/env";
import { logoutAction } from "./actions";

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
  const purchases = await loadPurchases();
  const unlocked = unlockedCases(purchases, paidCases);
  const refunded = new Set(purchases.filter((p) => p.status === "refunded").map((p) => p.case_id));
  const selling = paymentsEnabled();

  const name = displayName(user);
  const joined = new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  // Real cases first, the practice case last.
  const shelf = [...cases]
    .sort((a, b) => Number(a.id.startsWith("practice")) - Number(b.id.startsWith("practice")))
    .map((caseFile) => ({ caseFile, owned: unlocked.has(caseFile.id), refunded: refunded.has(caseFile.id) }));
  const mainCases = shelf.filter(({ caseFile }) => !caseFile.id.startsWith("practice"));
  const playable = mainCases.filter(({ caseFile, owned }) => owned || !paidCaseById(caseFile.id)).length;

  const bundle = bundles.find((b) => selling && productIdFor(b) && !(b.includes ?? []).every((id) => unlocked.has(id)));
  const saving = bundle ? bundleSaving(bundle) : null;

  return (
    <>
      <SiteHeader />
      <main className="relative isolate overflow-hidden px-4 pt-28 pb-20 sm:px-6">
        <Image src={sceneArt.sky} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="mx-auto max-w-4xl space-y-10">
          {notice && <FormNotice tone={notice.tone}>{notice.text}</FormNotice>}

          <section className="relative -rotate-1 rounded-3xl border-[3px] border-ink bg-cream p-6 text-ink shadow-card sm:p-8">
            <Image
              src={propArt.magnifier}
              alt=""
              sizes="112px"
              className="absolute -top-12 -right-4 w-20 rotate-12 animate-float sm:-right-10 sm:w-28"
            />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                aria-hidden
                className="grid size-20 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-mustard font-display text-4xl shadow-pop-sm"
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="inline-block rounded-full border-2 border-ink bg-mustard px-3 py-0.5 text-xs font-extrabold tracking-widest uppercase">
                  {accountCopy.eyebrow}
                </p>
                <h1 className="mt-2 truncate font-display text-4xl leading-none sm:text-5xl">{name}</h1>
                <p className="mt-2 truncate font-semibold text-ink/70">
                  {accountCopy.signedInAs} <span className="font-extrabold text-ink">{user.email}</span>
                </p>
                <p className="mt-1 text-sm font-bold text-ink/55">
                  {accountCopy.joined(joined)} · {accountCopy.unlocked(playable, mainCases.length)}
                </p>
              </div>
              <form action={logoutAction} className="shrink-0">
                <Button type="submit" variant="secondary" className="px-5 py-2 text-base">
                  {accountCopy.logout}
                </Button>
              </form>
            </div>
            {caseToBuy && !unlocked.has(caseToBuy.id) && (
              <div className="mt-6 rounded-2xl border-[3px] border-dashed border-ink/30 p-4">
                <p className="font-extrabold">{accountCopy.buyPrompt}</p>
                <BuyCaseButton paidCase={caseToBuy} className="mt-2" />
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-4xl text-cream text-pop">{accountCopy.shelf.heading}</h2>
            <p className="mt-2 mb-6 max-w-xl font-semibold text-cream/80">{accountCopy.shelf.sub}</p>
            <CaseShelf items={shelf} selling={selling} />
          </section>

          {bundle && (
            <section className="flex flex-col gap-4 rounded-3xl border-[3px] border-ink bg-mustard p-6 text-ink shadow-card sm:flex-row sm:items-center sm:p-8">
              <div className="flex-1">
                <p className="text-xs font-extrabold tracking-widest uppercase">{accountCopy.bundle.eyebrow}</p>
                <h2 className="mt-1 font-display text-3xl leading-none sm:text-4xl">
                  {accountCopy.bundle.title((bundle.includes ?? []).length)}
                </h2>
                <p className="mt-2 font-semibold">
                  {(bundle.includes ?? []).map((id) => paidCaseById(id)?.title).join(" · ")}
                  {saving && <span className="ml-2 rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-sm font-extrabold">{accountCopy.bundle.save(saving)}</span>}
                </p>
              </div>
              <BuyCaseButton paidCase={bundle} label={accountCopy.bundle.buy(bundle.price)} className="shrink-0" />
            </section>
          )}

          <p className="text-center text-sm font-semibold text-cream/70">
            {accountCopy.help} <span className="font-extrabold text-cream">{CONTACT_EMAIL}</span>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
