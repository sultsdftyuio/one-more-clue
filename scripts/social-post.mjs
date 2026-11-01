// Posts every video in social/outbox to every account connected on Upload-Post (social/README.md).
//   npm run social:post                            once
//   npm run social:watch                           keep checking the outbox
//   npm run social:post -- --dry-run               show what would go out, post nothing
//   npm run social:post -- --retry instagram,x     post again, to these platforms only
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, openAsBlob, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";
import { readLocalEnv } from "./env-store.mjs";

const OUTBOX = join("social", "outbox");
const POSTED = join("social", "posted");
const FAILED = join("social", "failed");
const VIDEO_TYPES = [".mp4", ".mov"];

// What every platform we post to accepts: Facebook Reels stop at 90s, Instagram and Bluesky at 300 MB.
const MIN_SECONDS = 3;
const MAX_SECONDS = 90;
const MAX_MEGABYTES = 300;
const MAX_HEADLINE = 100; // YouTube's title limit
const MAX_CAPTION = 2200; // TikTok's and Instagram's
const SHORT_CAPTION_PLATFORMS = ["youtube", "x", "bluesky", "threads", "pinterest"];

const WATCH_EVERY_MS = 30_000;
const WATCH_AFTER_ERROR_MS = 5 * 60_000; // a failing upload isn't re-sent every 30 seconds
const POLL_EVERY_MS = 10_000;
const GIVE_UP_AFTER_MS = 90 * 60_000; // Upload-Post itself calls a job failed after an hour of silence

const env = { ...readLocalEnv(), ...process.env };
const api = env.UPLOAD_POST_URL ?? "https://api.upload-post.com/api";
const apiKey = env.UPLOAD_POST_API_KEY;

const { values: flags } = parseArgs({
  options: { watch: { type: "boolean" }, "dry-run": { type: "boolean" }, retry: { type: "string" } },
});
const retryPlatforms = flags.retry?.split(",").map((p) => p.trim()).filter(Boolean);

class Rejected extends Error {}

const said = new Set();
function sayOnce(message) {
  if (said.has(message)) return;
  said.add(message);
  console.log(message);
}

async function call(path, init = {}) {
  const res = await fetch(`${api}${path}`, { ...init, headers: { Authorization: `Apikey ${apiKey}`, ...init.headers } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body };
}

/** The profile to post as and the platforms it can post to right now. */
async function accounts() {
  const { ok, status, body } = await call("/uploadposts/users");
  if (!ok) throw new Error(`Upload-Post refused the API key (${status}): ${body.message ?? "no details"}`);

  const named = env.UPLOAD_POST_PROFILE;
  const profile = named ? body.profiles.find((p) => p.username === named) : body.profiles.length === 1 ? body.profiles[0] : null;
  if (!profile) throw new Error(`Set UPLOAD_POST_PROFILE to one of: ${body.profiles.map((p) => p.username).join(", ")}`);

  const platforms = [];
  for (const [platform, account] of Object.entries(profile.social_accounts ?? {})) {
    if (!account || platform === "reddit") continue; // an unconnected platform is "" or null; Reddit is closed
    if (account.reauth_required) sayOnce(`! ${platform} needs reconnecting on Upload-Post, skipping it`);
    else if (platform === "pinterest" && !env.UPLOAD_POST_PINTEREST_BOARD) sayOnce("! pinterest needs UPLOAD_POST_PINTEREST_BOARD, skipping it");
    else platforms.push(platform);
  }
  if (!platforms.length) throw new Error(`No accounts connected to Upload-Post profile "${profile.username}"`);
  return { user: profile.username, platforms: retryPlatforms ?? platforms };
}

function readCaption(path) {
  const text = readFileSync(path, "utf8").replace(/^﻿/, "").trim();
  const [headline, ...rest] = text.split(/\r?\n/);
  return { text, headline: headline.trim(), body: rest.join("\n").trim() };
}

/** Why this video can't go out yet, or null. ffprobe also fails on a render still being written. */
function problemWith(video, caption) {
  if (!caption.text) return "its caption is empty";
  if (caption.headline.length > MAX_HEADLINE) return `the caption's first line is over ${MAX_HEADLINE} characters`;
  if (caption.text.length > MAX_CAPTION) return `the caption is over ${MAX_CAPTION} characters`;

  let probe;
  try {
    const args = ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", video];
    probe = JSON.parse(execFileSync("ffprobe", args, { stdio: ["ignore", "pipe", "ignore"] }));
  } catch (error) {
    if (error.code === "ENOENT") throw new Error("ffprobe isn't installed");
    return "it isn't a finished video";
  }

  const { width, height } = probe.streams?.[0] ?? {};
  const seconds = Number(probe.format?.duration);
  if (!width || !seconds) return "it isn't a finished video";
  if (width >= height) return `it's ${width}x${height}, and Reels, Shorts and TikTok need vertical`;
  if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) return `it runs ${seconds.toFixed(1)}s, outside ${MIN_SECONDS} to ${MAX_SECONDS}s`;
  if (statSync(video).size > MAX_MEGABYTES * 1024 * 1024) return `it's over ${MAX_MEGABYTES} MB`;
  return null;
}

async function postForm(video, caption, { user, platforms }, requestId) {
  const form = new FormData();
  form.append("user", user);
  for (const platform of platforms) form.append("platform[]", platform);
  form.append("video", await openAsBlob(video), basename(video));
  form.append("title", caption.text);
  for (const platform of SHORT_CAPTION_PLATFORMS) form.append(`${platform}_title`, caption.headline);
  form.append("youtube_description", caption.body || caption.headline);
  form.append("pinterest_description", caption.body || caption.headline);
  if (env.UPLOAD_POST_PINTEREST_BOARD) form.append("pinterest_board_id", env.UPLOAD_POST_PINTEREST_BOARD);
  if (env.UPLOAD_POST_FACEBOOK_PAGE) form.append("facebook_page_id", env.UPLOAD_POST_FACEBOOK_PAGE);
  form.append("async_upload", "true");
  form.append("request_id", requestId);
  form.append("external_id", basename(video));
  return form;
}

