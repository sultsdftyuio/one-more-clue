"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { startCheckout } from "@/app/checkout/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { CaseAccess } from "@/lib/billing/access";
import { cx } from "@/lib/cx";
import { Panel } from "./parts";
import { Icon } from "./ui/Icon";

export type CaseOption = {
  id: string;
  code: string;
  title: string;
  players: string;
  tagline: string;
  price: string | null;
  access: CaseAccess;
};

export type BundleOffer = { id: string; title: string; price: string; caseTitles: string[]; saving: string | null; owned: boolean };

/** A note at the top after coming back from checkout. */
export type Notice = { kind: "purchased" | "owned" | "failed"; itemTitle?: string } | null;

const field =
  "rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold text-ink outline-none focus:border-mustard";

function PriceTag({ c }: { c: CaseOption }) {
  if (c.access === "free") return <span className="block">Free</span>;
  if (c.access === "owned")
    return (
      <span className="flex items-center justify-end gap-1 text-teal-700">
        <Icon name="check" className="size-4" /> Owned
      </span>
    );
  if (c.access === "testing")
    return (
      <>
        <span className="block">{c.price}</span>
        <span className="block text-xs opacity-60">free while testing</span>
      </>
    );
  return (
    <span className="flex items-center justify-end gap-1">
      <Icon name="lock" className="size-4" /> {c.price}
    </span>
  );
}

/** The checkout button for a case or bundle; signing in comes first when needed. */
function BuyButton({ id, label, signedIn, variant = "coral" }: { id: string; label: string; signedIn: boolean; variant?: "coral" | "secondary" }) {
  if (!signedIn) {
    return (
      <ButtonLink href="/login?next=%2Fhost" variant={variant}>
        Sign in to buy
      </ButtonLink>
    );
  }
  return (
    <form action={startCheckout}>
      <input type="hidden" name="caseId" value={id} />
      <input type="hidden" name="returnTo" value="/host" />
      <Button type="submit" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

/** Start a room as host (buying the case first if it's locked), or jump into a friend's room by code. */
export function HostForm({
  cases,
  bundles,
  signedIn,
  notice,
  preselect,
}: {
  cases: CaseOption[];
  bundles: BundleOffer[];
  signedIn: boolean;
  notice: Notice;
  preselect?: string;
}) {
  const router = useRouter();
  const [caseId, setCaseId] = useState(cases.some((c) => c.id === preselect) ? preselect! : null);
  const [code, setCode] = useState("");
  const selected = cases.find((c) => c.id === caseId && c.access === "locked");
  const offer = bundles.find((b) => !b.owned);

  // The payment webhook can land a few seconds after Dodo sends you back: keep checking until it unlocks.
  const waiting = notice?.kind === "purchased" && cases.some((c) => c.id === preselect && c.access === "locked");
  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      if (++tries > 12) window.clearInterval(timer);
      router.refresh();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [router, waiting]);

  // Playable cases open a room straight away; locked ones show how to unlock them.
  const pick = (c: CaseOption) => (c.access === "locked" ? setCaseId(c.id) : router.push(`/new/${c.id}`));

  const joinByCode = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean) router.push(`/r/${clean}`);
  };

  return (
    <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6">
      {notice && (
        <p
          role="status"
          className={cx(
            "rounded-2xl border-[3px] border-ink px-4 py-3 font-bold shadow-pop-sm",
            notice.kind === "failed" ? "bg-coral text-cream" : "bg-teal text-ink",
          )}
        >
          {notice.kind === "purchased" &&
            (waiting ? `Thanks! Unlocking ${notice.itemTitle} now, this takes a few seconds…` : `Thanks! ${notice.itemTitle} is yours. Tap it to play.`)}
          {notice.kind === "owned" && `You already own ${notice.itemTitle}. Tap it below to play.`}
          {notice.kind === "failed" && "Checkout couldn't start. Nothing was charged. Try again in a moment."}
        </p>
      )}

      <Panel>
        <h1 className="font-display text-4xl text-cream sm:text-5xl">Pick a case</h1>
        <p className="mt-1 font-bold text-cream/70">Tap one to open a room. You&apos;ll get a link for your friends.</p>
        <div className="mt-5 grid min-w-0 gap-2">
          {cases.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => pick(c)}
              aria-pressed={c.id === caseId}
              className="flex w-full items-center gap-3 rounded-2xl border-[3px] border-ink bg-cream p-3 text-left text-ink shadow-pop-sm transition-transform hover:-translate-y-0.5 aria-pressed:bg-mustard"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold tracking-widest uppercase opacity-70">{c.code}</span>
                <span className="block font-display text-xl leading-tight">{c.title}</span>
                <span className="mt-0.5 block text-sm leading-snug font-semibold opacity-75">{c.tagline}</span>
              </span>
              <span className="shrink-0 text-right text-sm font-extrabold">
                <PriceTag c={c} />
                <span className="block text-xs opacity-60">{c.players}</span>
              </span>
              {c.access !== "locked" && <Icon name="arrow" className="size-5 shrink-0" />}
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-5 rounded-2xl border-[3px] border-ink bg-night/60 p-4">
            <p className="flex items-center gap-2 font-display text-xl text-cream">
              <Icon name="lock" /> Unlock {selected.title}
            </p>
            <p className="mt-1 text-sm font-semibold text-cream/75">
              One purchase, yours to host as often as you like. Everyone you invite plays free.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <BuyButton id={selected.id} label={`Buy ${selected.title} · ${selected.price}`} signedIn={signedIn} />
              {offer && offer.caseTitles.includes(selected.title) && (
                <span className="text-sm font-bold text-cream/70">
                  or all {offer.caseTitles.length} for {offer.price} below
                </span>
              )}
            </div>
          </div>
        )}
      </Panel>

      {offer && (
        <Panel>
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-mustard text-ink">
              <Icon name="star" filled />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl text-cream">{offer.title}</span>
              <span className="block text-sm font-semibold text-cream/75">{offer.caseTitles.join(" · ")}</span>
              {offer.saving && <span className="mt-1 inline-block rounded-full bg-teal px-2 py-0.5 text-xs font-black text-ink">Save {offer.saving}</span>}
            </span>
            <BuyButton id={offer.id} label={`Get all ${offer.caseTitles.length} · ${offer.price}`} signedIn={signedIn} variant="secondary" />
          </div>
        </Panel>
      )}

      <Panel title="Got a code?" id="join">
        <form onSubmit={joinByCode} className="flex gap-2">
          <label className="sr-only" htmlFor="room-code">
            Room code
          </label>
          <input
            id="room-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            placeholder="ABCD"
            autoCapitalize="characters"
            className={`${field} min-w-0 flex-1 font-display tracking-[0.3em] uppercase`}
          />
          <Button type="submit" variant="secondary" disabled={!code.trim()}>
            Join
          </Button>
        </form>
        <p className="mt-3 text-sm font-semibold text-cream/60">Joining is always free, whatever the case.</p>
      </Panel>
    </div>
  );
}
