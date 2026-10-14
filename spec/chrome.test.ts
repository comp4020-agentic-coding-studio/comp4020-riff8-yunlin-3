import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { newVisitor, page } from "./helpers.ts";

// Page chrome that holds across every page: one top-level heading each, and
// the stylesheet's promises for high contrast and short screens.
const doc = (html: string) => new JSDOM(html).window.document;

it("every page has exactly one h1; on the README and ADR pages the banner isn't one", async () => {
  const cookie = await newVisitor();
  for (const path of ["/", "/seal", "/seal?q=river", "/readme/", "/adr/0001-seal-claims/", "/adr/0002-who-did-what/"]) {
    const d = doc(await page(path, cookie));
    expect(d.querySelectorAll("h1"), path).toHaveLength(1);
    if (path.startsWith("/readme") || path.startsWith("/adr")) {
      const title = d.querySelector(".site-title")!;
      expect(title, path).toBeTruthy();
      expect(title.tagName, path).toBe("P");
      expect(d.querySelector("h1")!.closest(".site-header"), `${path}: the h1 is the document's own title`).toBeNull();
    }
  }
});

it("the legend's summary is plain words, no drawn triangle", async () => {
  const summary = doc(await page("/")).querySelector(".seal-legend summary")!;
  expect(summary.textContent!.trim()).toBe("Seals on this scroll");
  expect(summary.textContent).not.toMatch(/[▸▶►▹]/);
});

const css = readFileSync("public/styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// The body of each top-level @media block whose condition matches.
function media(condition: RegExp): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/@media([^{]*)\{/g)) {
    if (!condition.test(m[1]!)) continue;
    let depth = 1;
    let j = m.index! + m[0].length;
    for (; j < css.length && depth > 0; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
    }
    out.push(css.slice(m.index! + m[0].length, j - 1));
  }
  return out;
}

const rule = (block: string, selector: string) =>
  [...block.matchAll(/([^{}]+)\{([^}]*)\}/g)].find((m) => m[1]!.split(",").some((s) => s.trim() === selector))?.[2];

it("in forced colours the chosen ink keeps a visible mark and the strip keeps its own colours", () => {
  const blocks = media(/forced-colors\s*:\s*active/);
  expect(blocks.length, "expected an @media (forced-colors: active) block").toBeGreaterThan(0);
  const all = blocks.join("\n");
  expect(rule(all, ".swatch:has(input:checked)")).toMatch(/outline\s*:[^;]*\bHighlight\b/);
  expect(rule(all, ".scroll-overview")).toMatch(/forced-color-adjust\s*:\s*none/);
});

it("a short screen, measured in em so zoom and large text count, gets the compact dock", () => {
  // The phone layout's own block: a width query OR'd with an em height
  // query, so a short desktop window or big text gets the same compact dock.
  const conditions = [...css.matchAll(/@media([^{]*)\{/g)].map((m) => m[1]!.trim());
  const compact = conditions.find((c) => /\(\s*width\s*<\s*[\d.]+r?em\s*\)/.test(c) && c.includes(","));
  expect(compact, "expected a phone-width @media OR'd with a height query").toBeTruthy();
  expect(compact).toMatch(/\(\s*height\s*<\s*[\d.]+em\s*\)/);
  const block = media(new RegExp(compact!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))[0]!;
  expect(block).toMatch(/(^|\s|})\.dock\s*\{/);
  expect(block).toMatch(/--dock-h\s*:/);
});
