// The fixed palette a visitor writes in. The form posts a key; the server
// only ever renders a class name from this list (ink--<key>), so no visitor
// input ever reaches a style attribute and no arbitrary colour can be chosen.
// None of these is red: --seal keeps its one meaning, "this colophon is yours".
export interface Ink {
  key: string;
  name: string;
  hanzi: string;
  colour: string;
}

export const INKS: readonly Ink[] = [
  { key: "mo-lan", hanzi: "墨藍", name: "blue ink", colour: "#2a4f9a" },
  { key: "dian-qing", hanzi: "靛青", name: "indigo", colour: "#1f3a6e" },
  { key: "shi-lu", hanzi: "石綠", name: "malachite", colour: "#2f6b57" },
  { key: "zi", hanzi: "紫", name: "plum", colour: "#6a3a5c" },
  { key: "mo", hanzi: "墨", name: "ink black", colour: "#2b2721" },
];

export const DEFAULT_INK = "mo-lan";

export function inkKey(raw: string | null | undefined): string | undefined {
  if (raw === null || raw === undefined || raw === "") return DEFAULT_INK;
  return INKS.some((ink) => ink.key === raw) ? raw : undefined;
}
