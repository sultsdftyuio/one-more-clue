import Image from "next/image";
import type { PlayerView, PublicPlayer } from "@/lib/game/engine";
import type { CaseSuspect } from "@/lib/game/types";
import type { SuspectId } from "@/data/suspects";
import { suspectArt } from "@/lib/art";
import { cx } from "@/lib/cx";

export const nameOf = (view: PlayerView, playerId: string) =>
  playerId === view.me.id ? "You" : (view.players.find((p) => p.id === playerId)?.name ?? "Someone who left");

export const roleNames = (view: PlayerView, roleIds: string[]) =>
  roleIds.map((id) => view.case.roles.find((r) => r.id === id)?.name ?? id);

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

export function PlayerRow({ player, children }: { player: PublicPlayer; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-cream px-3 py-2 text-ink">
      <span
        aria-label={player.online ? "online" : "offline"}
        className={cx("size-3 shrink-0 rounded-full border-2 border-ink", player.online ? "bg-teal" : "bg-ink/20")}
      />
      <span className="min-w-0 flex-1 truncate font-extrabold">
        {player.name}
        {player.isHost && <span className="ml-2 rounded-full bg-mustard px-2 py-0.5 text-xs">Host</span>}
      </span>
      {children}
    </li>
  );
}

/** Small panel used across the game screens. */
export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-3xl border-[3px] border-ink bg-dusk p-4 shadow-card sm:p-6", className)}>
      {title && <h2 className="mb-4 font-display text-2xl text-cream">{title}</h2>}
      {children}
    </section>
  );
}
