// Switches the live site to real Dodo payments. Asks for a live-mode API key,
// creates the live products for every paid case in src/data/catalog.ts and the
// live webhook (or reuses ones a previous run made), then saves the key, ids,
// webhook secret and DODO_PAYMENTS_ENV=live_mode to Vercel production only.
// .env.local and Vercel development stay on test mode, so local testing never
// charges a real card.
//   npm run setup:dodo-live

import { createInterface } from "node:readline/promises";
import DodoPayments from "dodopayments";
import { paidCases } from "../src/data/catalog.ts";
import { saveEnv } from "./env-store.mjs";

const WEBHOOK_PATH = "/api/webhooks/dodo";
const WEBHOOK_EVENTS = ["payment.succeeded", "refund.succeeded"];
const siteUrl = (process.env.SITE_URL_FOR_WEBHOOK || "https://www.playonemoreclue.com").replace(/\/$/, "");
const webhookUrl = `${siteUrl}${WEBHOOK_PATH}`;

const apiKey = (process.env.DODO_LIVE_API_KEY || (await ask("Paste your live API key (Dodo → Live mode → Developer → API Keys), then press Enter:\n  > ")))
  .trim()
  .replace(/^["']+|["']+$/g, "");
if (!apiKey) {
  console.error("No key entered, nothing changed.");
  process.exit(1);
}
if (/^(sk_)?test_/.test(apiKey)) {
  console.error("That looks like a test key. Switch the Dodo dashboard to Live mode and copy a key from there.");
  process.exit(1);
}

const dodo = new DodoPayments({ bearerToken: apiKey, environment: "live_mode" });
try {
  await dodo.products.list({ page_size: 1 });
} catch (error) {
  console.error(`Dodo refused this key in live mode (${error.status ?? "no status"}: ${error.message}).`);
  console.error("Check it was made in Live mode, and that your business is verified in Dodo.");
  process.exit(1);
}
console.log("\nDodo live_mode\n");

/** "$4.99" → 499 */
const toCents = (price) => Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100);

// Live products from an earlier run, by name, so re-running doesn't make duplicates.
const existing = new Map();
for await (const product of dodo.products.list({ archived: false })) {
  if (product.name && !existing.has(product.name)) existing.set(product.name, product);
}

const saved = [
  ["DODO_PAYMENTS_ENV", "live_mode"],
  ["DODO_PAYMENTS_API_KEY", apiKey],
];
for (const item of paidCases) {
  const name = `One More Clue: ${item.title}`;
  const cents = toCents(item.price);
  const found = existing.get(name);
  if (found) {
    const note = found.price === cents ? "" : ` (charges ${found.price} cents, catalog says ${cents}: fix it in Dodo)`;
    console.log(`= ${item.title}: ${found.product_id}, already in live mode${note}`);
    saved.push([item.productIdEnv, found.product_id]);
    continue;
  }
  const product = await dodo.products.create({
    name,
    description: item.includes ? `Unlocks ${item.includes.length} cases in One More Clue.` : `Unlocks this case in One More Clue.`,
    tax_category: "digital_products",
    price: { type: "one_time_price", price: cents, currency: "USD", discount: 0, purchasing_power_parity: false },
  });
  console.log(`+ ${item.title}: ${product.product_id} (${item.price})`);
  saved.push([item.productIdEnv, product.product_id]);
}

let webhook = null;
for await (const hook of dodo.webhooks.list()) {
  if (hook.url === webhookUrl) {
    webhook = hook;
    break;
  }
}
if (webhook) {
  console.log(`= Webhook: ${webhookUrl}, already in live mode`);
} else {
  webhook = await dodo.webhooks.create({ url: webhookUrl, filter_types: WEBHOOK_EVENTS, description: "One More Clue purchases" });
  console.log(`+ Webhook: ${webhookUrl} (${WEBHOOK_EVENTS.join(", ")})`);
}
const { secret } = await dodo.webhooks.retrieveSecret(webhook.id);
saved.push(["DODO_PAYMENTS_WEBHOOK_KEY", secret]);

console.log("");
saveEnv(saved, { toLocal: false, environments: ["production"] });
console.log("\nLive values are on Vercel production only; .env.local stays on test mode.");
console.log("Redeploy production for them to take effect (vercel redeploy <current production url> --environment production),");
console.log("then clear this terminal (cls) so the key isn't left on screen.");

/**
 * Reads the key as a normal visible line. A hidden prompt looked frozen and
 * garbled pastes in some terminals, so the key shows; clear the terminal after.
 */
async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}
