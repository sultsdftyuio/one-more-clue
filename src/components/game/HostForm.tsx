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
    <div className="theatre relative min-h-[100svh] overflow-hidden">
      {/* On a laptop the trailer sits in a frame, and a soft copy of the poster fills the room. */}
      {poster && (
        <div aria-hidden className="absolute inset-0 hidden md:block">
          <Image src={poster} alt="" fill sizes="100vw" className="scale-110 object-cover opacity-25 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d12]/40 via-[#0b0d12]/70 to-[#0b0d12]" />
        </div>
      )}

      <div className="relative mx-auto min-h-[100svh] max-w-md md:max-w-6xl md:px-8 md:pb-10">
        <header className="relative z-[1] flex items-center justify-between px-5 pt-4 md:px-0 md:pt-6">
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

        <div className="md:mt-8 md:grid md:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] md:items-center md:gap-14">
          {/* The trailer: full screen behind everything on a phone, a tall frame on a laptop. */}
          <div
            className="absolute inset-0 touch-pan-y md:relative md:inset-auto md:aspect-[9/16] md:h-[min(78svh,42rem)] md:justify-self-center md:overflow-hidden md:rounded-3xl md:shadow-[0_30px_80px_rgb(0_0_0_/_0.6)] md:ring-1 md:ring-white/10"
            onPointerDown={down}
            onPointerUp={up}
            onPointerCancel={() => (swipe.current = null)}
          >
            {poster && <Image src={poster} alt="" fill priority sizes="(min-width: 768px) 384px, 448px" className="object-cover opacity-70" />}
            {video && <video key={video} ref={film} src={video} poster={poster?.src} loop playsInline preload="auto" aria-hidden className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0b0d12]/85 to-transparent md:hidden" />
            <div className="absolute inset-x-0 top-[34%] bottom-0 bg-gradient-to-b from-transparent via-[#0b0d12]/90 via-30% to-[#0b0d12] to-60% md:hidden" />
            {video && (
              <button
                type="button"
                onClick={() => setSound((on) => !on)}
                aria-pressed={sound}
                aria-label={sound ? "Mute the trailer" : "Play the trailer with sound"}
                className="absolute top-[4.6rem] right-4 grid size-11 place-items-center rounded-full bg-black/50 text-cream backdrop-blur hover:bg-black/70 md:top-4"
              >
                <Icon name={sound ? "speaker" : "speakerOff"} className="size-5" />
              </button>
            )}
          </div>

          {/* Over the trailer on a phone, so only its own boxes take taps (the rest swipes). */}
          <div className="pointer-events-none relative md:pointer-events-auto md:max-w-xl">
            <h1 className="mx-5 mt-2 inline-flex rounded-full bg-black/50 px-3 py-1 text-sm font-extrabold text-cream/85 backdrop-blur md:mx-0 md:mt-0">
              Now showing · {index + 1} of {frames.length}
            </h1>

            {notice && (
              <p role="status" className={cx("pointer-events-auto relative mx-4 mt-3 rounded-2xl md:mx-0 px-4 py-2.5 text-sm font-bold", notice.kind === "failed" ? "bg-coral text-cream" : "bg-teal text-ink")}>
                {notice.kind === "purchased" &&
                  (waiting ? `Thanks! Unlocking ${notice.itemTitle} now, this takes a few seconds…` : `Thanks! ${notice.itemTitle} is yours. Get your tickets.`)}
                {notice.kind === "owned" && `You already own ${notice.itemTitle}.`}
                {notice.kind === "failed" && "Checkout couldn't start. Nothing was charged. Try again in a moment."}
              </p>
            )}

            <div className="pointer-events-auto mt-[34svh] px-5 pb-28 md:mt-5 md:px-0 md:pb-0">
            {frame.kind === "case" ? (
              <>
                <p className="text-sm font-extrabold tracking-[0.12em] text-cream/70 uppercase">
                  {frame.c.code} · {statusOf(frame.c)}
                </p>
                <h2 className="mt-1 font-display text-4xl leading-tight text-cream text-pop md:text-6xl">{frame.c.title}</h2>
                <p className="mt-2 font-bold text-cream/85 md:text-lg">{frame.c.tagline}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[frame.c.players, `${frame.c.chapters} chapters`].map((t) => (
                    <span key={t} className="rounded-full bg-white/10 px-3 py-0.5 text-sm font-extrabold text-cream">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-5 md:max-w-sm">
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
                <h2 className="mt-1 font-display text-4xl leading-tight text-cream text-pop md:text-6xl">{frame.offer.title}</h2>
                <p className="mt-2 font-bold text-cream/85 md:text-lg">{frame.offer.caseTitles.join(" · ")}</p>
                <div className="mt-5 md:max-w-sm">
                  <BuyButton id={frame.offer.id} label={`Get all ${frame.offer.caseTitles.length} · ${frame.offer.price}`} signedIn={signedIn} back={back} />
                </div>
              </>
            )}
            </div>

            <nav
              aria-label="All cases"
              className="pointer-events-auto fixed inset-x-0 bottom-0 z-10 mx-auto max-w-md border-t border-white/10 bg-[#0b0d12]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:static md:mx-0 md:mt-10 md:max-w-none md:border-0 md:bg-transparent md:pb-0 md:backdrop-blur-none"
            >
              <p className="mb-3 hidden text-sm font-extrabold text-cream/60 md:block">All cases</p>
              <ul className="flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] md:flex-wrap md:gap-3 md:overflow-visible md:p-0">
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
                      className={cx("relative block h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-dusk md:h-28 md:w-20", on ? "ring-3 ring-mustard" : "opacity-80")}
                    >
                      {art ? (
                        <Image src={art} alt="" fill sizes="(min-width: 768px) 80px, 48px" className={cx("object-cover", !on && "brightness-75")} />
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
          </div>
        </div>
      </div>

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
