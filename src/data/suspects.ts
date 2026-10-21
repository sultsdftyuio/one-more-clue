export type SuspectId = "triangle" | "square" | "circle" | "rectangle";

export type Suspect = {
  id: SuspectId;
  name: string;
  trait: string;
  /** Tailwind background class matching the character's body colour. */
  accent: string;
};

export const suspects: Suspect[] = [
  { id: "triangle", name: "Tri", trait: "Nervous", accent: "bg-coral" },
  { id: "square", name: "Lord Squarington", trait: "Smug", accent: "bg-mustard" },
  { id: "circle", name: "Ollie", trait: "Shifty", accent: "bg-teal" },
  { id: "rectangle", name: "Rex", trait: "Stern", accent: "bg-lilac" },
];

export function suspectById(id: SuspectId) {
  return suspects.find((s) => s.id === id)!;
}
