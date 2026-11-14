import Image from "next/image";
import Link from "next/link";
import { BuyCaseButton } from "@/components/billing/BuyCaseButton";
import { buttonClass } from "@/components/ui/Button";
import { accountCopy } from "@/data/account";
import { paidCaseById, productIdFor } from "@/data/catalog";
import { posterArt } from "@/lib/art";
import { cx } from "@/lib/cx";
import type { CaseFile } from "@/lib/game/types";

export type ShelfStatus = "free" | "owned" | "locked" | "soon";

const dot: Record<ShelfStatus, string> = {
  free: "bg-teal",
  owned: "bg-mustard",
  locked: "bg-cream/50",
  soon: "bg-cream/30",
};

type Props = { caseFile: CaseFile; status: ShelfStatus; refunded: boolean };

/** One case: its poster (which opens the trailer), what it is, and one button to play or unlock it. */
function CasePoster({ caseFile, status, refunded }: Props) {
  const paidCase = paidCaseById(caseFile.id);
  const poster = posterArt[caseFile.id];
  const playable = status === "free" || status === "owned";
  const chip = status === "locked" && paidCase ? paidCase.price : accountCopy.status[status];

  return (
    <li className="flex min-w-0 flex-col">
      <Link
        href={`/host?case=${caseFile.id}`}
        aria-label={accountCopy.trailer(caseFile.title)}
        className="group relative block aspect-[2/3] overflow-hidden rounded-2xl bg-dusk ring-1 ring-white/10 transition-transform hover:-translate-y-1"
      >
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
            className={cx("object-cover transition-[filter] group-hover:brightness-110", !playable && "brightness-75")}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center p-4 text-center font-display text-xl leading-tight text-cream">{caseFile.title}</span>
        )}
        <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-xs font-extrabold text-cream backdrop-blur">
          <span className={cx("size-2 rounded-full", dot[status])} />
          {chip}
        </span>
      </Link>
      <h3 className="mt-3 truncate font-display text-xl leading-tight text-cream">{caseFile.title}</h3>
      <p className="text-sm font-bold text-cream/55">
        {caseFile.code} · {caseFile.minPlayers}–{caseFile.maxPlayers} players
        {refunded && status === "locked" && <span className="text-coral"> · {accountCopy.status.refunded}</span>}
      </p>
      {/* Buttons line up along the row even when one case has an extra line. */}
      <div className="mt-auto pt-3">
        {playable && (
          <Link href={`/new/${caseFile.id}`} className={buttonClass("primary", "w-full px-4 py-2 text-base")}>
            {accountCopy.play}
          </Link>
        )}
        {status === "locked" && paidCase && (
          <BuyCaseButton paidCase={paidCase} label="Unlock" variant="secondary" buttonClassName="w-full px-4 py-2 text-base" />
        )}
      </div>
    </li>
  );
}

export type ShelfCase = { caseFile: CaseFile; owned: boolean; refunded: boolean };

/** Every case as its poster: free and bought ones ready to play, the rest with a way to unlock them. */
export function CaseShelf({ items, selling }: { items: ShelfCase[]; selling: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
      {items.map(({ caseFile, owned, refunded }) => {
        const paidCase = paidCaseById(caseFile.id);
        const status: ShelfStatus = !paidCase ? "free" : owned ? "owned" : selling && productIdFor(paidCase) ? "locked" : "soon";
        return <CasePoster key={caseFile.id} caseFile={caseFile} status={status} refunded={refunded} />;
      })}
    </ul>
  );
}
