// Copies freshly generated art from art/out into the app.
// Run after `python art/generate.py`:  npm run art:sync
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "art", "out");
const assets = join(root, "src", "assets", "art");
const app = join(root, "src", "app");

if (!existsSync(out)) {
  console.error("No art/out folder. Run the generator first: python art/generate.py");
  process.exit(1);
}

mkdirSync(assets, { recursive: true });
const webp = readdirSync(join(out, "webp")).filter((f) => f.endsWith(".webp"));
for (const file of webp) copyFileSync(join(out, "webp", file), join(assets, file));

const icons = { "favicon.ico": "favicon.ico", "icon-192.png": "icon.png", "apple-touch-icon.png": "apple-icon.png" };
for (const [from, to] of Object.entries(icons)) copyFileSync(join(out, "icons", from), join(app, to));

// Link-preview card: Next.js serves these file names as the Open Graph and Twitter images.
const alt = "One More Clue: four cartoon shape suspects on a night street. Mysteries you crack with friends.";
for (const name of ["opengraph-image", "twitter-image"]) {
  copyFileSync(join(out, "social", "og-image.png"), join(app, `${name}.png`));
  writeFileSync(join(app, `${name}.alt.txt`), alt);
}

console.log(`Synced ${webp.length} images, ${Object.keys(icons).length} icons and the share card.`);
