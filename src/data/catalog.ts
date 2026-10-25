/**
 * Things you can buy. Case 001 is the free opening case, so it isn't here.
 * Each item is a one-off Dodo product; its product id lives in an env var so
 * test and live mode can point at different products. An item is only
 * purchasable once that env var is set. A bundle unlocks every case it includes.
 */
export type PaidCase = {
  id: string;
  title: string;
  /** Display only. The real price is whatever the Dodo product charges. */
  price: string;
  productIdEnv: string;
  /** For a bundle: the case ids it unlocks. */
  includes?: string[];
};

export const paidCases: PaidCase[] = [
  { id: "case-002", title: "Dead Air", price: "$4.99", productIdEnv: "DODO_PRODUCT_CASE_002" },
  { id: "case-003", title: "The Last Course", price: "$4.99", productIdEnv: "DODO_PRODUCT_CASE_003" },
  { id: "case-004", title: "Snowed In", price: "$4.99", productIdEnv: "DODO_PRODUCT_CASE_004" },
  {
    id: "bundle-season-1",
    title: "Season 1 bundle",
    price: "$11.99",
    productIdEnv: "DODO_PRODUCT_BUNDLE_SEASON_1",
    includes: ["case-002", "case-003", "case-004"],
  },
];

export function paidCaseById(id: string) {
  return paidCases.find((c) => c.id === id) ?? null;
}

export function productIdFor(paidCase: PaidCase) {
  return process.env[paidCase.productIdEnv]?.trim() || null;
}

/** The bundles on sale, for the host and account pages. */
export const bundles = paidCases.filter((c) => c.includes?.length);

/** "$11.99" bundle against three "$4.99" cases → "$2.98", or null when it saves nothing. */
export function bundleSaving(bundle: PaidCase) {
  const cents = (price?: string) => Math.round(Number(price?.replace(/[^0-9.]/g, "")) * 100);
  const separately = (bundle.includes ?? []).reduce((sum, id) => sum + cents(paidCaseById(id)?.price), 0);
  const diff = separately - cents(bundle.price);
  return diff > 0 ? `$${(diff / 100).toFixed(2)}` : null;
}
