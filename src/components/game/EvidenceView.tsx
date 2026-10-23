import type { ReactNode } from "react";
import type { CaseEvidence, EvidenceBody } from "@/lib/game/types";

const KIND_LABEL: Record<EvidenceBody["type"], string> = {
  statement: "Statement",
  chat: "Messages",
  log: "Log",
  photo: "Photo",
  document: "Document",
};

function Body({ body }: { body: EvidenceBody }) {
  switch (body.type) {
    case "statement":
      return (
        <blockquote className="border-l-4 border-mustard pl-3">
          <p className="leading-relaxed font-semibold">&ldquo;{body.text}&rdquo;</p>
          <footer className="mt-1 text-sm font-extrabold text-ink/60">{body.speaker}</footer>
        </blockquote>
      );
    case "chat":
      return (
        <div>
          <p className="mb-2 text-sm font-extrabold text-ink/60">{body.title}</p>
          <ul className="space-y-2">
            {body.messages.map((m, i) => (
              <li key={i} className="rounded-2xl rounded-tl-sm bg-ink/5 px-3 py-2">
                <p className="text-xs font-extrabold text-ink/60">
                  {m.from} · {m.time}
                  {m.edited && " · edited"}
                </p>
                <p className="leading-snug font-semibold">{m.text}</p>
              </li>
            ))}
          </ul>
        </div>
      );
    case "log":
      return (
        <div>
          <p className="mb-2 text-sm font-extrabold text-ink/60">{body.source}</p>
          <table className="w-full text-left text-sm">
            <tbody>
              {body.rows.map((row, i) => (
                <tr key={i} className="border-t border-ink/10 align-top">
                  <td className="py-1.5 pr-3 font-display whitespace-nowrap text-coral">{row.time}</td>
                  <td className="py-1.5 font-semibold">{row.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "photo":
      return (
        <figure className="-rotate-1 rounded-lg border-[3px] border-ink bg-white p-2 pb-3 shadow-pop-sm">
          <div className="grid min-h-28 place-items-center rounded bg-dusk p-4 text-center text-sm leading-relaxed font-semibold text-cream/90 italic">
            {body.description}
          </div>
          <figcaption className="mt-2 text-center text-xs font-extrabold text-ink/70">{body.caption}</figcaption>
        </figure>
      );
    case "document":
      return <p className="leading-relaxed font-semibold whitespace-pre-line">{body.text}</p>;
  }
}

/** One piece of evidence as a card. `footer` holds actions like "Share to board". */
export function EvidenceView({ evidence, tag, footer }: { evidence: CaseEvidence; tag?: string; footer?: ReactNode }) {
  return (
    <article className="rounded-3xl border-[3px] border-ink bg-cream p-4 text-ink shadow-pop sm:p-5">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display text-xl leading-tight">{evidence.title}</h3>
        <span className="text-xs font-extrabold tracking-widest text-ink/50 uppercase">
          {tag ?? KIND_LABEL[evidence.body.type]}
        </span>
      </header>
      <Body body={evidence.body} />
      {footer && <div className="mt-4">{footer}</div>}
    </article>
  );
}
