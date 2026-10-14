// The row shape shared by every theme module. Import the dictionary itself
// from src/dictionary.ts, never from here.
export type ThemeKey = "studio" | "mind" | "virtue" | "landscape" | "weather" | "time" | "living" | "kin" | "craft";

export interface SealEntry {
  glyph: string;
  pinyin: string;
  gloss: string;
  words: string[];
  theme: ThemeKey;
}

// A row builder for one theme: glyph, tone-marked pinyin, a short gloss, and
// the comma-separated English words a visitor can type to find it.
export const row =
  (theme: ThemeKey) =>
  (glyph: string, pinyin: string, gloss: string, words: string): SealEntry => ({
    glyph,
    pinyin,
    gloss,
    words: words.split(",").map((w) => w.trim()),
    theme,
  });
