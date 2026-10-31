import type { EvidenceBody } from "@/lib/game/types";
import { cx } from "@/lib/cx";

type Chat = Extract<EvidenceBody, { type: "chat" }>;

const SENDERS = ["bg-coral text-cream", "bg-teal text-ink", "bg-lilac text-ink", "bg-mustard text-ink"];
const NAMES = ["text-coral-dk", "text-[#1f7f78]", "text-[#6049c9]", "text-mustard-dk"];

/** The phone the messages were read on. Edits show up loud, because they're usually the point. */
export function ChatPhone({ body }: { body: Chat }) {
  const people = [...new Set(body.messages.map((m) => m.from))];
  const tone = (from: string) => people.indexOf(from) % SENDERS.length;
  const clock = (body.messages.at(-1)?.time ?? "").replace(/\s*[AP]M$/i, "");

  return (
    <div className="mx-auto max-w-[21rem] rounded-[2.2rem] border-[3px] border-ink bg-[#1d2038] p-2 shadow-pop-sm">
      <div className="overflow-hidden rounded-[1.7rem] bg-[#e8ecf7] text-ink">
        <div className="relative flex items-center justify-between bg-white px-5 pt-2 pb-1 text-[0.7rem] font-extrabold">
          <span>{clock}</span>
          <span aria-hidden className="absolute top-1.5 left-1/2 h-4 w-16 -translate-x-1/2 rounded-full bg-[#1d2038]" />
          <span aria-hidden className="flex items-center gap-1">
            <span className="flex items-end gap-px">
              {[4, 6, 8, 10].map((h) => (
                <span key={h} className="w-[3px] rounded-sm bg-ink" style={{ height: h }} />
              ))}
            </span>
            <span className="relative h-2.5 w-5 rounded-[3px] border border-ink p-px">
              <span className="block h-full w-2/3 rounded-[1px] bg-ink" />
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 border-b-2 border-ink/10 bg-white px-3 pb-2">
          <span className="flex -space-x-2">
            {people.slice(0, 3).map((p) => (
              <span key={p} className={cx("grid size-7 place-items-center rounded-full border-2 border-white font-display text-xs", SENDERS[tone(p)])}>
                {p[0]}
              </span>
            ))}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm leading-tight font-extrabold">{body.title}</span>
            <span className="block text-[0.7rem] font-bold text-ink/50">
              {people.length} {people.length === 1 ? "person" : "people"}
            </span>
          </span>
        </div>
        <ul className="space-y-2 px-2.5 py-3">
          {body.messages.map((m, i) => (
            <li key={i} className="flex items-end gap-1.5">
              <span className={cx("grid size-6 shrink-0 place-items-center rounded-full font-display text-[0.65rem]", SENDERS[tone(m.from)])}>{m.from[0]}</span>
              <div className={cx("min-w-0 rounded-2xl rounded-bl-sm bg-white px-3 py-1.5 shadow-[0_1px_0_rgb(27_31_59/0.15)]", m.edited && "ring-2 ring-coral")}>
                <p className={cx("text-xs font-extrabold", NAMES[tone(m.from)])}>{m.from}</p>
                <p className="leading-snug font-semibold break-words">{m.text}</p>
                <p className="mt-0.5 flex items-center justify-end gap-1.5 text-[0.65rem] font-bold text-ink/45">
                  {m.edited && <span className="rounded bg-coral px-1 text-cream">✎ edited</span>}
                  {m.time}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div aria-hidden className="flex items-center gap-2 bg-white px-3 py-2">
          <span className="h-7 flex-1 rounded-full border-2 border-ink/10 px-3 text-xs leading-6 font-semibold text-ink/35">Message</span>
          <span className="size-7 rounded-full bg-ink/10" />
        </div>
        <span aria-hidden className="mx-auto block h-1 w-20 -translate-y-1 rounded-full bg-ink/25" />
      </div>
    </div>
  );
}
