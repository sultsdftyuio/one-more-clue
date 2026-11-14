import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/account/actions";
import { CaseShelf, type ShelfCase } from "@/components/account/CaseShelf";
import { FormNotice } from "@/components/auth/FormNotice";
import { BuyCaseButton } from "@/components/billing/BuyCaseButton";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/Button";
import { accountCopy } from "@/data/account";
import { paidCaseById, type PaidCase } from "@/data/catalog";
import { posterArt, seasonArt } from "@/lib/art";
import { SUPPORT_EMAIL } from "@/lib/site";

export type AccountViewProps = {
  name: string;
  email?: string;
  /** "October 2026" */
  joined: string;
  playable: number;
  total: number;
  notice: { tone: "success" | "error"; text: string } | null;
  /** A case they came here to buy and don't own yet. */
  caseToBuy: PaidCase | null;
  shelf: ShelfCase[];
  selling: boolean;
  /** The season bundle, while they don't own all of it. */
  bundle: PaidCase | null;
  saving: string | null;
  purchases: { case_id: string; status: string; created_at: string }[];
};

/** The signed-in player's page: who they are, their cases as posters, the season pass, and what they've bought. */
export function AccountView({ name, email, joined, playable, total, notice, caseToBuy, shelf, selling, bundle, saving, purchases }: AccountViewProps) {
  return (
    <>
      <SiteHeader />
      <main className="bg-[#0b0d12] px-4 pt-28 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-12">
          {notice && <FormNotice tone={notice.tone}>{notice.text}</FormNotice>}

          <section className="flex items-start gap-4 sm:items-center">
            <div aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-mustard font-display text-3xl text-ink">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-3xl leading-tight break-words text-cream sm:text-4xl">{name}</h1>
              <p className="text-sm font-bold break-all text-cream/60">
                {accountCopy.signedInAs} <span className="text-cream/85">{email}</span>
              </p>
              <p className="text-sm font-bold text-cream/45">
                {accountCopy.joined(joined)} · {accountCopy.unlocked(playable, total)}
              </p>
              {/* On a phone the button sits under the name, so the name and email have the room. */}
              <form action={logoutAction} className="mt-3 sm:hidden">
                <Button type="submit" variant="secondary" className="px-4 py-1.5 text-sm">
                  {accountCopy.logout}
                </Button>
              </form>
            </div>
            <form action={logoutAction} className="hidden shrink-0 sm:block">
              <Button type="submit" variant="secondary" className="px-5 py-2 text-base">
                {accountCopy.logout}
              </Button>
            </form>
          </section>

          {caseToBuy && (
            <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-white/5 p-4">
              {posterArt[caseToBuy.id] && <Image src={posterArt[caseToBuy.id]} alt="" sizes="48px" className="h-16 w-auto rounded-lg" />}
              <p className="min-w-0 flex-1 font-extrabold text-cream">{accountCopy.buyPrompt(caseToBuy.title)}</p>
              <BuyCaseButton paidCase={caseToBuy} variant="primary" buttonClassName="px-5 py-2 text-base" />
            </section>
          )}

          <section>
            <h2 className="font-display text-3xl text-cream">{accountCopy.shelf.heading}</h2>
            <p className="mt-1 mb-6 max-w-xl font-semibold text-cream/65">{accountCopy.shelf.sub}</p>
            <CaseShelf items={shelf} selling={selling} />
          </section>

          {bundle && (
            <section className="flex flex-wrap items-center gap-5 rounded-2xl bg-white/5 p-5">
              <Image src={seasonArt.season1} alt="" sizes="240px" className="h-20 w-auto rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold tracking-[0.14em] text-cream/55 uppercase">{accountCopy.bundle.eyebrow}</p>
                <h2 className="font-display text-2xl text-cream">{accountCopy.bundle.title((bundle.includes ?? []).length)}</h2>
                <p className="text-sm font-bold text-cream/65">
                  {(bundle.includes ?? []).map((id) => paidCaseById(id)?.title).join(" · ")}
                  {saving && <span className="ml-2 rounded-full bg-teal px-2 py-0.5 text-xs font-extrabold text-ink">{accountCopy.bundle.save(saving)}</span>}
                </p>
              </div>
              <BuyCaseButton paidCase={bundle} label={accountCopy.bundle.buy(bundle.price)} variant="primary" buttonClassName="px-5 py-2 text-base" />
            </section>
          )}

          {purchases.length > 0 && (
            <section>
              <h2 className="font-display text-2xl text-cream">{accountCopy.purchases.heading}</h2>
              <ul className="mt-3 divide-y divide-white/10 overflow-hidden rounded-2xl bg-white/5">
                {purchases.map((p) => (
                  <li key={`${p.case_id}-${p.created_at}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm font-bold">
                    <span className="min-w-0 flex-1 text-cream">{paidCaseById(p.case_id)?.title ?? p.case_id}</span>
                    <span className="text-cream/55">{new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className={p.status === "paid" ? "text-teal" : "text-cream/60"}>{accountCopy.purchases.status[p.status] ?? p.status}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-semibold text-cream/60">
                {accountCopy.purchases.refund}{" "}
                <Link href="/terms#refunds" className="font-extrabold text-mustard underline decoration-2 underline-offset-4 hover:text-cream">
                  {accountCopy.purchases.terms}
                </Link>
              </p>
            </section>
          )}

          {SUPPORT_EMAIL && (
            <p className="text-center text-sm font-semibold text-cream/60">
              {accountCopy.help}{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-extrabold text-cream underline decoration-2 underline-offset-4 hover:text-mustard">
                {SUPPORT_EMAIL}
              </a>
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
