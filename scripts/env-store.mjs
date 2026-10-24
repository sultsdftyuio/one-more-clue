// Shared by the setup scripts: read .env.local, and save values to it and to Vercel.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const LOCAL_PATH = ".env.local";
const ENVIRONMENTS = ["production", "development"];
const vercel = process.platform === "win32" ? "vercel.cmd" : "vercel";

export function readLocalEnv() {
  if (!existsSync(LOCAL_PATH)) return {};
  const env = {};
  for (const line of readFileSync(LOCAL_PATH, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^["']+|["']+$/g, "");
  }
  return env;
}

/** entries: [name, value][]. Writes .env.local, and Vercel too unless toVercel is false. */
export function saveEnv(entries, { toVercel = true } = {}) {
  saveLocal(entries);
  if (!toVercel) return;

  const failed = [];
  for (const [name, value] of entries) {
    for (const env of ENVIRONMENTS) {
      if (!addToVercel(name, value, env) && !addToVercel(name, value, env)) failed.push(`${name} (${env})`);
    }
    if (!failed.some((f) => f.startsWith(`${name} `))) console.log(`✓ ${name} saved to Vercel (${ENVIRONMENTS.join(", ")})`);
  }
  if (failed.length) {
    console.error(`✗ Not saved to Vercel: ${failed.join(", ")}. Re-run to retry.`);
    process.exitCode = 1;
  }
}

function addToVercel(name, value, env) {
  try {
    // NEXT_PUBLIC_ values ship to the browser anyway; saying so skips Vercel's "looks like a credential" prompt.
    const type = name.startsWith("NEXT_PUBLIC_") ? ["--no-sensitive"] : [];
    execFileSync(vercel, ["env", "add", name, env, "--force", "--yes", ...type], { input: value, stdio: ["pipe", "ignore", "pipe"], shell: process.platform === "win32" });
    return true;
  } catch (error) {
    // stderr never contains the value: it goes in on stdin.
    console.error(`  vercel env add ${name} ${env} failed: ${String(error.stderr ?? "").trim().split("\n").pop()}`);
    return false;
  }
}

function saveLocal(entries) {
  let local = existsSync(LOCAL_PATH) ? readFileSync(LOCAL_PATH, "utf8") : "";
  for (const [name, value] of entries) {
    const line = `${name}="${value}"`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    local = pattern.test(local) ? local.replace(pattern, line) : `${local.replace(/\n?$/, "\n")}${line}\n`;
  }
  writeFileSync(LOCAL_PATH, local);
  console.log(`✓ ${LOCAL_PATH} updated`);
}
