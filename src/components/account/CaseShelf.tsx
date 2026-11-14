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

/** Each case's own colour, as on the landing page's shelf. */
const accent: Record<string, string> = {
  noir: "bg-mustard",
  radio: "bg-coral",
  bistro: "bg-teal",
  frost: "bg-lilac",
};

const dot: Record<ShelfStatus, string> = {
  free: "bg-teal",
  owned: "bg-mustard",
  locked: "bg-cream/60",
  soon: "bg-cream/40",
};

type Props = { caseFile: CaseFile; status: ShelfStatus; refunded: boolean };

/** One case: its poster (which opens the trailer), what it is, and one button to play or unlock it. */
function CasePoster({ caseFile, status, refunded }: Props) {
  const paidCase = paidCaseById(caseFile.id);
  const poster = posterArt[caseFile.id];
  const playable = status === "free" || status === "owned";
  const label = status === "locked" && paidCase ? paidCase.price : accountCopy.status[status];

  return (
    <li className="flex min-w-0 flex-col">
      <Link
        href={`/host?case=${caseFile.id}`}
        aria-label={accountCopy.trailer(caseFile.title)}
        className="relative block aspect-[2/3] overflow-hidden rounded-2xl border-[3px] border-ink bg-dusk shadow-card transition-transform hover:-translate-y-1"
      >
        {poster ? (
          <Image src={poster} alt="" fill sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw" className="object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-gradient-to-b from-dusk to-night p-4 text-center font-display text-xl leading-tight text-cream">
            {caseFile.title}
          </span>
        )}
        <span
          className={cx(
            "absolute top-2.5 left-2.5 rounded-full border-2 border-ink px-2 py-0.5 text-[0.7rem] font-extrabold tracking-widest text-ink uppercase",
            accent[caseFile.theme ?? ""] ?? "bg-cream",
          )}
        >
          {caseFile.code}
        </span>
      </Link>
      <h3 className="mt-3 truncate font-display text-xl leading-tight text-cream">{caseFile.title}</h3>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-bold text-cream/70">
        <span className={cx("size-2 shrink-0 rounded-full", dot[status])} />
        {label}
        {refunded && status === "locked" && <span className="text-coral"> · {accountCopy.status.refunded}</span>}
      </p>
      {/* Buttons line up along the row even when one case has an extra line. */}
      <div className="mt-auto pt-3">
        {playable && (
          <Link href={`/new/${caseFile.id}`} className={buttonClass("primary", "w-full px-4 py-2 text-base")}>
            {accountCopy.play}
          </Link>
        )}
        {status === "locked" && paidCase && <BuyCaseButton paidCase={paidCase} label={accountCopy.unlock} buttonClassName="w-full px-4 py-2 text-base" />}
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