async function jobStatus(requestId) {
  const { ok, status, body } = await call(`/uploadposts/status?request_id=${encodeURIComponent(requestId)}`);
  if (status === 404) return null;
  if (!ok) throw new Error(`Upload-Post status check failed (${status})`);
  return body;
}

async function finished(requestId) {
  const deadline = Date.now() + GIVE_UP_AFTER_MS;
  while (Date.now() < deadline) {
    const job = await jobStatus(requestId);
    if (job?.status === "completed" || job?.status === "failed") return job;
    await sleep(POLL_EVERY_MS);
  }
  throw new Error("Still posting after 90 minutes; the next run picks this job up again");
}

function shelve(video, captionPath, folder, record) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const dir = join(folder, `${stamp}-${basename(video, extname(video))}`);
  mkdirSync(dir, { recursive: true });
  renameSync(video, join(dir, basename(video)));
  renameSync(captionPath, join(dir, basename(captionPath)));
  writeFileSync(join(dir, "result.json"), `${JSON.stringify(record, null, 2)}\n`);
  return dir;
}

async function post(video, captionPath, caption, target) {
  // Named after the content, so a crash or a second copy of the same video finds the first job, not a double post.
  const hash = createHash("sha256").update(readFileSync(video)).update(caption.text).digest("hex").slice(0, 32);
  const requestId = retryPlatforms ? `omc-${hash}-${Date.now()}` : `omc-${hash}`;

  const earlier = retryPlatforms ? null : await jobStatus(requestId);
  if (earlier) console.log(`${basename(video)}: already sent to Upload-Post, not sending it again`);
  else {
    console.log(`${basename(video)}: posting to ${target.platforms.join(", ")}`);
    const form = await postForm(video, caption, target, requestId);
    const { ok, status, body } = await call("/upload", { method: "POST", body: form, headers: { "Idempotency-Key": requestId } });
    if ([400, 403, 404].includes(status)) throw new Rejected(`Upload-Post rejected it (${status}): ${body.message ?? body.error ?? "no details"}`);
    if (!ok) throw new Error(`Upload-Post upload failed (${status}): ${body.message ?? "no details"}`);
  }

  const job = await finished(requestId);
  const results = job.results ?? [];
  for (const r of results) {
    if (r.success) console.log(`  ✓ ${r.platform} ${r.post_url ?? r.url ?? ""}`);
    else console.log(`  ✗ ${r.platform}: ${r.message ?? r.error ?? "no details"}`);
  }

  const missed = results.filter((r) => !r.success).map((r) => r.platform);
  const allFailed = job.status === "failed" && missed.length === results.length;
  const dir = shelve(video, captionPath, allFailed ? FAILED : POSTED, job);
  if (missed.length || allFailed) {
    process.exitCode = 1;
    const list = (missed.length ? missed : target.platforms).join(",");
    console.log(`  To try again, move it back from ${dir} to ${OUTBOX} and run: npm run social:post -- --retry ${list}`);
  }
}

async function postAll() {
  mkdirSync(OUTBOX, { recursive: true });
  const videos = readdirSync(OUTBOX).filter((file) => VIDEO_TYPES.includes(extname(file).toLowerCase()));
  let target;
  let errored = false;

  for (const file of videos) {
    const video = join(OUTBOX, file);
    const captionPath = join(OUTBOX, `${basename(file, extname(file))}.txt`);
    // The caption goes in last: until it's there, the video may still be rendering.
    if (!existsSync(captionPath)) {
      sayOnce(`${file}: waiting for ${basename(captionPath)}`);
      continue;
    }
    const caption = readCaption(captionPath);
    const problem = problemWith(video, caption);
    if (problem) {
      sayOnce(`${file}: held, ${problem}`);
      continue;
    }

    if (!apiKey && !flags["dry-run"]) throw new Error("Add UPLOAD_POST_API_KEY to .env.local (see social/README.md)");
    target ??= apiKey ? await accounts() : { user: "(no API key yet)", platforms: retryPlatforms ?? ["every connected account"] };

    if (flags["dry-run"]) {
      console.log(`${file}: ready. Would post as ${target.user} to ${target.platforms.join(", ")}`);
      console.log(`  full caption: ${caption.text.replace(/\s*\r?\n\s*/g, " / ")}`);
      console.log(`  on ${SHORT_CAPTION_PLATFORMS.join(", ")}: ${caption.headline}`);
      continue;
    }

    try {
      await post(video, captionPath, caption, target);
    } catch (error) {
      process.exitCode = 1;
      if (!(error instanceof Rejected)) {
        console.error(`✗ ${file}: ${error.message}. It stays in the outbox.`);
        errored = true;
        continue;
      }
      const dir = shelve(video, captionPath, FAILED, { error: error.message });
      console.error(`✗ ${file}: ${error.message}. Moved to ${dir}`);
    }
  }
  return errored;
}

if (flags.watch && (flags.retry || flags["dry-run"])) throw new Error("--watch can't be combined with --retry or --dry-run");
if (flags.watch) console.log(`Watching ${OUTBOX}. Ctrl+C to stop.`);

do {
  const errored = await postAll().catch((error) => {
    console.error(`✗ ${error.message}`);
    process.exitCode = 1;
    return true;
  });
  if (flags.watch) await sleep(errored ? WATCH_AFTER_ERROR_MS : WATCH_EVERY_MS);
} while (flags.watch);
