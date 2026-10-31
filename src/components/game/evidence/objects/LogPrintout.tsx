import type { EvidenceBody } from "@/lib/game/types";

type Log = Extract<EvidenceBody, { type: "log" }>;

/** System records come off the old sprocket-feed printer, green bars and all. */
export function LogPrintout({ body }: { body: Log }) {
  return (
    <div className="obj-printout font-printer text-[1.2rem] leading-[1.3rem] text-[#27304f]">
      <div className="obj-printout-sheet">
        <p className="border-b-2 border-dashed border-[#27304f]/40 px-1 pb-1.5 text-center">{body.source}</p>
        <table className="w-full">
          <tbody>
            {body.rows.map((row, i) => (
              <tr key={i} className="align-top odd:bg-[#d9eeda]">
                <td className="py-1 pr-2 pl-1.5 whitespace-nowrap text-[#b23a3a]">{row.time}</td>
                <td className="py-1 pr-1.5">{row.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="pt-1.5 text-center text-[1rem] text-[#27304f]/55">End of report</p>
      </div>
    </div>
  );
}
