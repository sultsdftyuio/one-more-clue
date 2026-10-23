import Image from "next/image";
import type { ReactNode } from "react";
import { propArt, sceneArt } from "@/lib/art";

type Props = { eyebrow: string; title: string; children: ReactNode };

/** Night-sky backdrop with a cream case-file card in the middle. */
export function AuthShell({ eyebrow, title, children }: Props) {
  return (
    <section className="relative isolate grid min-h-[100svh] place-items-center overflow-hidden px-4 py-28">
      <Image src={sceneArt.sky} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
      <div className="relative w-full max-w-md">
        <Image
          src={propArt.magnifier}
          alt=""
          sizes="112px"
          className="absolute -top-14 -right-6 z-10 w-24 rotate-12 animate-float sm:-right-12 sm:w-28"
        />
        <div className="-rotate-1 rounded-3xl border-[3px] border-ink bg-cream p-6 text-ink shadow-card sm:p-8">
          <p className="inline-block rounded-full border-2 border-ink bg-mustard px-3 py-0.5 text-xs font-extrabold tracking-widest uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-none sm:text-5xl">{title}</h1>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
