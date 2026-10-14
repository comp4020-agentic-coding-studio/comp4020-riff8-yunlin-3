import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// CLAUDE.md states a rule this stylesheet already broke once (found and fixed
// in the same commit as this test): "if the accent colour (--seal) gets a
// second meaning beyond 'this colophon is yours,' that's a sign the design
// has drifted, not a sign to add a second colour." A prior crit's own --seal
// drifted into an unrelated .error banner unnoticed for several runs (see
// ../memory/MEMORY.md) because every check reasoned about the accent from the
// colophon markup, never by rereading the whole stylesheet for each use. This
// greps every var(--seal) directly so a future edit can't reintroduce that
// silently, the same way a patched line with no test behind it did last time.
// Every stylesheet the page loads: the theme, and the handscroll's own.
const sheets = ["public/styles.css", "public/scroll.css"];

// A seal is a <details> whose <summary> is the stamp itself: outlined for a
// random hash glyph, filled for a chosen seal. Both are still "yours" only.
// The overview strip's ticks mark where your own lines are (decisions.md D4):
// the same meaning, drawn small.
const ALLOWED: Record<string, string[]> = {
  "public/styles.css": [
    ".colophon--mine .colophon-seal summary",
    ".colophon--mine .seal--chosen summary",
    ".colophon--mine .colophon-date",
  ],
  "public/scroll.css": [".scroll-overview-tick"],
};

function sealSelectors(file: string): string[] {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("}")
    .map((rule) => rule.replace(/\s+/g, " ").trim())
    .filter((rule) => /var\(\s*--seal\b/.test(rule))
    .map((rule) => rule.slice(0, rule.lastIndexOf("{")).split("{").at(-1)!.trim());
}

it("var(--seal) marks only a colophon that belongs to the current browser", () => {
  for (const file of sheets) {
    for (const selector of sealSelectors(file)) {
      expect(ALLOWED[file], `unexpected var(--seal) use in ${file}: "${selector}"`).toContain(selector);
    }
  }
});

it("the overview ticks are the one --seal use in the handscroll's stylesheet", () => {
  expect(sealSelectors("public/scroll.css")).toEqual([".scroll-overview-tick"]);
});
