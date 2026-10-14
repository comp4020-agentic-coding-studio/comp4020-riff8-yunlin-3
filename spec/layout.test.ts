import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// A colophon can never be edited or deleted, so a layout bug one body
// triggers is permanent for every future visitor. A single long word with no
// spaces (well within the 320-character limit — a pasted URL, a mashed key,
// anything) has no natural break point: without overflow-wrap, a CSS grid
// column won't shrink below that word's min-content width, so it blew the
// whole page out sideways. Confirmed live before this fix (scrollWidth 2203
// vs an innerWidth of 1280) and after (736, matching the intended 46rem body
// max-width). This greps the actual rule rather than re-deriving a browser
// layout check, the same style as accent.test.ts for a CSS property no
// request-level test can see.
const css = readFileSync("public/styles.css", "utf8");

it(".colophon-body can't be blown out sideways by an unbroken run of text", () => {
  const match = css.match(/\.colophon-body\s*\{([^}]*)\}/);
  expect(match, "expected a .colophon-body rule in styles.css").toBeTruthy();
  expect(match![1]).toMatch(/overflow-wrap\s*:\s*anywhere/);
});

// Decision D8 (contract B): each sheet's width follows its line's length, a
// short note on a narrow sheet, a long one on the widest. Every bucket needs
// a width, and a matching placeholder size for content-visibility, or an
// off-screen sheet reserves the wrong room and the scroll jumps as it renders.
const scrollCss = readFileSync("public/scroll.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function ruleFor(selector: string): string | undefined {
  for (const m of scrollCss.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (m[1]!.split(",").some((s) => s.trim() === selector)) return m[2];
  }
  return undefined;
}

it("scroll.css sizes each length bucket: short narrowest, long (the base sheet) widest", () => {
  const rem = (rule: string | undefined, name: string) => {
    expect(rule, `expected a ${name} rule in scroll.css`).toBeTruthy();
    const w = /(?:^|;)\s*width\s*:\s*clamp\(\s*([\d.]+)rem\s*,[^,]+,\s*([\d.]+)rem\s*\)/.exec(rule!);
    expect(w, `${name} sets width: clamp(<min>rem, …, <max>rem)`).toBeTruthy();
    expect(rule, `${name} sets contain-intrinsic-size`).toMatch(/contain-intrinsic-size\s*:/);
    return [Number(w![1]), Number(w![2])] as const;
  };
  const short = rem(ruleFor(".scroll .colophon--short"), ".colophon--short");
  const mid = rem(ruleFor(".scroll .colophon--mid"), ".colophon--mid");
  const long = rem(ruleFor(".scroll .colophon--long") ?? ruleFor(".scroll .colophon"), ".colophon--long / .colophon");
  expect(short[1]).toBeLessThanOrEqual(mid[0]);
  expect(mid[1]).toBeLessThanOrEqual(long[0]);
});
