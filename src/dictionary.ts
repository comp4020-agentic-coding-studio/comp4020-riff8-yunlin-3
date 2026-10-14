// Needs review by a Chinese reader before it is trusted.
//
// The seals a visitor may choose from: single characters of the kind
// collectors and painters carved onto their seals (looking, keeping,
// inscribing, and the scenery and states of mind a scholar's studio named
// itself after), in traditional forms to match the original twelve hash
// glyphs. Each row is glyph, pinyin with tone marks, a short English gloss,
// and the English words a visitor can type to find it. Nothing outside this
// list can ever become a seal, and no arbitrary input is ever transliterated:
// that would be a name field in disguise.
import { CRAFT } from "./dictionary/craft.ts";
import type { SealEntry, ThemeKey } from "./dictionary/entry.ts";
import { KIN } from "./dictionary/kin.ts";
import { LANDSCAPE } from "./dictionary/landscape.ts";
import { LIVING } from "./dictionary/living.ts";
import { MIND } from "./dictionary/mind.ts";
import { STUDIO } from "./dictionary/studio.ts";
import { TIME } from "./dictionary/time.ts";
import { VIRTUE } from "./dictionary/virtue.ts";
import { WEATHER } from "./dictionary/weather.ts";

export type { SealEntry, ThemeKey };

// Display order for browsing the dictionary by theme.
export const THEMES: readonly { key: ThemeKey; name: string }[] = [
  { key: "studio", name: "Studio and study" },
  { key: "mind", name: "States of mind" },
  { key: "virtue", name: "Virtues" },
  { key: "landscape", name: "Landscape" },
  { key: "weather", name: "Sky and weather" },
  { key: "time", name: "Seasons and hours" },
  { key: "living", name: "Animals and plants" },
  { key: "kin", name: "Kin and home" },
  { key: "craft", name: "Crafts and arts" },
];

// The rows live one module per theme in src/dictionary/; this file is the
// only one anything else imports.
export const DICTIONARY: readonly SealEntry[] = [
  ...STUDIO,
  ...MIND,
  ...VIRTUE,
  ...LANDSCAPE,
  ...WEATHER,
  ...TIME,
  ...LIVING,
  ...KIN,
  ...CRAFT,
];

export function sealsByTheme(key: ThemeKey): SealEntry[] {
  return DICTIONARY.filter((entry) => entry.theme === key);
}

const BY_GLYPH = new Map(DICTIONARY.map((entry) => [entry.glyph, entry]));

export function lookupGlyph(glyph: string): SealEntry | undefined {
  return BY_GLYPH.get(glyph);
}

const normalise = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .replace(/ +/g, " ")
    .trim();

// A crude stemmer, applied to the query and the dictionary alike, so it only
// has to be consistent, not correct: "rains", "raining" and "rained" all fold
// to "rain"; "studies" and "study" both to "study"; "dancing" and "dance" to
// "danc".
function foldWord(w: string): string {
  let s = w;
  if (s.length > 4 && /(ies|ied)$/.test(s)) s = s.slice(0, -3) + "y";
  else if (s.length > 4 && /(ss|x|z|ch|sh)es$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 5 && s.endsWith("ing")) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith("ed")) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  if (s.length > 3 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
}

const fold = (phrase: string): string => phrase.split(" ").map(foldWord).join(" ");

const STOP = new Set(["a", "an", "the", "to", "of", "and", "or", "in", "on", "for", "with", "at", "by", "from", "as"]);

// Built once at module load so a search is a few map lookups and one pass
// over the dictionary's distinct words.
interface Indexed {
  entry: SealEntry;
  order: number;
  first: string;
  glossFirst: string;
}

const INDEXED: Indexed[] = DICTIONARY.map((entry, order) => {
  const glossWords = normalise(entry.gloss.replace(/[^A-Za-z]+/g, " ")).split(" ");
  return { entry, order, first: entry.words[0]!, glossFirst: glossWords.find((w) => !STOP.has(w)) ?? "" };
});

function addTo(map: Map<string, Set<Indexed>>, key: string, item: Indexed): void {
  let set = map.get(key);
  if (!set) map.set(key, (set = new Set()));
  set.add(item);
}

const EXACT = new Map<string, Set<Indexed>>();
const FOLDED = new Map<string, Set<Indexed>>();
const GLOSS = new Map<string, Set<Indexed>>();
for (const item of INDEXED) {
  for (const w of item.entry.words) {
    addTo(EXACT, w, item);
    addTo(FOLDED, fold(w), item);
  }
  for (const g of normalise(item.entry.gloss.replace(/[^A-Za-z]+/g, " ")).split(" ")) {
    if (g.length === 0 || STOP.has(g)) continue;
    addTo(GLOSS, g, item);
    addTo(GLOSS, foldWord(g), item);
  }
}
const WORD_LIST = [...EXACT.keys()];

// Every seal whose words match, best first: an exact word, then the same word
// folded ("rivers", "raining"), then a word starting with the query (three or
// more letters), then a whole word of the gloss. Within a rank, entries the
// query names first (their first word, or the head of their gloss) lead, then
// dictionary order. Nothing outside the dictionary ever matches.
export function searchSeals(query: string): SealEntry[] {
  const q = normalise(query);
  if (q.length === 0) return [];
  const fq = fold(q);
  const rank = new Map<Indexed, number>();
  const offer = (items: Iterable<Indexed> | undefined, r: number): void => {
    for (const item of items ?? []) if (!rank.has(item)) rank.set(item, r);
  };
  offer(EXACT.get(q), 0);
  offer(FOLDED.get(fq), 1);
  if (q.length >= 3) for (const w of WORD_LIST) if (w.startsWith(q)) offer(EXACT.get(w), 2);
  if (!q.includes(" ")) {
    offer(GLOSS.get(q), 3);
    offer(GLOSS.get(fq), 3);
  }
  const leads = (item: Indexed): number =>
    item.first === q || fold(item.first) === fq || item.glossFirst === q || foldWord(item.glossFirst) === fq ? 0 : 1;
  return [...rank]
    .sort(([a, ra], [b, rb]) => ra - rb || leads(a) - leads(b) || a.order - b.order)
    .map(([item]) => item.entry);
}

// Optimal string alignment distance: Levenshtein plus adjacent transposition,
// so "mountian" is one slip from "mountain".
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

const FALLBACK_SUGGESTIONS = ["keep", "look", "mountain", "remember", "dream"];

// When a word finds nothing: dictionary words one slip away in spelling, for
// words of five letters or more (shorter ones throw up jokes: "dog" is one
// letter from "fog"), else a few starting points. Only ever words from the
// list, never the input.
export function suggestWords(query: string): string[] {
  const q = normalise(query);
  if (q.length < 5) return FALLBACK_SUGGESTIONS;
  const near = WORD_LIST.filter((w) => Math.abs(w.length - q.length) <= 1 && distance(q, w) <= 1)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 5);
  return near.length > 0 ? near : FALLBACK_SUGGESTIONS;
}
