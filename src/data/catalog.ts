/**
 * Cases that cost money. Case 001 is the free opening case, so it isn't here.
 * Each paid case is a one-off Dodo product; its product id lives in an env var
 * so test and live mode can point at different products. A case is only
 * purchasable once that env var is set.
 */
export type PaidCase = {
  id: string;
  title: string;
  /** Display only. The real price is whatever the Dodo product charges. */
  price: string;
  productIdEnv: string;
};

export const paidCases: PaidCase[] = [
  { id: "case-002", title: "Case 002", price: "$4.99", productIdEnv: "DODO_PRODUCT_CASE_002" },
];

export function paidCaseById(id: string) {
  return paidCases.find((c) => c.id === id) ?? null;
}

export function productIdFor(paidCase: PaidCase) {
  return process.env[paidCase.productIdEnv]?.trim() || null;
}
