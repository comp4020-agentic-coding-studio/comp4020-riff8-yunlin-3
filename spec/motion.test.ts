import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// CLAUDE.md: every animation respects prefers-reduced-motion. This finds
// every rule in styles.css that starts an animation and checks the
// reduced-motion block switches it off, either by name or by hiding the
// layer it lives in, so a new animation can't ship without its reduced path.
const css = readFileSync("public/styles.css", "utf8").replace(/\/\*[^]*?\*\//g, "");

function block(prelude: string): string {
  const start = css.indexOf(prelude);
  expect(start, `expected "${prelude}" in styles.css`).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error("unbalanced block");
}

const reduced = block("@media (prefers-reduced-motion: reduce)");
// Layers the reduced block hides outright, and what lives inside them.
const HIDDEN_LAYERS: Record<string, string> = { ".lantern": ".lantern-sky", ".lantern--faint": ".lantern-sky" };

it("every animated selector is switched off under prefers-reduced-motion", () => {
  const outside = css
    .replace(reduced, "")
    .replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  const animated = [...outside.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /(^|;|\s)animation\s*:\s*(?!none)/.test(body!))
    .flatMap(([, selectors]) => selectors!.split(",").map((s) => s.trim()));
  expect(animated.length).toBeGreaterThan(5);
  for (const selector of animated) {
    const covered = reduced.includes(selector) || (HIDDEN_LAYERS[selector] && reduced.includes(HIDDEN_LAYERS[selector]!));
    expect(covered, `${selector} animates with no reduced-motion override`).toBeTruthy();
  }
});
