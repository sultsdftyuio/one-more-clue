import Image from "next/image";
import Link from "next/link";
import { notify } from "@/data/notify";
import { propArt, sceneArt } from "@/lib/art";
import { NotifyForm } from "./NotifyForm";

/** Placeholder for the game itself until Case 001 ships: collects "notify me" signups. */
export function CaseRoomSoon({ source }: { source: string }) {
  return (
    <section className="relative isolate grid min-h-[100svh] place-items-center overflow-hidden px-4 py-28">
      <Image src={sceneArt.sky} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
      <div className="w-full max-w-xl min-w-0 text-center">
        <Image src={propArt.phone} alt="" priority sizes="208px" className="mx-auto w-40 -rotate-6 animate-float sm:w-48" />
        <p className="mt-6 inline-block -rotate-2 rounded-full border-[3px] border-ink bg-mustard px-4 py-1 text-sm font-extrabold tracking-widest text-ink uppercase">
          {notify.eyebrow}
        </p>
        <h1 className="mt-5 font-display text-5xl leading-none text-cream text-pop sm:text-6xl">{notify.title}</h1>
        <p className="mt-5 text-lg leading-relaxed font-semibold text-cream/85">{notify.intro}</p>

        <div className="mt-8 text-left">
          <NotifyForm source={source} />
        </div>

        <p className="mt-8 font-bold text-cream/80">
          Can&apos;t wait?{" "}
          <Link href="/#mini-case" className="text-mustard underline decoration-2 underline-offset-4 hover:text-cream">
            Try the 30-second warm-up
          </Link>
        </p>
      </div>
    </section>
  );
}
