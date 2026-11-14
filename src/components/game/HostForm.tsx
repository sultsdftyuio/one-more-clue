"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { startCheckout } from "@/app/checkout/actions";
import { brandArt, posterArt, seasonArt } from "@/lib/art";
import type { CaseAccess } from "@/lib/billing/access";
import { buttonClass } from "@/components/ui/Button";
import { cx } from "@/lib/cx";
import "./theatre/theatre.css";
import { Icon } from "./ui/Icon";

export type CaseOption = {
  id: string;
  code: string;
  title: string;
  players: string;
  tagline: string;
  price: string | null;
  access: CaseAccess;
  chapters: number;
  /** The case's opening film, which plays here as its trailer. */
  video: string | null;
};

export type BundleOffer = { id: string; title: string; price: string; caseTitles: string[]; saving: string | null; owned: boolean };

/** A note at the top after coming back from checkout. */
export type Notice = { kind: "purchased" | "owned" | "failed"; itemTitle?: string } | null;

type Frame = { kind: "case"; c: CaseOption } | { kind: "pass"; offer: BundleOffer };

const cta = buttonClass("primary", "flex min-h-[52px] w-full text-xl");

/** Buying a case (or the pass) goes through checkout; signing in comes first, and brings you back to it. */
function BuyButton({ id, label, signedIn, back }: { id: string; label: string; signedIn: boolean; back: string }) {
  const cls = cta;
  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(back)}`} className={cls}>
        <Icon name="lock" className="size-5" /> Sign in to unlock
      </Link>
    );
  }
  return (
    <form action={startCheckout}>
      <input type="hidden" name="caseId" value={id} />
      <input type="hidden" name="returnTo" value="/host" />
      <button type="submit" className={cls}>
        <Icon name="lock" className="size-5" /> {label}
      </button>
    </form>
  );
}

function statusOf(c: CaseOption) {
  if (c.access === "free") return "Free tonight";
  if (c.access === "owned") return "Yours to host";
  if (c.access === "testing") return "Free while testing";
  return c.price ?? "Locked";
}

/**
 * Picking a case is walking past the trailers: each case's film plays full screen, a film
 * strip along the bottom switches cases, and the button buys tickets (or unlocks it).
 * Joining a friend's room by code sits behind "Have a code?".
 */
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
  const offer = bundles.find((b) => !b.owned);
  const frames: Frame[] = [...cases.map((c) => ({ kind: "case" as const, c })), ...(offer ? [{ kind: "pass" as const, offer }] : [])];
  const [index, setIndex] = useState(() => Math.max(0, cases.findIndex((c) => c.id === preselect)));
  const frame = frames[index] ?? frames[0];
  const [sound, setSound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");
  const film = useRef<HTMLVideoElement>(null);
  const swipe = useRef<number | null>(null);

  // The header's "Have a code?" links here as /host#join.
  useEffect(() => {
    if (window.location.hash === "#join") setJoining(true);
  }, []);

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

  const video = frame.kind === "case" ? frame.c.video : null;
  useEffect(() => {
    const el = film.current;
    if (!el) return;
    el.muted = !sound;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && !sound) return;
    el.play().catch(() => undefined);
  }, [video, sound]);

  const go = (step: number) => setIndex((i) => (i + step + frames.length) % frames.length);
  const down = (e: PointerEvent) => (swipe.current = e.clientX);
  const up = (e: PointerEvent) => {
    if (swipe.current === null) return;
    const dx = e.clientX - swipe.current;
    swipe.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };
  const joinByCode = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean) router.push(`/r/${clean}`);
  };

  const poster = frame.kind === "case" ? posterArt[frame.c.id] : seasonArt.season1;
  const back = frame.kind === "case" ? `/host?case=${frame.c.id}` : "/host";

  return (
    <div className="theatre relative mx-auto min-h-[100svh] max-w-md overflow-hidden">
      <div className="absolute inset-0 touch-pan-y" onPointerDown={down} onPointerUp={up} onPointerCancel={() => (swipe.current = null)}>
        {poster && <Image src={poster} alt="" fill priority sizes="448px" className="object-cover opacity-70" />}
        {video && <video key={video} ref={film} src={video} poster={poster?.src} loop playsInline preload="auto" aria-hidden className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0b0d12]/85 to-transparent" />
        <div className="absolute inset-x-0 top-[45%] bottom-0 bg-gradient-to-b from-transparent via-[#0b0d12]/90 via-35% to-[#0b0d12] to-70%" />
      </div>

      <header className="relative flex items-center justify-between px-5 pt-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg text-cream">
          <Image src={brandArt.logo} alt="" sizes="32px" className="size-8" /> One More Clue
        </Link>
        <div className="flex items-center gap-4 text-sm font-extrabold">
          {signedIn && (
            <Link href="/account" className="text-cream/80 hover:text-mustard">
              My cases
            </Link>
          )}
          <button type="button" onClick={() => setJoining(true)} className="min-h-[44px] text-cream hover:text-mustard">
            Have a code?
          </button>
        </div>
      </header>

      <h1 className="relative mx-5 mt-2 inline-flex rounded-full bg-black/50 px-3 py-1 text-sm font-extrabold text-cream/85 backdrop-blur">
        Now showing · {index + 1} of {frames.length}
      </h1>

      {notice && (
        <p role="status" className={cx("relative mx-4 mt-3 rounded-2xl px-4 py-2.5 text-sm font-bold", notice.kind === "failed" ? "bg-coral text-cream" : "bg-teal text-ink")}>
          {notice.kind === "purchased" &&
            (waiting ? `Thanks! Unlocking ${notice.itemTitle} now, this takes a few seconds…` : `Thanks! ${notice.itemTitle} is yours. Get your tickets.`)}
          {notice.kind === "owned" && `You already own ${notice.itemTitle}.`}
          {notice.kind === "failed" && "Checkout couldn't start. Nothing was charged. Try again in a moment."}
        </p>
      )}

      {video && (
        <button
          type="button"
          onClick={() => setSound((on) => !on)}
          aria-pressed={sound}
          aria-label={sound ? "Mute the trailer" : "Play the trailer with sound"}
          className="absolute top-[4.6rem] right-4 grid size-11 place-items-center rounded-full bg-black/50 text-cream backdrop-blur hover:bg-black/70"
        >
          <Icon name={sound ? "speaker" : "speakerOff"} className="size-5" />
        </button>
      )}

      <div className="relative mt-[34svh] px-5 pb-28">
        {frame.kind === "case" ? (
          <>
            <p className="text-sm font-extrabold tracking-[0.12em] text-cream/70 uppercase">
              {frame.c.code} · {statusOf(frame.c)}
            </p>
            <h2 className="mt-1 font-display text-4xl leading-tight text-cream text-pop">{frame.c.title}</h2>
            <p className="mt-2 font-bold text-cream/85">{frame.c.tagline}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[frame.c.players, `${frame.c.chapters} chapters`].map((t) => (
                <span key={t} className="rounded-full bg-white/10 px-3 py-0.5 text-sm font-extrabold text-cream">
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-5">
              {frame.c.access === "locked" ? (
                <>
                  <BuyButton id={frame.c.id} label={`Unlock · ${frame.c.price}`} signedIn={signedIn} back={back} />
                  <p className="mt-2.5 text-center text-xs font-bold text-cream/70">One purchase, host it as often as you like. Friends always join free.</p>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => router.push(`/new/${frame.c.id}`)} className={cta}>
                    Play this case <Icon name="arrow" className="size-5" />
                  </button>
                  <p className="mt-2.5 text-center text-xs font-bold text-cream/70">Opens your room, with a link to send your friends.</p>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-extrabold tracking-[0.12em] text-cream/70 uppercase">Season pass{frame.offer.saving ? ` · save ${frame.offer.saving}` : ""}</p>
            <h2 className="mt-1 font-display text-4xl leading-tight text-cream text-pop">{frame.offer.title}</h2>
            <p className="mt-2 font-bold text-cream/85">{frame.offer.caseTitles.join(" · ")}</p>
            <div className="mt-5">
              <BuyButton id={frame.offer.id} label={`Get all ${frame.offer.caseTitles.length} · ${frame.offer.price}`} signedIn={signedIn} back={back} />
            </div>
          </>
        )}
      </div>

      <nav aria-label="All cases" className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-white/10 bg-[#0b0d12]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none]">
          {frames.map((f, i) => {
            const on = i === index;
            const art = f.kind === "case" ? posterArt[f.c.id] : seasonArt.season1;
            const label = f.kind === "case" ? f.c.title : f.offer.title;
            const tag = f.kind === "case" ? (f.c.access === "locked" ? f.c.price : null) : f.offer.price;
            return (
              <li key={f.kind === "case" ? f.c.id : f.offer.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={label}
                  aria-current={on}
                  className={cx("relative block h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-dusk", on ? "ring-3 ring-mustard" : "opacity-80")}
                >
                  {art ? (
                    <Image src={art} alt="" fill sizes="48px" className={cx("object-cover", !on && "brightness-75")} />
                  ) : (
                    <span className="grid h-full place-items-center px-1 text-[0.6rem] leading-tight font-extrabold text-cream">{label}</span>
                  )}
                  {tag && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[0.65rem] font-extrabold text-cream">{tag}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {joining && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60" onClick={() => setJoining(false)}>
          <form
            id="join"
            onSubmit={joinByCode}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border-t-[3px] border-ink bg-dusk p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <label htmlFor="room-code" className="font-display text-2xl text-cream">
              Got a code?
            </label>
            <div className="mt-3 flex gap-2">
              <input
                id="room-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                placeholder="ABCD"
                autoCapitalize="characters"
                autoFocus
                className="min-w-0 flex-1 rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-display text-2xl tracking-[0.3em] text-ink uppercase outline-none focus:border-mustard"
              />
              <button type="submit" disabled={!code.trim()} className={buttonClass("secondary")}>
                Join
              </button>
            </div>
            <p className="mt-3 text-sm font-bold text-cream/65">Joining is always free, whatever the case.</p>
          </form>
        </div>
      )}
    </div>
  );
}
