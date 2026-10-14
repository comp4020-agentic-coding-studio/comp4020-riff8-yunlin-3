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

// Sheet widths are fixed lengths held in custom properties on .handscroll,
// not clamp() on vw: every sheet's box is known before it renders, which is
// what keeps a scroll of thousands of lines smooth (prompt.md §8 T3).
const rem = (name: string) => {
  const m = new RegExp(`${name}\\s*:\\s*([\\d.]+)rem\\s*;`).exec(ruleFor(".handscroll") ?? "");
  expect(m, `.handscroll sets ${name} in rem`).toBeTruthy();
  return Number(m![1]);
};

it("scroll.css sizes each length bucket from its own fixed width: short < mid < long", () => {
  const short = rem("--sheet-short");
  const mid = rem("--sheet-mid");
  const long = rem("--sheet-long");
  expect(short).toBeLessThan(mid);
  expect(mid).toBeLessThan(long);
  const buckets: [string, string][] = [
    [".scroll .colophon--short", "--sheet-short"],
    [".scroll .colophon--mid", "--sheet-mid"],
    [".scroll .colophon", "--sheet-long"],
  ];
  for (const [selector, prop] of buckets) {
    const rule = ruleFor(selector);
    expect(rule, `expected a ${selector} rule in scroll.css`).toBeTruthy();
    expect(rule, `${selector} width`).toMatch(new RegExp(`(?:^|;)\\s*width\\s*:\\s*var\\(${prop}\\)`));
    // The placeholder size an unrendered sheet reserves matches its width,
    // or the scroll jumps as sheets render.
    expect(rule, `${selector} placeholder`).toMatch(new RegExp(`contain-intrinsic-size\\s*:\\s*var\\(${prop}\\)`));
  }
  // A narrow screen may shrink the long sheet, but never below mid.
  for (const m of scrollCss.matchAll(/--sheet-long\s*:\s*([\d.]+)rem/g)) expect(Number(m[1])).toBeGreaterThan(mid);
});

// Top-level rules of scroll.css with the @media condition they sit in, if
// any (one level of nesting is all this stylesheet uses).
function rulesWithMedia(): { media: string; selector: string; body: string }[] {
  const out: { media: string; selector: string; body: string }[] = [];
  let i = 0;
  const css = scrollCss;
  const block = (from: number): number => {
    let depth = 0;
    for (let j = from; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) return j;
    }
    return css.length;
  };
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    const head = css.slice(i, open).trim();
    const close = block(open);
    const inner = css.slice(open + 1, close);
    if (head.startsWith("@media")) {
      for (const m of inner.matchAll(/([^{}]+)\{([^}]*)\}/g)) out.push({ media: head, selector: m[1]!.trim(), body: m[2]! });
    } else {
      out.push({ media: "", selector: head, body: inner });
    }
    i = close + 1;
  }
  return out;
}

// Every sheet skips rendering while off screen, with or without script:
// the base rule says content-visibility: auto, and only print overrides it
// (to show every line on paper).
it("every sheet keeps content-visibility: auto; only print overrides it", () => {
  expect(ruleFor(".scroll .colophon")).toMatch(/content-visibility\s*:\s*auto/);
  const overrides = rulesWithMedia().filter((r) => /content-visibility\s*:\s*(?:hidden|visible)\b/.test(r.body));
  for (const { media, selector } of overrides) {
    expect(/\bprint\b/.test(media), `"${media} ${selector}" overrides content-visibility outside print`).toBe(true);
  }
});

// A line taller than its sheet (320 full-width characters) scrolls inside the
// sheet; while more is below, its foot fades (a real bug: the text was hidden
// with no sign). And no rule or script ever stops a sheet rendering for good:
// the browser's find and copy have to reach every line.
it("an overflowing body fades at the foot while more is below", () => {
  const rule = ruleFor(".scroll .colophon-body[data-more]");
  expect(rule, "expected a .colophon-body[data-more] rule in scroll.css").toBeTruthy();
  expect(rule).toMatch(/(?:-webkit-)?mask-image\s*:[^;]*transparent/);
  expect(ruleFor(".scroll .colophon-body[data-overflow]:focus-visible")).toMatch(/outline\s*:/);
});

it("nothing hides a sheet's content from find and copy", () => {
  expect(scrollCss).not.toMatch(/content-visibility\s*:\s*hidden/);
  const js = readFileSync("public/scroll.js", "utf8");
  expect(js).not.toMatch(/content-?visibility/i);
});
