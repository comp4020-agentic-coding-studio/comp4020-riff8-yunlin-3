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

const normalise = (s: string): string => s.trim().toLowerCase().replace(/[^a-z ]/g, "");

// Exact word matches first, then a prefix match for three or more letters
// ("rem" finds remember, recall's 念 and 憶 too, by their words).
export function searchSeals(query: string): SealEntry[] {
  const q = normalise(query);
  if (q.length === 0) return [];
  const exact = DICTIONARY.filter((entry) => entry.words.includes(q));
  if (exact.length > 0) return exact;
  if (q.length < 3) return [];
  return DICTIONARY.filter((entry) => entry.words.some((w) => w.startsWith(q)));
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

const ALL_WORDS = [...new Set(DICTIONARY.flatMap((entry) => entry.words))];
const FALLBACK_SUGGESTIONS = ["keep", "look", "mountain", "remember", "dream"];

// When a word finds nothing: the dictionary's own words nearest in spelling,
// or a few starting points. Only ever words from the list, never the input.
export function suggestWords(query: string): string[] {
  const q = normalise(query);
  if (q.length === 0) return FALLBACK_SUGGESTIONS;
  const near = ALL_WORDS.map((w) => ({ w, d: distance(q, w) }))
    .filter(({ d }) => d <= Math.max(1, Math.floor(q.length / 3)))
    .sort((a, b) => a.d - b.d || a.w.localeCompare(b.w))
    .slice(0, 5)
    .map(({ w }) => w);
  return near.length > 0 ? near : FALLBACK_SUGGESTIONS;
}
