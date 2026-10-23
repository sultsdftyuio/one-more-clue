import Image from "next/image";
import type { ReactNode } from "react";
import type { PublicPlayer } from "@/lib/game/engine";
import type { CaseSuspect } from "@/lib/game/types";
import type { SuspectId } from "@/data/suspects";
import { suspectArt } from "@/lib/art";
import { cx } from "@/lib/cx";

/** A suspect's portrait, when the case uses one of the house characters. */
export function SuspectPortrait({ suspect, shocked, className }: { suspect: CaseSuspect; shocked?: boolean; className?: string }) {
  const art = suspect.art && suspect.art in suspectArt ? suspectArt[suspect.art as SuspectId] : null;
  if (!art) {
    return (
      <span className={cx("grid aspect-[5/7] place-items-center rounded-2xl bg-dusk font-display text-3xl text-cream", className)}>
        {suspect.name[0]}
      </span>
    );
  }
  return <Image src={shocked ? art.shocked : art.idle} alt="" sizes="160px" className={className} />;
}

const AVATAR_TONES = ["bg-coral text-cream", "bg-teal text-ink", "bg-mustard text-ink", "bg-lilac text-ink", "bg-cream text-ink", "bg-moon text-ink"];

/** A player's initial in a coloured circle, with an online dot and a glow while they talk. */
export function Avatar({
  name,
  index,
  online,
  speaking,
  size = "md",
}: {
  name: string;
  index: number;
  online?: boolean;
  speaking?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cx(
        "relative grid shrink-0 place-items-center rounded-full border-[3px] border-ink font-display transition-shadow",
        AVATAR_TONES[index % AVATAR_TONES.length],
        size === "sm" ? "size-8 text-sm" : "size-10 text-lg",
        speaking && "shadow-[0_0_0_3px_var(--color-teal),0_0_14px_4px_rgb(63_184_175_/_0.7)]",
      )}
    >
      {name.replace(/^Bot\s+/, "")[0]?.toUpperCase()}
      {online !== undefined && (
        <span className={cx("absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-ink", online ? "bg-teal" : "bg-ink/40")} />
      )}
    </span>
  );
}

export function PlayerRow({ player, index, speaking, children }: { player: PublicPlayer; index: number; speaking?: boolean; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-cream px-3 py-2 text-ink">
      <Avatar name={player.name} index={index} online={player.online} speaking={speaking} />
      <span className="min-w-0 flex-1 truncate font-extrabold">
        {player.name}
        {player.isHost && <span className="ml-2 rounded-full bg-mustard px-2 py-0.5 text-xs">Host</span>}
        {player.bot && <span className="ml-2 rounded-full bg-lilac px-2 py-0.5 text-xs">Bot</span>}
      </span>
      {children}
    </li>
  );
}

/** Small panel used across the game screens. */
export function Panel({ title, children, className, id }: { title?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cx("rounded-3xl border-[3px] border-ink bg-dusk p-4 shadow-card sm:p-6", className)}>
      {title && <h2 className="mb-4 font-display text-2xl text-cream">{title}</h2>}
      {children}
    </section>
  );
}
