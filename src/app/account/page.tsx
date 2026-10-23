import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CaseList } from "@/components/account/CaseList";
import { AuthDisabled } from "@/components/auth/AuthDisabled";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormNotice } from "@/components/auth/FormNotice";
import { BuyCaseButton } from "@/components/billing/BuyCaseButton";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { accountCopy } from "@/data/account";
import { paidCaseById } from "@/data/catalog";
import { getCurrentUser } from "@/lib/auth/session";
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

  return (
    <>
      <SiteHeader />
      <main>
        <AuthShell eyebrow={accountCopy.eyebrow} title={accountCopy.title}>
          <div className="space-y-6">
            {notice && <FormNotice tone={notice.tone}>{notice.text}</FormNotice>}
            <p className="font-semibold text-ink/70">
              {accountCopy.signedInAs} <span className="font-extrabold text-ink">{user.email}</span>
            </p>
            {caseToBuy && (
              <div>
                <p className="font-extrabold">{accountCopy.buyPrompt}</p>
                <BuyCaseButton paidCase={caseToBuy} className="mt-2" />
              </div>
            )}
            <section>
              <h2 className="font-display text-2xl">{accountCopy.casesHeading}</h2>
              <CaseList purchases={purchases} />
            </section>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary">
                {accountCopy.logout}
              </Button>
            </form>
          </div>
        </AuthShell>
      </main>
    </>
  );
}
