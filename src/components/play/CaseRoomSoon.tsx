import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { propArt, sceneArt } from "@/lib/art";

/** Placeholder for the game itself until Case 001 ships. */
export function CaseRoomSoon() {
  return (
    <section className="relative isolate grid min-h-[100svh] place-items-center overflow-hidden px-4 py-28 text-center">
      <Image src={sceneArt.sky} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />
      <div className="max-w-xl">
        <Image src={propArt.phone} alt="" priority sizes="208px" className="mx-auto w-44 -rotate-6 animate-float sm:w-52" />
        <p className="mt-6 inline-block -rotate-2 rounded-full border-[3px] border-ink bg-mustard px-4 py-1 text-sm font-extrabold tracking-widest text-ink uppercase">
          Case 001 · The Last Message
        </p>
        <h1 className="mt-5 font-display text-5xl leading-none text-cream text-pop sm:text-6xl">
          The case room is almost ready
        </h1>
        <p className="mt-5 text-lg leading-relaxed font-semibold text-cream/85">
          Case 001 is in final playtesting. The suspects are still rehearsing their alibis. Until then,
          the 30-second warm-up is open.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/#mini-case">Try the warm-up</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back to the street
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
