"use client";

import { useEffect, useState, type FormEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { cx } from "@/lib/cx";
import { Panel } from "./parts";

const FACES = [
  { rating: 1, face: "😩", label: "Didn't enjoy it" },
  { rating: 2, face: "😕", label: "Meh" },
  { rating: 3, face: "😐", label: "It was okay" },
  { rating: 4, face: "🙂", label: "Good" },
  { rating: 5, face: "🤩", label: "Loved it" },
];

/** "How was this case?" on the reveal: one tap, plus an optional note. Once per player per room. */
export function FeedbackCard({ code }: { code: string }) {
  const key = `omc-feedback-${code}`;
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"open" | "sending" | "sent">("open");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(key)) setState("sent");
    } catch {}
  }, [key]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setState("sending");
    setError(null);
    const res = await fetch(`/api/rooms/${code}/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    }).catch(() => null);
    if (!res?.ok) {
      setError("Couldn't send that. Try again?");
      setState("open");
      return;
    }
    trackEvent("feedback_sent", { rating });
    try {
      window.localStorage.setItem(key, String(rating));
    } catch {}
    setState("sent");
  };

  if (state === "sent") {
    return (
      <Panel className="text-center">
        <p className="font-display text-2xl text-cream">Thanks, detective.</p>
        <p className="mt-1 font-semibold text-cream/70">Every rating shapes the next case.</p>
      </Panel>
    );
  }

  return (
    <Panel title="How was this case?">
      <form onSubmit={send}>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Your rating">
          {FACES.map((f) => (
            <button
              key={f.rating}
              type="button"
              role="radio"
              aria-checked={rating === f.rating}
              aria-label={f.label}
              onClick={() => setRating(f.rating)}
              className={cx(
                "flex flex-col items-center gap-1 rounded-2xl border-[3px] py-2 transition-transform hover:-translate-y-0.5",
                rating === f.rating ? "border-ink bg-mustard text-ink shadow-pop-sm" : "border-cream/15 text-cream",
              )}
            >
              <span className="text-3xl leading-none" aria-hidden>
                {f.face}
              </span>
              <span className="text-[0.65rem] leading-tight font-extrabold max-sm:sr-only">{f.label}</span>
            </button>
          ))}
        </div>
        {rating && (
          <div className="mt-4 animate-pop-in">
            <label htmlFor="feedback-comment" className="mb-1.5 block text-sm font-bold text-cream/80">
              {rating <= 3 ? "What got in the way? (optional)" : "What was the best moment? (optional)"}
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={600}
              rows={3}
              className="w-full rounded-2xl border-[3px] border-ink bg-cream p-3 font-semibold text-ink outline-none focus:border-mustard"
            />
            {error && <p className="mt-2 text-sm font-bold text-coral">{error}</p>}
            <button
              type="submit"
              disabled={state === "sending"}
              className="mt-3 w-full rounded-2xl border-[3px] border-ink bg-coral py-2.5 font-display text-lg text-cream shadow-pop-sm disabled:opacity-60"
            >
              {state === "sending" ? "Sending…" : "Send"}
            </button>
          </div>
        )}
      </form>
    </Panel>
  );
}
