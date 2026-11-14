import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/app/account/actions";
import { CaseShelf, type ShelfCase } from "@/components/account/CaseShelf";
import { JoinByCode } from "@/components/account/JoinByCode";
import { FormNotice } from "@/components/auth/FormNotice";
import { BuyCaseButton } from "@/components/billing/BuyCaseButton";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button, buttonClass } from "@/components/ui/Button";
import { accountCopy } from "@/data/account";
import { paidCaseById, type PaidCase } from "@/data/catalog";
import { posterArt, sceneArt, seasonArt } from "@/lib/art";
import { SUPPORT_EMAIL } from "@/lib/site";

/** The site's usual panel: a dusk card with an ink outline. */
const panel = "rounded-3xl border-[3px] border-ink bg-dusk p-5 shadow-card sm:p-6";

export type AccountRoom = { code: string; caseId: string; caseTitle: string; phase: string };

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
  /** Rooms this device still has a seat in. */
  rooms: AccountRoom[];
  shelf: ShelfCase[];
  selling: boolean;
  /** The season bundle, while they don't own all of it. */
  bundle: PaidCase | null;
  saving: string | null;
  purchases: { case_id: string; status: string; created_at: string }[];
};

/**
 * The signed-in player's page, in the site's own night sky: who they are, a way back into
 * a game they're in, their cases as posters, joining a friend, the season pass and receipts.
 */
export function AccountView({ name, email, joined, playable, total, notice, caseToBuy, rooms, shelf, selling, bundle, saving, purchases }: AccountViewProps) {
  return (
    <>
      <SiteHeader />
      <main className="relative isolate overflow-hidden px-4 pt-28 pb-20 sm:px-6">
        <Image src={sceneArt.sky} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
        <div className="mx-auto max-w-5xl space-y-10">
          {notice && <FormNotice tone={notice.tone}>{notice.text}</FormNotice>}

          <section className={panel}>
            <div className="flex items-start gap-4 sm:items-center">
              <div aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-mustard font-display text-3xl text-ink shadow-pop-sm">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-3xl leading-tight break-words text-cream text-pop sm:text-4xl">{name}</h1>
                <p className="text-sm font-bold break-all text-cream/70">
                  {accountCopy.signedInAs} <span className="text-cream">{email}</span>
                </p>
                <p className="text-sm font-bold text-cream/55">
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
            </div>
            {caseToBuy && (
              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed border-cream/25 p-4">
                {posterArt[caseToBuy.id] && <Image src={posterArt[caseToBuy.id]} alt="" sizes="48px" className="h-16 w-auto rounded-lg border-2 border-ink" />}
                <p className="min-w-0 flex-1 font-extrabold text-cream">{accountCopy.buyPrompt(caseToBuy.title)}</p>
                <BuyCaseButton paidCase={caseToBuy} buttonClassName="px-5 py-2 text-base" />
              </div>
            )}
          </section>

          {rooms.length > 0 && (
            <section>
              <h2 className="font-display text-3xl text-cream text-pop">{accountCopy.rooms.heading}</h2>
              <ul className="mt-4 grid gap-3">
                {rooms.map((room) => (
                  <li key={room.code} className={`${panel} flex flex-wrap items-center gap-4 p-4 sm:p-4`}>
                    {posterArt[room.caseId] && <Image src={posterArt[room.caseId]} alt="" sizes="44px" className="h-16 w-auto rounded-lg border-2 border-ink" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl leading-tight text-cream">{room.caseTitle}</p>
                      <p className="text-sm font-bold text-cream/65">
                        Room {room.code} · {accountCopy.rooms.phase[room.phase] ?? room.phase}
                      </p>
                    </div>
                    <Link href={`/r/${room.code}`} className={buttonClass(room.phase === "reveal" ? "secondary" : "primary", "px-5 py-2 text-base")}>
                      {room.phase === "reveal" ? accountCopy.rooms.ended : accountCopy.rooms.rejoin}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="font-display text-3xl text-cream text-pop sm:text-4xl">{accountCopy.shelf.heading}</h2>
            <p className="mt-1 mb-6 max-w-xl font-semibold text-cream/80">{accountCopy.shelf.sub}</p>
            <CaseShelf items={shelf} selling={selling} />
          </section>

          <div className="grid items-start gap-6 md:grid-cols-2">
            <section className={panel}>
              <JoinByCode />
            </section>

            {bundle && (
              <section className={`${panel} flex flex-col gap-4`}>
                <Image src={seasonArt.season1} alt="" sizes="(min-width: 768px) 420px, 90vw" className="h-28 w-full rounded-xl border-2 border-ink object-cover" />
                <div>
                  <p className="text-xs font-extrabold tracking-[0.14em] text-cream/60 uppercase">{accountCopy.bundle.eyebrow}</p>
                  <h2 className="font-display text-2xl text-cream">{accountCopy.bundle.title((bundle.includes ?? []).length)}</h2>
                  <p className="text-sm font-bold text-cream/70">
                    {(bundle.includes ?? []).map((id) => paidCaseById(id)?.title).join(" · ")}
                    {saving && (
                      <span className="ml-2 rounded-full border-2 border-ink bg-teal px-2 py-0.5 text-xs font-extrabold text-ink">{accountCopy.bundle.save(saving)}</span>
                    )}
                  </p>
                </div>
                <BuyCaseButton paidCase={bundle} label={accountCopy.bundle.buy(bundle.price)} buttonClassName="w-full px-5 py-2 text-base" />
              </section>
            )}
          </div>

          {purchases.length > 0 && (
            <section className={panel}>
              <h2 className="font-display text-2xl text-cream">{accountCopy.purchases.heading}</h2>
              <ul className="mt-3 divide-y divide-cream/10">
                {purchases.map((p) => (
                  <li key={`${p.case_id}-${p.created_at}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm font-bold">
                    <span className="min-w-0 flex-1 text-cream">{paidCaseById(p.case_id)?.title ?? p.case_id}</span>
                    <span className="text-cream/60">{new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span className={p.status === "paid" ? "text-teal" : "text-cream/60"}>{accountCopy.purchases.status[p.status] ?? p.status}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-semibold text-cream/65">
                {accountCopy.purchases.refund}{" "}
                <Link href="/terms#refunds" className="font-extrabold text-mustard underline decoration-2 underline-offset-4 hover:text-cream">
                  {accountCopy.purchases.terms}
                </Link>
              </p>
            </section>
          )}

          {SUPPORT_EMAIL && (
            <p className="text-center text-sm font-semibold text-cream/70">
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
