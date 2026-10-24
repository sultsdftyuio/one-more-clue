// Reads the Supabase URL, anon key and service_role key through the Supabase
// CLI (run `npx supabase login` first) and saves them to .env.local and Vercel.
// Keys are never printed.
//   npm run setup:supabase                  (lists your projects)
//   npm run setup:supabase -- <project-ref> (saves that project's keys)

import { execFileSync } from "node:child_process";
import { saveEnv } from "./env-store.mjs";

const cli = (...args) =>
  JSON.parse(execFileSync("npx", ["-y", "supabase@latest", ...args, "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], shell: process.platform === "win32" }));

const ref = process.argv[2];
if (!ref) {
  const projects = cli("projects", "list");
  if (projects.length === 0) console.log("No Supabase projects yet. Create one at supabase.com/dashboard, then re-run.");
  for (const p of projects) console.log(`${p.ref ?? p.id}  ${p.name}  (${p.region})`);
  console.log("\nRe-run with the project ref: npm run setup:supabase -- <ref>");
  process.exit(0);
}

const keys = cli("projects", "api-keys", "--project-ref", ref);
const keyNamed = (name) => keys.find((k) => k.name === name)?.api_key;
const anon = keyNamed("anon");
const serviceRole = keyNamed("service_role");
if (!anon || !serviceRole) {
  console.error(`Couldn't find the anon and service_role keys for ${ref} (found: ${keys.map((k) => k.name).join(", ") || "none"}).`);
  process.exit(1);
}

saveEnv([
  ["NEXT_PUBLIC_SUPABASE_URL", `https://${ref}.supabase.co`],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", anon],
  ["SUPABASE_SERVICE_ROLE_KEY", serviceRole],
]);
console.log("\nNext: run supabase/migrations/0001_purchases.sql in the Supabase SQL Editor.");
