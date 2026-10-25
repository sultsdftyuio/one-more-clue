import Image from "next/image";
import { Magnetic } from "@/components/fx/Magnetic";
import { Reveal } from "@/components/fx/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { ShareButton } from "@/components/ui/ShareButton";
import { brandArt, propArt } from "@/lib/art";
import { playCta } from "@/lib/game-open";
import { GatherLineup } from "./FinalCtaMotion";

export function FinalCta() {
  const cta = playCta();
  return (
    <section className="relative isolate overflow-hidden bg-mustard px-4 py-20 text-center text-ink sm:px-6 sm:py-24">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 animate-drift opacity-30 mix-blend-multiply"
        style={{ backgroundImage: `url(${brandArt.confetti.src})`, backgroundSize: "500px" }}
      />
      <Image src={propArt.magnifier} alt="" sizes="160px" className="mx-auto w-32 -rotate-12 animate-float sm:w-40" />
      <Reveal>
        <h2 className="mt-4 font-display text-5xl leading-none sm:text-7xl">Gather your group.</h2>
        <p className="mx-auto mt-5 max-w-lg text-xl font-bold">One link. Up to six detectives. See who spots the lie first.</p>
      </Reveal>
      <GatherLineup />
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Magnetic strength={0.35}>
          <ButtonLink href={cta.href} variant="coral">
            {cta.label}
          </ButtonLink>
        </Magnetic>
        <Magnetic strength={0.35}>
          <ShareButton message="Bet you can't spot the liar before me." />
        </Magnetic>
      </div>
    </section>
  );
}
