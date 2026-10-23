import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { WaitlistEntry, WaitlistStore } from "./types";

const FILE = join(process.cwd(), ".data", "waitlist.json");

/** Local development only: signups go to .data/waitlist.json (git-ignored). */
export function createFileStore(): WaitlistStore {
  return {
    async add(entry) {
      const list: WaitlistEntry[] = await readFile(FILE, "utf8")
        .then((text) => JSON.parse(text))
        .catch(() => []);
      if (list.some((e) => e.email === entry.email)) return "already";
      list.push(entry);
      await mkdir(dirname(FILE), { recursive: true });
      await writeFile(FILE, JSON.stringify(list, null, 2));
      return "added";
    },
  };
}
