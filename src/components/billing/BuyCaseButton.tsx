import { startCheckout } from "@/app/checkout/actions";
import { Button } from "@/components/ui/Button";
import { productIdFor, type PaidCase } from "@/data/catalog";
import { paymentsEnabled } from "@/lib/billing/env";

type Props = { paidCase: PaidCase; className?: string; label?: string; buttonClassName?: string };

/** Renders nothing until payments are configured and this case has a Dodo product. */
export function BuyCaseButton({ paidCase, className, label, buttonClassName }: Props) {
  if (!paymentsEnabled() || !productIdFor(paidCase)) return null;
  return (
    <form action={startCheckout} className={className}>
      <input type="hidden" name="caseId" value={paidCase.id} />
      <Button type="submit" variant="coral" className={buttonClassName}>
        {label ?? `Buy ${paidCase.title} · ${paidCase.price}`}
      </Button>
    </form>
  );
}
