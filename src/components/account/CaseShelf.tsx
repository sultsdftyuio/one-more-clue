import { BuyCaseButton } from "@/components/billing/BuyCaseButton";
import { ButtonLink } from "@/components/ui/Button";
import { accountCopy } from "@/data/account";
import { paidCaseById, productIdFor } from "@/data/catalog";
import type { CaseFile } from "@/lib/game/types";
import { cx } from "@/lib/cx";

export type ShelfStatus = "free" | "owned" | "locked" | "soon";

/** Each case's colour on the shelf, matching its in-game theme. */
const themeStrip: Record<string, string> = {
  noir: "bg-ink text-mustard",
  radio: "bg-coral text-cream",
  bistro: "bg-mustard text-ink",
  frost: "bg-teal text-ink",
};

const statusChip: Record<ShelfStatus, string> = {
  free: "bg-teal text-ink",
  owned: "bg-mustard text-ink",
  locked: "bg-cream-dk text-ink",
  soon: "bg-cream-dk text-ink/70",
};

type Props = { caseFile: CaseFile; status: ShelfStatus; refunded: boolean };

function CaseCard({ caseFile, status, refunded }: Props) {
  const paidCase = paidCaseById(caseFile.id);
  const playable = status === "free" || status === "owned";
  return (
    <li className="flex flex-col overflow-hidden rounded-3xl border-[3px] border-ink bg-cream text-ink shadow-card">
      <div className={cx("flex items-center justify-between gap-3 border-b-[3px] border-ink px-5 py-2.5", themeStrip[caseFile.theme ?? "noir"] ?? "bg-lilac text-ink")}>
        <span className="font-display text-lg tracking-wide">{caseFile.code}</span>
        <span className={cx("rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold tracking-wide uppercase", statusChip[status])}>
          {status === "locked" && paidCase ? `${accountCopy.status.locked} · ${paidCase.price}` : accountCopy.status[status]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-3xl leading-none">{caseFile.title}</h3>
        <p className="mt-2 flex-1 font-semibold text-ink/75">{caseFile.tagline}</p>
        <p className="mt-3 text-sm font-extrabold text-ink/55">
          {caseFile.minPlayers}–{caseFile.maxPlayers} players
          {refunded && status === "locked" && <span className="text-coral"> · {accountCopy.status.refunded}</span>}
        </p>
        <div className="mt-4">
          {playable && (
            <ButtonLink href="/host" className="w-full px-4 py-2 text-base">
              {accountCopy.host}
            </ButtonLink>
          )}
          {status === "locked" && paidCase && (
            <BuyCaseButton paidCase={paidCase} label={`Unlock · ${paidCase.price}`} buttonClassName="w-full px-4 py-2 text-base" />
          )}
        </div>
      </div>
    </li>
  );
}

type ShelfCase = { caseFile: CaseFile; owned: boolean; refunded: boolean };

/** Every case: free and bought ones ready to host, the rest with a way to unlock them. */
export function CaseShelf({ items, selling }: { items: ShelfCase[]; selling: boolean }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {items.map(({ caseFile, owned, refunded }) => {
        const paidCase = paidCaseById(caseFile.id);
        const status: ShelfStatus = !paidCase
          ? "free"
          : owned
            ? "owned"
            : selling && productIdFor(paidCase)
              ? "locked"
              : "soon";
        return <CaseCard key={caseFile.id} caseFile={caseFile} status={status} refunded={refunded} />;
      })}
    </ul>
  );
}
