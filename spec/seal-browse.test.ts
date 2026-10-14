import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
import { SEALS_PER_PAGE } from "../src/render.ts";
import { THEMES, sealsByTheme } from "../src/dictionary.ts";
import { baseUrl, newVisitor, page } from "./helpers.ts";

// L2 (prompt.md §8 T4: "The seal page shows the results without becoming a
// wall: paginate or group them, and say how many matched"). Everything here
// is plain GET links, so it works without JavaScript.
const doc = (html: string) => new JSDOM(html).window.document;
const rows = (d: Document) => d.querySelectorAll(".seal-results > li.seal-result");
const count = (n: number) => `${new Intl.NumberFormat("en-AU").format(n)} ${n === 1 ? "seal" : "seals"}`;

it("every theme is linked from /seal, and each lists its seals with a count", async () => {
  const cookie = await newVisitor();
  const index = doc(await page("/seal", cookie));
  const links = [...index.querySelectorAll<HTMLAnchorElement>(".seal-themes a")].map((a) => a.getAttribute("href"));
  // L5: theme and page links land on the results heading, not the page top.
  expect(links).toEqual(THEMES.map((t) => `/seal?theme=${t.key}#results`));

  for (const { key, name } of THEMES) {
    const all = sealsByTheme(key);
    const d = doc(await page(`/seal?theme=${key}`, cookie));
    const heading = d.getElementById("results")!;
    expect(heading, `${key}: results heading has id="results"`).toBeTruthy();
    expect(heading.matches(".seal-count")).toBe(true);
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(d.querySelector(".seal-count")!.textContent).toContain(name);
    expect(d.querySelector(".seal-count")!.textContent).toContain(count(all.length));
    expect(d.querySelector(`.seal-themes a[href="/seal?theme=${key}#results"]`)!.getAttribute("aria-current")).toBe("page");
    const shown = rows(d);
    expect(shown.length, key).toBe(Math.min(all.length, SEALS_PER_PAGE));
    const glyphs = [...d.querySelectorAll(".seal-results .result-glyph")].map((g) => g.textContent);
    expect(glyphs, key).toEqual(all.slice(0, SEALS_PER_PAGE).map((e) => e.glyph));
  }
});

it("a theme with more than a page of seals pages through all of them, with no repeats", async () => {
  expect(SEALS_PER_PAGE).toBe(60);
  const big = THEMES.find((t) => sealsByTheme(t.key).length > SEALS_PER_PAGE);
  expect(big, "expected at least one theme with more than a page of seals").toBeTruthy();
  const all = sealsByTheme(big!.key);
  const pages = Math.ceil(all.length / SEALS_PER_PAGE);
  const cookie = await newVisitor();
  const seen: string[] = [];
  for (let n = 1; n <= pages; n++) {
    const d = doc(await page(`/seal?theme=${big!.key}${n > 1 ? `&page=${n}` : ""}`, cookie));
    expect(rows(d).length).toBeLessThanOrEqual(SEALS_PER_PAGE);
    seen.push(...[...d.querySelectorAll(".seal-results .result-glyph")].map((g) => g.textContent!));
    const nav = d.querySelector(".seal-pages")!;
    expect(nav.textContent).toContain(`Page ${n} of ${pages}`);
    const next = nav.querySelector<HTMLAnchorElement>('a[rel="next"]');
    if (n < pages) expect(next!.getAttribute("href")).toBe(`/seal?theme=${big!.key}&page=${n + 1}#results`);
    else expect(next).toBeNull();
    const prev = nav.querySelector<HTMLAnchorElement>('a[rel="prev"]');
    if (n > 1) expect(prev!.getAttribute("href")).toBe(`/seal?theme=${big!.key}${n > 2 ? `&page=${n - 1}` : ""}#results`);
    else expect(prev).toBeNull();
  }
  expect(seen).toEqual(all.map((e) => e.glyph));
  // Nonsense or out-of-range page numbers fall back to a real page.
  for (const bad of ["0", "-1", "abc", "99999", "1e3"]) {
    const d = doc(await page(`/seal?theme=${big!.key}&page=${bad}`, cookie));
    expect(rows(d).length, bad).toBeGreaterThan(0);
  }
});

it("an unknown theme answers the plain seal page and never echoes the value", async () => {
  const cookie = await newVisitor();
  for (const bad of ["evil", "<script>alert(1)</script>", "constructor", "__proto__", '"><img src=x onerror=alert(1)>']) {
    const html = await page(`/seal?theme=${encodeURIComponent(bad)}`, cookie);
    const d = doc(html);
    expect(d.querySelector(".seal-count"), bad).toBeNull();
    expect(rows(d)).toHaveLength(0);
    expect(d.querySelector("form.seal-search")).toBeTruthy();
    expect(html).not.toContain(bad);
    expect(html).not.toContain(encodeURIComponent(bad));
    expect(d.querySelector("img[onerror]")).toBeNull();
    expect(d.querySelector(".seal-themes a[aria-current]")).toBeNull();
  }
});

it("a search says how many seals matched and pages long results", async () => {
  const cookie = await newVisitor();
  const d = doc(await page("/seal?q=river", cookie));
  expect(d.getElementById("results")?.matches(".seal-count")).toBe(true);
  const heading = d.querySelector(".seal-count")!.textContent!;
  const n = Number(/^([\d,]+) seals? for/.exec(heading)?.[1]?.replace(/,/g, ""));
  expect(n).toBeGreaterThan(0);
  expect(rows(d).length).toBe(Math.min(n, SEALS_PER_PAGE));
  expect(heading).toContain("river");
});

// L5 (decision D5): pages that show which seal this browser holds, and which
// lines are its own, are never served from a cache or Back's page store.
it("/seal, / and a 422 page are sent with Cache-Control: no-store; static files are not", async () => {
  const cookie = await newVisitor();
  for (const path of ["/seal", "/seal?q=river", "/seal?theme=time", "/seal?claimed=%E5%B1%B1", "/"]) {
    const res = await fetch(new URL(path, baseUrl), { headers: { Cookie: cookie } });
    expect(res.status, path).toBe(200);
    expect(res.headers.get("cache-control"), path).toMatch(/\bno-store\b/);
  }
  const refused = await fetch(new URL("/colophons", baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: "body=",
  });
  expect(refused.status).toBe(422);
  expect(refused.headers.get("cache-control")).toMatch(/\bno-store\b/);
  const claim = await fetch(new URL("/seal", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: "glyph=",
  });
  expect(claim.status).toBe(303);
  const css = await fetch(new URL("/public/styles.css", baseUrl));
  expect(css.headers.get("cache-control") ?? "").not.toMatch(/no-store/);
});
