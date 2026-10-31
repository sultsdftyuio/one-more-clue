/** A steady made-up reference for paperwork, like "001/417". The same piece always gets the same one. */
export function caseRef(code: string, id: string) {
  const sum = [...id].reduce((total, ch) => (total * 31 + ch.charCodeAt(0)) % 900, 7);
  return `${code.replace(/\D/g, "") || "000"}/${100 + sum}`;
}
