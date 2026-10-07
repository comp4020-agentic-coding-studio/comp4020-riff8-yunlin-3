import { expect, it } from "vitest";
import { marker, newVisitor, page, post } from "./helpers.ts";

// docs/adr/0001-seal-claims.md: a seal chosen from the dictionary belongs to
// one visitor at a time, first come, decided by a UNIQUE constraint rather
// than a check-then-insert. Everything here is the plain no-JS flow: a GET
// search form, then a POST to claim. Each test releases what it claims, so a
// local database reused across runs doesn't fill the pool.

// Glyphs this visitor could take right now for a word, from the page's own
// claim forms.
async function freeGlyphs(word: string, cookie: string): Promise<string[]> {
  const html = await page(`/seal?q=${encodeURIComponent(word)}`, cookie);
  return [...html.matchAll(/name="glyph" value="([^"]+)"/g)].map((m) => m[1]!).filter(Boolean);
}

const claim = (glyph: string, cookie: string, q = "") => post("/seal", { glyph, q }, cookie);
const release = (cookie: string) => post("/seal", { glyph: "" }, cookie);

function entryFor(html: string, text: string): string {
  const at = html.indexOf(text);
  expect(at, `expected "${text}" on the page`).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<li", at), html.indexOf("</li>", at));
}

it("an English word lists matching seals as glyph, pinyin and gloss; a word with none says so and suggests others", async () => {
  const cookie = await newVisitor();
  const found = await page("/seal?q=mountain", cookie);
  expect(found).toMatch(/山<\/span> shān: mountain/);

  const none = await page("/seal?q=Ada%20Lovelace", cookie);
  expect(none).toContain("No seal for that word");
  expect(none).toMatch(/href="\/seal\?q=keep"/);
  expect(none).not.toContain("value=\"阿"); // no transliteration of the input
});

it("two simultaneous claims of the same seal: exactly one wins, the other is refused and shown alternatives", async () => {
  const [a, b] = await Promise.all([newVisitor(), newVisitor()]);
  const free = await freeGlyphs("remember", a);
  expect(free.length, "need a free seal for 'remember' to race over").toBeGreaterThan(0);
  const glyph = free[0]!;

  // Each writes a line first, so the race can't touch their entries.
  const lineA = marker("race-a");
  const lineB = marker("race-b");
  await post("/colophons", { body: lineA }, a);
  await post("/colophons", { body: lineB }, b);
  const before = await page("/");
  const sealA = entryFor(before, lineA).match(/<summary[^>]*>/)![0];
  const sealB = entryFor(before, lineB).match(/<summary[^>]*>/)![0];

  const [ra, rb] = await Promise.all([claim(glyph, a, "remember"), claim(glyph, b, "remember")]);
  const locations = [ra, rb].map((r) => decodeURIComponent(r.headers.get("location") ?? ""));
  const won = locations.filter((l) => l.includes(`claimed=${glyph}`));
  const lost = locations.filter((l) => l.includes("error=taken"));
  expect(won).toHaveLength(1);
  expect(lost).toHaveLength(1);

  const loser = locations[0]!.includes("error=taken") ? a : b;
  const winner = loser === a ? b : a;
  const refusal = await page(new URL(lost[0]!, "http://x").pathname + new URL(lost[0]!, "http://x").search, loser);
  expect(refusal).toContain("Someone else already holds");
  expect(refusal).toMatch(new RegExp(`${glyph}</span> [^<]+<em>— taken</em>`));
  expect(refusal).toContain('name="glyph"'); // alternatives to take instead

  const after = await page("/");
  expect(entryFor(after, lineA).match(/<summary[^>]*>/)![0]).toBe(sealA);
  expect(entryFor(after, lineB).match(/<summary[^>]*>/)![0]).toBe(sealB);

  await release(winner);
});

it("a visitor holds one claim: changing seals releases the old one, and old lines keep the seal they were written with", async () => {
  const cookie = await newVisitor();
  const [first, second] = await freeGlyphs("water", cookie).then(async (w) => [
    w[0]!,
    (await freeGlyphs("cloud", cookie))[0]!,
  ]);
  expect((await claim(first!, cookie)).headers.get("location")).toContain("claimed=");
  const oldLine = marker("old-seal");
  await post("/colophons", { body: oldLine }, cookie);

  expect((await claim(second!, cookie)).headers.get("location")).toContain("claimed=");
  const newLine = marker("new-seal");
  await post("/colophons", { body: newLine }, cookie);

  const html = await page("/", cookie);
  expect(entryFor(html, oldLine)).toContain(`Seal ${first}`);
  expect(entryFor(html, newLine)).toContain(`Seal ${second}`);

  // The first glyph is free again for anyone else.
  const stranger = await newVisitor();
  expect(await freeGlyphs("water", stranger)).toContain(first);

  await release(cookie);
  expect(await freeGlyphs("cloud", stranger)).toContain(second);
});

it("only dictionary glyphs can be claimed", async () => {
  const cookie = await newVisitor();
  const res = await claim("A", cookie);
  expect(res.headers.get("location")).toContain("error=unknown");
  const res2 = await claim("我", cookie);
  expect(res2.headers.get("location")).toContain("error=unknown");
});
