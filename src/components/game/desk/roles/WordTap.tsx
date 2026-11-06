"use client";

import { useEffect, useState } from "react";
import { play } from "../../audio/sound";
import { buzz, BUZZ } from "../../haptics";
import { Icon } from "../../ui/Icon";
import { addWord, setTapping, useTechDesk } from "./tech-store";

/** The word under a point on screen: letters, digits, and the dashes inside things like "V-117" or "KX24". */
function wordAt(x: number, y: number): { word: string; range: Range } | null {
  type CaretDoc = Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  const doc = document as CaretDoc;
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) ({ offsetNode: node, offset } = pos);
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range) ({ startContainer: node, startOffset: offset } = range);
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? "";
  const isWord = (ch: string) => /[\p{L}\p{N}*]/u.test(ch) || ch === "-" || ch === "'" || ch === "&";
  let start = offset;
  let end = offset;
  while (start > 0 && isWord(text[start - 1])) start--;
  while (end < text.length && isWord(text[end])) end++;
  const word = text
    .slice(start, end)
    .replace(/^[-'&]+|[-'&]+$/g, "")
    .replace(/'s$/i, "");
  if (word.replace(/[^\p{L}\p{N}]/gu, "").length < 2) return null;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  return { word, range };
}

type Highlights = { set: (name: string, value: unknown) => void; delete: (name: string) => void };
type HighlightCtor = new (...ranges: Range[]) => unknown;

/**
 * The Tech's "Tap words" mode: while it's on, tapping any word in a piece of
 * evidence adds it to the search instead of doing anything else. A band at
 * the bottom says the mode is on and turns it off.
 */
export function WordTap() {
  const { tapping, query } = useTechDesk();
  const [added, setAdded] = useState<{ word: string; key: number } | null>(null);

  useEffect(() => {
    document.body.classList.toggle("tech-tapping", tapping);
    if (!tapping) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest("[data-searchable]") || target.closest("button, a, input, textarea")) return;
      const hit = wordAt(e.clientX, e.clientY);
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      addWord(hit.word);
      play("type");
      buzz(BUZZ.tap);
      setAdded({ word: hit.word, key: Date.now() });
      const css = CSS as unknown as { highlights?: Highlights };
      const Highlight = (window as unknown as { Highlight?: HighlightCtor }).Highlight;
      if (css.highlights && Highlight) {
        css.highlights.set("tapped-word", new Highlight(hit.range));
        window.setTimeout(() => css.highlights?.delete("tapped-word"), 900);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.body.classList.remove("tech-tapping");
    };
  }, [tapping]);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(null), 1600);
    return () => window.clearTimeout(timer);
  }, [added]);

  if (!tapping) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-[57] flex justify-center px-3" role="status">
      <div className="flex max-w-xl min-w-0 items-center gap-2 rounded-2xl border-[3px] border-ink bg-[#06130f] px-3 py-2 font-mono text-sm text-teal shadow-card">
        <Icon name="search" className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {added ? <>Added &ldquo;{added.word}&rdquo;</> : query ? <>&gt; {query}</> : "Tap any word in the evidence"}
        </span>
        <button type="button" onClick={() => setTapping(false)} className="shrink-0 rounded-lg bg-teal px-2.5 py-1 text-xs font-black tracking-wider text-ink uppercase">
          Done
        </button>
      </div>
    </div>
  );
}
