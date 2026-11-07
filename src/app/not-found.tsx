import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { brandArt, propArt, sceneArt } from "@/lib/art";
import { gameOpen, playCta } from "@/lib/game-open";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

/** Any unknown address: a missing case file, with a way back to the game. */
export default function NotFound() {
  const cta = playCta();
  return (
    <main className="relative isolate grid min-h-[100svh] place-items-center overflow-hidden px-4 py-28">
      <Image src={sceneArt.sky} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />

      <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 sm:left-6">
        <Image src={brandArt.logo} alt="" sizes="48px" priority className="size-11 sm:size-12" />
        <span className="font-display text-2xl text-cream text-pop">One More Clue</span>
      </Link>

      <div className="w-full max-w-xl min-w-0 text-center">
        <Image src={propArt.magnifier} alt="" priority sizes="192px" className="mx-auto w-36 -rotate-12 animate-float sm:w-44" />
        <p className="mt-6 inline-block -rotate-2 rounded-full border-[3px] border-ink bg-mustard px-4 py-1 text-sm font-extrabold tracking-widest text-ink uppercase">
          Error 404 · File missing
        </p>
        <h1 className="mt-5 font-display text-5xl leading-none text-cream text-pop sm:text-6xl">This page has vanished.</h1>
        <p className="mt-5 text-lg leading-relaxed font-semibold text-cream/85">
          We searched the whole street and found nothing at this address. The link may be mistyped, or the page has moved.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href={cta.href}>{cta.label}</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back to the start
          </ButtonLink>
        </div>

        {gameOpen() && (
          <p className="mt-8 font-bold text-cream/80">
            Got a room code from a friend?{" "}
            <Link href="/host#join" className="text-mustard underline decoration-2 underline-offset-4 hover:text-cream">
              Join their game
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
