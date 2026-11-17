// Prints every line a case speaks out loud, as JSON, for art/voices.py to record.
// Run: node --no-warnings scripts/voice-lines.ts case-001 > art/out/voices/case-001/lines.json
import { caseById } from "../src/data/cases/index.ts";
import { voiceLinesOf } from "../src/lib/game/voice.ts";

const id = process.argv[2];
const caseFile = id && caseById(id);
if (!caseFile) {
  console.error(`No case "${id}". Try case-001.`);
  process.exit(1);
}
console.log(JSON.stringify({ case: caseFile.id, suspects: caseFile.suspects.map(({ id, name, role }) => ({ id, name, role })), lines: voiceLinesOf(caseFile) }, null, 2));
