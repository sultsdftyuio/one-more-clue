// Asks for the Supabase + Dodo keys that paid cases need, then saves them to
// Vercel (production and development) and to .env.local. Blank answers are
// skipped, so it can be re-run to fill in or change one value. Products and
// the webhook are made by scripts/create-dodo-products.mjs afterwards.
//   npm run setup:payments

import { createInterface } from "node:readline/promises";
import { saveEnv } from "./env-store.mjs";

const VARS = [
  ["NEXT_PUBLIC_SUPABASE_URL", "Supabase → Project Settings → API → Project URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase → Project Settings → API → anon public key"],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase → Project Settings → API → service_role key"],
  ["DODO_PAYMENTS_ENV", "test_mode or live_mode (start with test_mode)"],
  ["DODO_PAYMENTS_API_KEY", "Dodo → Developer → API Keys (from the same mode as above)"],
];

const rl = createInterface({ input: process.stdin, output: process.stdout });
const answers = [];
for (const [name, hint] of VARS) {
  const value = (await rl.question(`${name}\n  (${hint})\n  > `)).trim().replace(/^["']+|["']+$/g, "");
  if (value) answers.push([name, value]);
}
rl.close();

if (answers.length === 0) {
  console.log("Nothing entered, nothing changed.");
  process.exit(0);
}
saveEnv(answers);
console.log("\nNext: npm run setup:dodo-products");
