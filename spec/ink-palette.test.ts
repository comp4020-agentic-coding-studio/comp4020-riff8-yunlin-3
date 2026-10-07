import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { INKS } from "../src/ink.ts";

// Every ink a visitor can choose must read clearly on every surface their
// words sit on (the paper, the darkest point of the cloth texture behind
// entries, and the lantern's paper body) and must never be mistaken for
// --seal, whose one meaning is "this colophon is yours".
const css = readFileSync("public/styles.css", "utf8");

function token(name: string): string {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{3,6})`, "i"));
  expect(m, `expected ${name} in styles.css`).toBeTruthy();
  return m![1]!;
}

const channels = (hex: string): number[] => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const linear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string): number => {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const lab = (hex: string): number[] => {
  const [r, g, b] = channels(hex).map(linear);
  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((r! * 0.4124 + g! * 0.3576 + b! * 0.1805) / 0.95047);
  const y = f(r! * 0.2126 + g! * 0.7152 + b! * 0.0722);
  const z = f((r! * 0.0193 + g! * 0.1192 + b! * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const deltaE = (a: string, b: string): number => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]!));

const surfaces = { "--paper": token("--paper"), "--paper-shade": token("--paper-shade"), "--lantern-paper": token("--lantern-paper") };

it("the palette is the five fixed inks, each styled by exactly its key's class", () => {
  expect(INKS.map((i) => i.key)).toEqual(["mo-lan", "dian-qing", "shi-lu", "zi", "mo"]);
  for (const ink of INKS) {
    const rule = css.match(new RegExp(`\\.ink--${ink.key}\\s*\\{([^}]*)\\}`));
    expect(rule, `expected .ink--${ink.key} in styles.css`).toBeTruthy();
    expect(rule![1]!.toLowerCase()).toContain(ink.colour);
  }
});

it("every ink meets 4.5:1 on the paper, the darkest texture behind entries, and the lantern", () => {
  for (const ink of INKS) {
    for (const [name, surface] of Object.entries(surfaces)) {
      expect(contrast(ink.colour, surface), `${ink.key} on ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

it("no ink is red or near --seal", () => {
  const seal = token("--seal");
  for (const ink of INKS) {
    expect(deltaE(ink.colour, seal), `${ink.key} is too close to --seal`).toBeGreaterThan(40);
    const [, a, b] = lab(ink.colour);
    // Reds sit at a strongly positive a* with a hue angle near 0-60 degrees.
    const hue = (Math.atan2(b!, a!) * 180) / Math.PI;
    expect(a! > 20 && hue > -10 && hue < 60, `${ink.key} reads as red`).toBe(false);
  }
});
