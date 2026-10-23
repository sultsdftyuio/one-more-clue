import { accountCopy } from "@/data/account";
import { paidCaseById } from "@/data/catalog";
import type { PurchaseStatus } from "@/types/supabase";

type Purchase = { case_id: string; status: PurchaseStatus };

function Row({ title, status }: { title: string; status: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink/15 bg-white px-4 py-3">
      <span className="font-extrabold">{title}</span>
      <span className="shrink-0 rounded-full border-2 border-ink bg-mustard px-2 py-0.5 text-xs font-extrabold">{status}</span>
    </li>
  );
}

/** The free opening case plus every paid case the player has bought. */
export function CaseList({ purchases }: { purchases: Purchase[] }) {
  return (
    <ul className="mt-3 space-y-2">
      <Row title={accountCopy.freeCase.title} status={accountCopy.freeCase.status} />
      {purchases.map((p) => (
        <Row
          key={p.case_id}
          title={paidCaseById(p.case_id)?.title ?? p.case_id}
          status={p.status === "paid" ? accountCopy.owned : accountCopy.refunded}
        />
      ))}
    </ul>
  );
}
