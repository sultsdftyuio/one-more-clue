// Creates the Dodo products for every paid case in src/data/catalog.ts, and
// the webhook endpoint, in whichever mode DODO_PAYMENTS_ENV says. Their ids
// and the webhook secret are saved to .env.local and Vercel. Anything whose
// env var is already set is skipped, so it is safe to re-run.
//   npm run setup:dodo-products            (saves to .env.local and Vercel)
//   npm run setup:dodo-products -- --local (.env.local only)

import DodoPayments from "dodopayments";
import { paidCases } from "../src/data/catalog.ts";
import { readLocalEnv, saveEnv } from "./env-store.mjs";

const WEBHOOK_PATH = "/api/webhooks/dodo";
const WEBHOOK_EVENTS = ["payment.succeeded", "refund.succeeded"];

const env = { ...readLocalEnv(), ...process.env };
const apiKey = env.DODO_PAYMENTS_API_KEY?.trim();
const environment = env.DODO_PAYMENTS_ENV?.trim();
if (!apiKey || (environment !== "test_mode" && environment !== "live_mode")) {
  console.error("Set DODO_PAYMENTS_API_KEY and DODO_PAYMENTS_ENV (test_mode or live_mode) first: npm run setup:payments");
  process.exit(1);
}
const siteUrl = (env.SITE_URL_FOR_WEBHOOK || "https://www.playonemoreclue.com").replace(/\/$/, "");

const dodo = new DodoPayments({ bearerToken: apiKey, environment });
console.log(`Dodo ${environment}\n`);

/** "$4.99" → 499 */
const toCents = (price) => Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100);

const saved = [];
for (const item of paidCases) {
  if (env[item.productIdEnv]?.trim()) {
    console.log(`- ${item.title}: already set (${item.productIdEnv}), skipped`);
    continue;
  }
  const product = await dodo.products.create({
    name: `One More Clue: ${item.title}`,
    description: item.includes ? `Unlocks ${item.includes.length} cases in One More Clue.` : `Unlocks this case in One More Clue.`,
    tax_category: "digital_products",
    price: { type: "one_time_price", price: toCents(item.price), currency: "USD", discount: 0, purchasing_power_parity: false },
  });
  console.log(`+ ${item.title}: ${product.product_id} (${item.price})`);
  saved.push([item.productIdEnv, product.product_id]);
}

if (env.DODO_PAYMENTS_WEBHOOK_KEY?.trim()) {
  console.log("- Webhook: already set (DODO_PAYMENTS_WEBHOOK_KEY), skipped");
} else {
  const webhook = await dodo.webhooks.create({ url: `${siteUrl}${WEBHOOK_PATH}`, filter_types: WEBHOOK_EVENTS, description: "One More Clue purchases" });
  const { secret } = await dodo.webhooks.retrieveSecret(webhook.id);
  console.log(`+ Webhook: ${siteUrl}${WEBHOOK_PATH} (${WEBHOOK_EVENTS.join(", ")})`);
  saved.push(["DODO_PAYMENTS_WEBHOOK_KEY", secret]);
}

if (saved.length === 0) {
  console.log("\nNothing to create.");
  process.exit(0);
}
console.log("");
saveEnv(saved, { toVercel: !process.argv.includes("--local") });
console.log("\nRedeploy production for the new values to take effect: vercel --prod");
