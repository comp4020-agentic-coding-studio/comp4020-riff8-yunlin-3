import { expect, it } from "vitest";
import { DICTIONARY, THEMES, searchSeals, sealsByTheme, suggestWords } from "../src/dictionary.ts";
import { HASH_GLYPHS } from "../src/seal.ts";

// prompt.md §8 T4: the dictionary grows to at least 800 entries, at most
// 2,000. The first batch lands at M1 with at least 450; raised to 800 at M2.
const MIN_ENTRIES = 450;
const MAX_ENTRIES = 2000;

it("every dictionary glyph has a pinyin, a gloss, search words and a theme, and appears once", () => {
  expect(DICTIONARY.length).toBeGreaterThanOrEqual(MIN_ENTRIES);
  expect(DICTIONARY.length).toBeLessThanOrEqual(MAX_ENTRIES);
  const glyphs = DICTIONARY.map((e) => e.glyph);
  expect(new Set(glyphs).size).toBe(glyphs.length);
  const themes = new Set(THEMES.map((t) => t.key));
  for (const entry of DICTIONARY) {
    expect([...entry.glyph], `${entry.glyph} is one character`).toHaveLength(1);
    expect(entry.pinyin, entry.glyph).toMatch(/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/);
    expect(entry.gloss.length, entry.glyph).toBeGreaterThan(0);
    expect(entry.words.length, entry.glyph).toBeGreaterThan(0);
    for (const w of entry.words) expect(w, entry.glyph).toMatch(/^[a-z]+( [a-z]+)*$/);
    expect(themes.has(entry.theme), `${entry.glyph} has a known theme`).toBe(true);
  }
});

it("every theme has seals, and browsing a theme returns exactly that theme's rows", () => {
  expect(THEMES.map((t) => t.key)).toEqual([
    "studio",
    "mind",
    "virtue",
    "landscape",
    "weather",
    "time",
    "living",
    "kin",
    "craft",
  ]);
  let total = 0;
  for (const { key, name } of THEMES) {
    expect(name.length, key).toBeGreaterThan(0);
    const rows = sealsByTheme(key);
    expect(rows.length, key).toBeGreaterThan(0);
    for (const row of rows) expect(row.theme).toBe(key);
    total += rows.length;
  }
  expect(total).toBe(DICTIONARY.length);
});

it("the twelve legacy hash glyphs are all in the dictionary, so every seal shown has a meaning", () => {
  expect(HASH_GLYPHS).toEqual(["鑑", "賞", "藏", "觀", "閱", "記", "題", "珍", "玩", "守", "傳", "校"]);
  const glyphs = new Set(DICTIONARY.map((e) => e.glyph));
  for (const g of HASH_GLYPHS) expect(glyphs.has(g), g).toBe(true);
});

it("an English word finds seals by meaning; anything else finds only dictionary suggestions", () => {
  expect(searchSeals("treasure").map((e) => e.glyph)).toEqual(expect.arrayContaining(["藏", "珍"]));
  expect(searchSeals("mountain")[0]!.glyph).toBe("山");
  expect(searchSeals("Ada Lovelace")).toEqual([]);
  expect(searchSeals("山")).toEqual([]);
  const allWords = new Set(DICTIONARY.flatMap((e) => e.words));
  for (const w of [...suggestWords("mountian"), ...suggestWords("Ada Lovelace"), ...suggestWords("")]) {
    expect(allWords.has(w), `suggestion "${w}" comes from the dictionary`).toBe(true);
  }
  expect(suggestWords("mountian")).toContain("mountain");
});

const glyphsFor = (q: string) => searchSeals(q).map((e) => e.glyph);

it("search ignores case and folds simple plurals", () => {
  expect(glyphsFor("Mountains")[0]).toBe("山");
  expect(glyphsFor("MOUNTAIN")).toEqual(glyphsFor("mountain"));
  expect(glyphsFor("RIVERS")).toEqual(expect.arrayContaining(["川", "江"]));
  expect(glyphsFor("Friends")).toContain("友");
  expect(glyphsFor("memories")).toContain("憶");
});

it("search folds -ing and -ed", () => {
  expect(glyphsFor("dreaming")).toContain("夢");
  expect(glyphsFor("dreamed")).toContain("夢");
  expect(glyphsFor("remembered")).toEqual(expect.arrayContaining(["記", "念", "憶"]));
  expect(glyphsFor("walking")).toContain("行");
  expect(glyphsFor("treasured")).toEqual(expect.arrayContaining(["藏", "珍"]));
});

it("a common word leads with its plainest seal, and a short typo isn't 'corrected' into another word", () => {
  expect(glyphsFor("home")[0]).toBe("家");
  expect(glyphsFor("Homes")[0]).toBe("家");
  // Near-spelling suggestions only for longer words: "dog" must not become "fog".
  expect(suggestWords("dog")).not.toContain("fog");
  expect(suggestWords("fog")).not.toContain("dog");
});

it("an exact word match ranks above a folded one, a prefix, or a gloss", () => {
  for (const q of ["dream", "river", "tea", "moon", "rain"]) {
    const results = searchSeals(q);
    expect(results.length, q).toBeGreaterThan(0);
    const firstLoose = results.findIndex((e) => !e.words.includes(q));
    const lastExact = results.map((e) => e.words.includes(q)).lastIndexOf(true);
    expect(lastExact, `${q}: an exact match exists`).toBeGreaterThanOrEqual(0);
    if (firstLoose !== -1) expect(lastExact, `${q}: every exact match comes first`).toBeLessThan(firstLoose);
  }
});

it("everyday words a visitor might type each find a seal", () => {
  const everyday = [
    "love",
    "home",
    "friend",
    "dream",
    "remember",
    "peace",
    "river",
    "moon",
    "rain",
    "snow",
    "spring",
    "cloud",
    "pine",
    "bird",
    "tea",
  ];
  for (const w of everyday) expect(searchSeals(w).length, w).toBeGreaterThan(0);
});

// Every query is timed three times and its fastest run kept, so one GC pause
// can't fail the suite, while a query that is genuinely slow still does.
it("search over the whole dictionary stays under 5 ms a query", () => {
  const words = [...new Set(DICTIONARY.flatMap((e) => e.words))];
  const pool = [...words, ...words.map((w) => `${w}s`), ...words.map((w) => `${w}ing`)];
  const queries = [...pool.filter((_, i) => i % Math.max(1, Math.floor(pool.length / 990)) === 0)];
  queries.push("Ada Lovelace", "zzzz", "mou", "Rivers", "dreaming", "a", "the quiet river");
  expect(queries.length).toBeGreaterThanOrEqual(1000);
  for (const q of queries.slice(0, 50)) searchSeals(q); // warm up
  let worst = 0;
  let worstQuery = "";
  for (const q of queries) {
    let best = Infinity;
    for (let run = 0; run < 3; run++) {
      const t = performance.now();
      searchSeals(q);
      best = Math.min(best, performance.now() - t);
    }
    if (best > worst) [worst, worstQuery] = [best, q];
  }
  expect(worst, `slowest query: "${worstQuery}"`).toBeLessThan(5);
});
