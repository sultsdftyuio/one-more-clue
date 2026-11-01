// Runs the real script against a fake Upload-Post server, in a throwaway folder, with a real film.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("social-post.mjs", import.meta.url));
const film = fileURLToPath(new URL("../public/cinematics/case-002.mp4", import.meta.url));

const connected = {
  instagram: { handle: "omc" },
  youtube: { handle: "omc" },
  x: { handle: "omc" },
  threads: { handle: "omc", reauth_required: true },
  tiktok: "",
  facebook: null,
};

let server, url, dir, jobs, uploads, rejectUploads, platformFails;

before(async () => {
  server = createServer(async (req, res) => {
    const reply = (status, body) => res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
    const path = new URL(req.url, "http://x");

    if (path.pathname === "/uploadposts/users") {
      return reply(200, { success: true, profiles: [{ username: "omc", social_accounts: connected }] });
    }
    if (path.pathname === "/uploadposts/status") {
      const job = jobs.get(path.searchParams.get("request_id"));
      return job ? reply(200, job) : reply(404, { status: "not_found" });
    }
    if (path.pathname === "/upload") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": req.headers["content-type"] } }).formData();
      uploads.push({ form, idempotencyKey: req.headers["idempotency-key"], authorization: req.headers.authorization });
      if (rejectUploads) return reply(400, { message: "bad caption" });

      const platforms = form.getAll("platform[]");
      const results = platforms.map((platform) => ({ platform, success: !platformFails.includes(platform), url: `https://${platform}.test/1`, message: "nope" }));
      jobs.set(form.get("request_id"), { status: "completed", completed: results.length, total: results.length, results });
      return reply(200, { success: true, request_id: form.get("request_id") });
    }
    reply(404, {});
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

beforeEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = mkdtempSync(join(tmpdir(), "omc-social-"));
  mkdirSync(join(dir, "social", "outbox"), { recursive: true });
  jobs = new Map();
  uploads = [];
  rejectUploads = false;
  platformFails = [];
});

function run(args = [], extraEnv = { UPLOAD_POST_API_KEY: "test-key" }) {
  const env = { ...process.env, UPLOAD_POST_URL: url, ...extraEnv };
  return new Promise((resolve) => {
    execFile(process.execPath, [script, ...args], { cwd: dir, env }, (error, stdout, stderr) => {
      resolve({ code: error?.code ?? 0, output: stdout + stderr });
    });
  });
}

function drop({ video = true, caption = "Who took the ring?\n\nThree guests. One lie. #mystery" } = {}) {
  if (video) copyFileSync(film, join(dir, "social", "outbox", "teaser.mp4"));
  if (caption !== null) writeFileSync(join(dir, "social", "outbox", "teaser.txt"), caption);
}

const outbox = () => readdirSync(join(dir, "social", "outbox")).sort();
const shelf = (name) => {
  const folder = join(dir, "social", name);
  return existsSync(folder) ? readdirSync(folder).map((entry) => join(folder, entry)) : [];
};

test("posts to every connected account and shelves the video with its result", async () => {
  drop();
  const { code, output } = await run();
  assert.equal(code, 0, output);

  assert.equal(uploads.length, 1);
  const { form, authorization, idempotencyKey } = uploads[0];
  assert.equal(authorization, "Apikey test-key");
  assert.equal(idempotencyKey, form.get("request_id"));
  assert.deepEqual(form.getAll("platform[]"), ["instagram", "youtube", "x"]); // no unconnected or expired accounts
  assert.equal(form.get("user"), "omc");
  assert.equal(form.get("async_upload"), "true");
  assert.equal(form.get("title").replace(/\r\n/g, "\n"), "Who took the ring?\n\nThree guests. One lie. #mystery"); // forms send CRLF
  assert.equal(form.get("youtube_title"), "Who took the ring?");
  assert.equal(form.get("x_title"), "Who took the ring?");
  assert.equal(form.get("youtube_description"), "Three guests. One lie. #mystery");
  assert.equal(form.get("video").size, readFileSync(film).length);

  assert.deepEqual(outbox(), []);
  const [folder] = shelf("posted");
  assert.deepEqual(readdirSync(folder).sort(), ["result.json", "teaser.mp4", "teaser.txt"]);
  assert.equal(JSON.parse(readFileSync(join(folder, "result.json"), "utf8")).status, "completed");
  assert.match(output, /threads needs reconnecting/);
});

test("the same video and caption is never posted twice", async () => {
  drop();
  await run();
  drop();
  const { code, output } = await run();
  assert.equal(code, 0, output);
  assert.equal(uploads.length, 1);
  assert.match(output, /already sent/);
});

test("a video without a caption waits", async () => {
  drop({ caption: null });
  const { code, output } = await run();
  assert.equal(code, 0, output);
  assert.equal(uploads.length, 0);
  assert.deepEqual(outbox(), ["teaser.mp4"]);
  assert.match(output, /waiting for teaser\.txt/);
});

test("a half-written video and an overlong title are held, not posted", async () => {
  drop({ video: false });
  writeFileSync(join(dir, "social", "outbox", "teaser.mp4"), readFileSync(film).subarray(0, 4096));
  assert.match((await run()).output, /held, it isn't a finished video/);

  drop({ caption: "x".repeat(101) });
  assert.match((await run()).output, /held, the caption's first line is over 100/);
  assert.equal(uploads.length, 0);
  assert.equal(outbox().length, 2);
});

test("--dry-run works before any key exists and posts nothing", async () => {
  drop();
  const { code, output } = await run(["--dry-run"], { UPLOAD_POST_API_KEY: "" });
  assert.equal(code, 0, output);
  assert.equal(uploads.length, 0);
  assert.equal(outbox().length, 2);
  assert.match(output, /ready\. Would post/);
});

test("without a key it says what to do and keeps the video", async () => {
  drop();
  const { code, output } = await run([], { UPLOAD_POST_API_KEY: "" });
  assert.equal(code, 1);
  assert.match(output, /Add UPLOAD_POST_API_KEY/);
  assert.equal(outbox().length, 2);
});

test("a platform that fails is reported and can be retried alone", async () => {
  platformFails = ["x"];
  drop();
  const { code, output } = await run();
  assert.equal(code, 1);
  assert.match(output, /✗ x: nope/);
  assert.match(output, /--retry x/);
  assert.equal(shelf("posted").length, 1);

  platformFails = [];
  drop();
  const retry = await run(["--retry", "x"]);
  assert.equal(retry.code, 0, retry.output);
  assert.equal(uploads.length, 2);
  assert.deepEqual(uploads[1].form.getAll("platform[]"), ["x"]);
});

test("a rejected video moves to failed, so the watcher doesn't resend it forever", async () => {
  rejectUploads = true;
  drop();
  const { code, output } = await run();
  assert.equal(code, 1);
  assert.match(output, /bad caption/);
  assert.deepEqual(outbox(), []);
  assert.equal(shelf("failed").length, 1);
});
