"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { IncomingMessage } from "@/components/hero/IncomingMessage";
import { ButtonLink } from "@/components/ui/Button";
import { night, type ClueId, type NightEvent } from "@/data/night";
import { suspects, type SuspectId } from "@/data/suspects";
import { brandArt, propArt, sceneArt, suspectArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import "./night.css";

type Phase = "arrival" | "timeline" | "blackout" | "lights";

/** Scroll progress → seconds after 9:00 PM. The blackout minute gets a long stretch of scroll. */
const CLOCK: [progress: number, seconds: number][] = [
  [0, 0],
  [0.08, 60],
  [0.58, 17 * 60],
  [0.82, 18 * 60],
  [1, 18 * 60 + 30],
];

function secondsAt(progress: number) {
  for (let i = 1; i < CLOCK.length; i++) {
    const [p1, s1] = CLOCK[i];
    if (progress <= p1) {
      const [p0, s0] = CLOCK[i - 1];
      return s0 + ((progress - p0) / (p1 - p0)) * (s1 - s0);
    }
  }
  return CLOCK[CLOCK.length - 1][1];
}

function phaseAt(seconds: number): Phase {
  if (seconds < 60) return "arrival";
  if (seconds < 17 * 60) return "timeline";
  if (seconds < 18 * 60) return "blackout";
  return "lights";
}

const pad = (n: number) => String(n).padStart(2, "0");
const formatClock = (seconds: number) => `9:${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)} PM`;
const formatMinute = (minute: number) => `9:${pad(minute)} PM`;

function eventAt(minute: number) {
  let current: NightEvent | undefined;
  for (const event of night.events) if (event.minute <= minute) current = event;
  return current;
}

const CLUE_IDS = Object.keys(night.clues) as ClueId[];

const prefersReducedMotion =() => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fixed star field: [left %, top %, size px, twinkle delay s]. */
const stars = Array.from({ length: 34 }, (_, i) => {
  const r = (n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  // One decimal place, so the server and browser print identical styles.
  const round = (v: number) => Math.round(v * 10) / 10;
  return [round(r(1) * 100), round(r(2) * 50), round(1.5 + r(3) * 2.5), round(r(4) * -3)] as const;
});

function Backdrop() {
  return (
    <div aria-hidden className="absolute inset-0">
      <Image src={sceneArt.sky} alt="" fill priority sizes="100vw" className="object-cover" />
      {stars.map(([left, top, size, delay], i) => (
        <span
          key={i}
          className="night-star"
          style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${delay}s` }}
        />
      ))}
      <Image
        src={sceneArt.moon}
        alt=""
        priority
        sizes="300px"
        className="absolute top-[9%] right-[5%] w-[clamp(110px,17vw,280px)] animate-float"
      />
      <Image
        src={sceneArt.cloudA}
        alt=""
        sizes="430px"
        className="absolute top-[24%] right-[2%] w-[clamp(160px,26vw,420px)] animate-drift"
      />
      <Image
        src={sceneArt.cloudB}
        alt=""
        sizes="280px"
        className="absolute top-[12%] left-[38%] hidden w-[clamp(120px,17vw,280px)] animate-drift [animation-delay:-6s] md:block"
      />
      <div className="absolute inset-x-0 bottom-0 aspect-[1600/560] min-h-[300px]">
        <Image src={sceneArt.cityBack} alt="" fill sizes="100vw" className="object-cover object-bottom" />
      </div>
      <div className="absolute inset-x-0 bottom-0 aspect-[1600/460] min-h-[230px]">
        <Image src={sceneArt.cityFront} alt="" fill priority sizes="100vw" className="object-cover object-bottom" />
      </div>
      <div className="night-car" />
    </div>
  );
}

/** Row of four equal slots along the street; used for the suspects and, above the dark, their lines. */
function StreetRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cx(
        "absolute inset-x-0 bottom-[clamp(10px,1.4vw,22px)] flex items-end justify-center [--w:clamp(74px,11vw,170px)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type Line = { text: string; kind: "say" | "whisper"; delay?: number };

export function NightLanding() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lightRef = useRef<HTMLDivElement>(null);
  const lastAim = useRef(-Infinity);

  const [seconds, setSeconds] = useState(0);
  const [poked, setPoked] = useState<SuspectId | null>(null);
  const [rushed, setRushed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [found, setFound] = useState<ClueId[]>([]);

  const phase = phaseAt(seconds);
  const event = phase === "timeline" ? eventAt(Math.floor(seconds / 60)) : undefined;
  const ziplineAt =
    seconds >= night.zipline.from && seconds < night.zipline.to
      ? (seconds - night.zipline.from) / (night.zipline.to - night.zipline.from)
      : null;

  // Scroll drives the clock. Flinging through the timeline makes a suspect complain.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let rushCooldown = 0;
    const update = () => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight)));
      const secs = Math.floor(secondsAt(progress));
      setSeconds(secs);

      const now = performance.now();
      const speed = Math.abs(window.scrollY - lastY) / Math.max(16, now - lastT);
      lastY = window.scrollY;
      lastT = now;
      if (speed > 3.5 && now > rushCooldown && phaseAt(secs) === "timeline") {
        rushCooldown = now + 12000;
        setRushed(true);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // A text arrives if the visitor goes quiet; another if they happen to visit at 9:17 PM.
  useEffect(() => {
    const now = new Date();
    if (now.getHours() === 21 && now.getMinutes() >= 15 && now.getMinutes() <= 19) setToast(night.sameTime);

    let timer = 0;
    let shown = false;
    const arm = () => {
      window.clearTimeout(timer);
      if (!shown)
        timer = window.setTimeout(() => {
          shown = true;
          setToast(night.idle);
        }, 12000);
    };
    arm();
    const events = ["scroll", "pointerdown", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, arm, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!rushed) return;
    const timer = window.setTimeout(() => setRushed(false), 2400);
    return () => window.clearTimeout(timer);
  }, [rushed]);

  useEffect(() => {
    if (!poked) return;
    const timer = window.setTimeout(() => setPoked(null), 1800);
    return () => window.clearTimeout(timer);
  }, [poked]);

  // In the dark, the flashlight drifts around on its own until the visitor takes it.
  useEffect(() => {
    if (phase !== "blackout" || prefersReducedMotion()) return;
    let frame = 0;
    const loop = (t: number) => {
      frame = requestAnimationFrame(loop);
      const stage = stageRef.current;
      if (!stage || performance.now() - lastAim.current < 2200) return;
      const x = stage.clientWidth * (0.5 + 0.4 * Math.sin(t / 2100));
      const y = stage.clientHeight * (0.66 + 0.16 * Math.sin(t / 1300 + 1));
      lightRef.current?.style.setProperty("--fx", `${x}px`);
      lightRef.current?.style.setProperty("--fy", `${y}px`);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  /** Points the flashlight and makes the suspects lean towards the visitor. */
  const aim = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = clientX - rect.left;
    stage.style.setProperty("--px", ((x / rect.width) * 2 - 1).toFixed(3));
    lightRef.current?.style.setProperty("--fx", `${x}px`);
    lightRef.current?.style.setProperty("--fy", `${clientY - rect.top}px`);
    lastAim.current = performance.now();
  };

  const findClue = (id: ClueId) => {
    if (found.includes(id)) return;
    const next = [...found, id];
    setFound(next);
    setToast(`Clue ${next.length}/${CLUE_IDS.length}: ${night.clues[id].found}`);
  };

  /** Event text, with the tappable phrase for the "bus" clue when the event has one. */
  const eventText = ({ text, cluePhrase }: NightEvent) => {
    if (!cluePhrase) return text;
    const [before, after] = text.split(cluePhrase);
    return (
      <>
        {before}
        <span
          role="button"
          tabIndex={0}
          title={night.clues.bus.label}
          onClick={() => findClue("bus")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && findClue("bus")}
          className={cx(
            "cursor-pointer rounded decoration-coral decoration-dotted decoration-2 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none",
            found.includes("bus") && "bg-mustard/60 px-0.5 line-through",
          )}
        >
          {cluePhrase}
        </span>
        {after}
      </>
    );
  };

  const lineFor = (id: SuspectId, i: number): Line | null => {
    if (poked === id) return { text: night.pokes[id], kind: "say" };
    if (rushed && id === "square") return { text: night.rushed, kind: "say" };
    if (phase === "blackout") return { text: night.blackout.whispers[id], kind: "whisper", delay: 0.9 + i * 1.1 };
    return null;
  };

  return (
    <>
      <div ref={trackRef} className="relative h-[700svh]">
        <div
          ref={stageRef}
          className="sticky top-0 h-[100svh] overflow-hidden"
          onPointerMove={(e: ReactPointerEvent) => aim(e.clientX, e.clientY)}
          onTouchStart={(e) => aim(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => aim(e.touches[0].clientX, e.touches[0].clientY)}
        >
          <Backdrop />

          {/* The suspects, under the dark */}
          <StreetRow className="z-10">
            {suspects.map((s, i) => {
              const active = event?.suspect === s.id;
              const dimmed = event?.suspect !== undefined && !active;
              const shocked = phase === "lights" || poked === s.id;
              return (
                <div
                  key={s.id}
                  className={cx(
                    "relative isolate -mx-1 mb-[calc(var(--w)*-0.1)] aspect-[5/7] w-(--w) transition-[scale,translate,filter] duration-500",
                    active && "-translate-y-3 scale-110",
                    dimmed && "brightness-50 saturate-50",
                  )}
                >
                  {s.id === "rectangle" && (
                    <div aria-hidden className={cx("night-lamp", phase !== "blackout" && "is-lit")}>
                      <span className="night-lamp-head" />
                      <span className="night-lamp-cone" />
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={`Poke ${s.name}`}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setPoked(s.id)}
                    onClick={() => setPoked(s.id)}
                    className="block size-full origin-bottom cursor-pointer transition-[rotate] duration-300 focus-visible:outline-none"
                    style={{ rotate: "calc(var(--px, 0) * 5deg)" }}
                  >
                    <Image
                      src={suspectArt[s.id][shocked ? "shocked" : "idle"]}
                      alt=""
                      sizes="170px"
                      priority
                      className="animate-bob"
                      style={{ animationDelay: `${i * -0.8}s` }}
                    />
                  </button>
                </div>
              );
            })}
          </StreetRow>

          {/* Clue: a round shadow slides along a zipline as the clock runs through 9:10–9:12 */}
          {ziplineAt !== null && (
            <div className="absolute inset-x-0 top-[60%] z-[15] -rotate-3 sm:top-1/2">
              <div aria-hidden className="h-0.5 bg-cream/40" />
              <button
                type="button"
                aria-label={night.clues.zipline.label}
                onClick={() => findClue("zipline")}
                className={cx(
                  "absolute top-0 w-[clamp(36px,3.6vw,54px)] -translate-x-1/2 cursor-pointer transition-[left] duration-150 ease-linear",
                  found.includes("zipline") && "night-clue",
                )}
                style={{ left: `${92 - ziplineAt * 84}%` }}
              >
                <span aria-hidden className="mx-auto block h-3 w-0.5 bg-cream/40" />
                <Image
                  src={suspectArt.circle.idle}
                  alt=""
                  sizes="54px"
                  className="brightness-0 drop-shadow-[0_0_6px_rgb(155_135_245_/_0.8)]"
                />
              </button>
            </div>
          )}

          {/* Clue: the keycard only exists in the dark */}
          {phase === "blackout" && !found.includes("keycard") && (
            <button
              type="button"
              aria-label={night.clues.keycard.label}
              onClick={() => findClue("keycard")}
              className="night-clue absolute right-[4%] bottom-[clamp(26px,4vw,60px)] z-[15] w-[clamp(40px,4.5vw,64px)] -rotate-[18deg] cursor-pointer"
            >
              <Image src={propArt.keycard} alt="" sizes="64px" />
            </button>
          )}

          <div
            ref={lightRef}
            aria-hidden
            className={cx(
              "night-dark pointer-events-none absolute inset-0 z-20",
              phase === "blackout" && "is-off",
              phase === "lights" && "is-on",
            )}
          />

          {/* What the suspects say, above the dark */}
          <StreetRow className="pointer-events-none z-[25]">
            {phase === "arrival" && (
              <p className="absolute bottom-[calc(var(--w)*1.45)] left-1/2 -translate-x-1/2 -rotate-3 animate-pop-in rounded-2xl border-[3px] border-ink bg-cream px-4 py-2 font-display text-lg whitespace-nowrap text-ink shadow-pop-sm [animation-delay:1.8s]">
                {night.arrival.bubble}
              </p>
            )}
            {suspects.map((s, i) => {
              const line = lineFor(s.id, i);
              return (
                <div key={s.id} className="relative -mx-1 aspect-[5/7] w-(--w)">
                  {line && (
                    <p
                      key={line.text}
                      className={cx(
                        "absolute left-1/2 w-max max-w-[calc(var(--w)*1.7)] -translate-x-1/2 text-center leading-tight",
                        line.kind === "say"
                          ? "bottom-[102%] animate-pop-in rounded-2xl border-[3px] border-ink bg-cream px-3 py-1.5 font-display text-sm text-ink shadow-pop-sm sm:text-base"
                          : cx(
                              "night-whisper text-sm font-extrabold text-cream/85 italic sm:text-base",
                              i % 2 ? "bottom-[150%]" : "bottom-[100%]",
                            ),
                      )}
                      style={line.delay ? { animationDelay: `${line.delay}s` } : undefined}
                    >
                      {line.text}
                    </p>
                  )}
                </div>
              );
            })}
          </StreetRow>

          <header className="absolute inset-x-0 top-0 z-40">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
              <Link href="/" className="flex shrink-0 items-center gap-2">
                <Image src={brandArt.logo} alt="One More Clue" sizes="48px" priority className="size-10 sm:size-12" />
                <span className="font-display text-2xl text-cream text-pop max-lg:hidden">One More Clue</span>
              </Link>
              <p
                role="timer"
                aria-label="Time on Mercer Street"
                className={cx(
                  "min-w-[8.6em] rounded-full border-[3px] border-ink bg-dusk px-3 py-1 text-center font-display text-base tracking-wide tabular-nums shadow-pop-sm transition-colors sm:text-lg",
                  phase === "blackout" ? "text-coral" : "text-cream",
                )}
              >
                {formatClock(seconds)}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {found.length > 0 && (
                  <span
                    className="flex animate-pop-in items-center gap-1 rounded-full border-[3px] border-ink bg-cream py-0.5 pr-2.5 pl-1 font-display text-ink"
                    title="Clues found"
                  >
                    <Image src={propArt.magnifier} alt="Clues found:" sizes="28px" className="size-7" />
                    {found.length}/{CLUE_IDS.length}
                  </span>
                )}
                <ButtonLink href="/play" className="px-4 py-1.5 text-base max-sm:hidden">
                  Notify me
                </ButtonLink>
              </div>
            </div>
          </header>

          {/* Only the content itself takes clicks, so the zipline stays catchable beside it */}
          <div className="pointer-events-none relative z-30 mx-auto max-w-6xl px-4 pt-24 *:pointer-events-auto sm:px-6 sm:pt-28">
            {phase === "arrival" && (
              <div className="max-w-xl">
                <IncomingMessage {...night.arrival.message} />
                <h1 className="mt-5 font-display text-[clamp(3.25rem,10vw,6.5rem)] leading-[0.88] text-cream text-pop">
                  One More <span className="text-mustard">Clue</span>
                </h1>
                <p className="mt-4 max-w-md text-lg leading-relaxed font-semibold text-cream/90 [text-shadow:0_2px_8px_var(--color-night)]">
                  {night.arrival.pitch}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <ButtonLink href="/play">{night.arrival.cta}</ButtonLink>
                  <p className="flex items-center gap-2 font-bold text-cream/80">
                    <span aria-hidden className="inline-block animate-bob text-xl">↓</span>
                    {night.arrival.scrollHint}
                  </p>
                </div>
              </div>
            )}

            {event && (
              <div className="max-w-md">
                <p className="font-extrabold tracking-widest text-mustard uppercase [text-shadow:0_2px_8px_var(--color-night)]">
                  {night.eyebrow}
                </p>
                <article
                  key={event.minute}
                  className="mt-3 -rotate-1 animate-pop-in rounded-3xl border-[3px] border-ink bg-cream p-5 text-ink shadow-card"
                >
                  <p className="font-display text-xl text-coral">{formatMinute(event.minute)}</p>
                  <p className="mt-1 text-lg leading-snug font-bold sm:text-xl">{eventText(event)}</p>
                  {event.evidence.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {event.evidence.map((item) => (
                        <li
                          key={item.label}
                          className="flex items-center gap-2 rounded-2xl border-2 border-ink/15 bg-white py-1 pr-3 pl-1"
                        >
                          <Image src={propArt[item.prop]} alt="" sizes="36px" className="size-9" />
                          <span className="text-sm font-extrabold">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </div>
            )}

            {phase === "blackout" && (
              <div className="mt-[6vh] text-center">
                <p className="animate-pop-in font-display text-[clamp(2.75rem,9vw,5.5rem)] leading-none text-cream text-pop">
                  {night.blackout.title}
                </p>
                <p className="mx-auto mt-4 max-w-sm font-bold text-cream/75">
                  <span className="pointer-coarse:hidden">{night.blackout.fine}</span>
                  <span className="hidden pointer-coarse:inline">{night.blackout.coarse}</span>
                </p>
              </div>
            )}

            {phase === "lights" && (
              <div className="max-w-2xl animate-pop-in [animation-delay:0.6s]">
                <p className="inline-block -rotate-2 rounded-full border-[3px] border-ink bg-mustard px-4 py-1 text-sm font-extrabold tracking-widest text-ink uppercase">
                  {night.lights.eyebrow}
                </p>
                <h2 className="mt-4 font-display text-[clamp(2.75rem,8.5vw,6rem)] leading-[0.9] text-cream text-pop">
                  {night.lights.title}
                </h2>
                <p className="mt-4 max-w-md text-lg leading-relaxed font-semibold text-cream/90 [text-shadow:0_2px_8px_var(--color-night)]">
                  {night.lights.text}
                </p>
                <div className="mt-5 flex flex-wrap gap-3 max-sm:*:px-5 max-sm:*:py-2.5 max-sm:*:text-base">
                  <ButtonLink href="/#mini-case">{night.lights.primary}</ButtonLink>
                  <ButtonLink href="/play" variant="secondary">
                    {night.lights.secondary}
                  </ButtonLink>
                </div>
                <div className="mt-4 text-sm font-bold text-cream/80 [text-shadow:0_2px_8px_var(--color-night)]">
                  {found.length === CLUE_IDS.length ? (
                    <p className="text-mustard">{night.lights.complete}</p>
                  ) : (
                    // One hint at a time: the next clue still missing.
                    <p className="flex items-start gap-2">
                      <Image src={propArt.magnifier} alt="" sizes="20px" className="size-5 shrink-0" />
                      <span>
                        {found.length} of {CLUE_IDS.length} {night.lights.progress}{" "}
                        <span className="text-mustard">{night.clues[CLUE_IDS.find((id) => !found.includes(id))!].hint}</span>
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {toast && (
            <div
              key={toast}
              role="status"
              className="absolute top-20 right-4 z-40 flex max-w-[min(20rem,calc(100%-2rem))] animate-pop-in items-start gap-3 rounded-2xl border-[3px] border-ink bg-dusk p-3 shadow-card sm:top-24 sm:right-6"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-coral font-display text-cream">
                ?
              </span>
              <p className="text-sm leading-snug font-bold text-cream">{toast}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="bg-night px-4 py-10 text-center text-sm font-bold text-cream/60">
        Prototype of the &ldquo;One Night&rdquo; landing page.{" "}
        <Link href="/" className="text-mustard underline underline-offset-4 hover:text-cream">
          See the current page
        </Link>
      </footer>
    </>
  );
}
