import { expect, it } from "vitest";
import { DICTIONARY, searchSeals, suggestWords } from "../src/dictionary.ts";
import { HASH_GLYPHS } from "../src/seal.ts";

it("every dictionary glyph has a pinyin, a gloss and search words, and appears once", () => {
  expect(DICTIONARY.length).toBeGreaterThanOrEqual(100);
  expect(DICTIONARY.length).toBeLessThanOrEqual(150);
  const glyphs = DICTIONARY.map((e) => e.glyph);
  expect(new Set(glyphs).size).toBe(glyphs.length);
  for (const entry of DICTIONARY) {
    expect([...entry.glyph], `${entry.glyph} is one character`).toHaveLength(1);
    expect(entry.pinyin, entry.glyph).toMatch(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/);
    expect(entry.gloss.length, entry.glyph).toBeGreaterThan(0);
    expect(entry.words.length, entry.glyph).toBeGreaterThan(0);
    for (const w of entry.words) expect(w, entry.glyph).toMatch(/^[a-z]+( [a-z]+)*$/);
  }
});

it("the twelve legacy hash glyphs are all in the dictionary, so every seal shown has a meaning", () => {
  expect(HASH_GLYPHS).toEqual(["鑑", "賞", "藏", "觀", "閱", "記", "題", "珍", "玩", "守", "傳", "校"]);
  const glyphs = new Set(DICTIONARY.map((e) => e.glyph));
  for (const g of HASH_GLYPHS) expect(glyphs.has(g), g).toBe(true);
});

it("an English word finds seals by meaning; anything else finds only dictionary suggestions", () => {
  expect(searchSeals("treasure").map((e) => e.glyph)).toEqual(expect.arrayContaining(["藏", "珍"]));
  expect(searchSeals("mountain").map((e) => e.glyph)).toEqual(["山"]);
  expect(searchSeals("Ada Lovelace")).toEqual([]);
  expect(searchSeals("山")).toEqual([]);
  const allWords = new Set(DICTIONARY.flatMap((e) => e.words));
  for (const w of [...suggestWords("mountian"), ...suggestWords("Ada Lovelace"), ...suggestWords("")]) {
    expect(allWords.has(w), `suggestion "${w}" comes from the dictionary`).toBe(true);
  }
  expect(suggestWords("mountian")).toContain("mountain");
});
