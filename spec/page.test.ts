import { JSDOM } from "jsdom";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { baseUrl, marker, newVisitor, openStream, page, post } from "./helpers.ts";

// Crit 10's shape for /: the visitors' colophons are the handscroll, and the
// write form sits in a dock fixed on screen, outside the scroll's flow
// (prompt.md §8 T1 and T2; the markup is .claude/team/contract.md §P).
const doc = (html: string) => new JSDOM(html).window.document;

it("the write form is in the fixed dock, outside the colophon list and the scroll", async () => {
  const cookie = await newVisitor();
  const d = doc(await page("/", cookie));
  const form = d.querySelector<HTMLFormElement>("form.write-form")!;
  expect(form.closest(".dock"), "form.write-form inside .dock").toBeTruthy();
  expect(form.closest(".colophon-list")).toBeNull();
  expect(form.closest(".scroll")).toBeNull();
  expect(form.closest(".handscroll")).toBeNull();
  const dock = form.closest(".dock")!;
  expect(dock.querySelector("textarea[name=body]")).toBeTruthy();
  expect(dock.querySelectorAll("input[type=radio][name=ink]")).toHaveLength(5);
  expect(dock.querySelector("button[type=submit]")).toBeTruthy();
  // The line saying which seal you sign with, and the way to change it.
  expect(dock.querySelector("a[href='/seal']")).toBeTruthy();
});

it("the dock is fixed by CSS, so it stays put with JavaScript off", () => {
  const css = readFileSync("public/styles.css", "utf8");
  const rules = [...css.matchAll(/(^|[},])\s*([^{}]*\.dock\b[^{}]*)\{([^}]*)\}/g)].filter((m) =>
    m[2]!.split(",").some((sel) => sel.trim() === ".dock"),
  );
  expect(rules.length, "expected a .dock rule in styles.css").toBeGreaterThan(0);
  expect(rules.some((m) => /position\s*:\s*fixed/.test(m[3]!))).toBe(true);
});

it("a rejected line shows its error in the dock, next to the text", async () => {
  const res = await post("/colophons", { body: "x".repeat(321) });
  expect(res.status).toBe(422);
  const d = doc(await res.text());
  const error = d.querySelector(".form-error")!;
  expect(error.closest(".dock")).toBeTruthy();
  expect(error.nextElementSibling?.matches("form.write-form")).toBe(true);
});

it("the colophon list is the scroll: inside a focusable region, inside the mounted handscroll", async () => {
  await post("/colophons", { body: marker("page-scroll") });
  const d = doc(await page("/"));
  const list = d.querySelector("ol.colophon-list")!;
  expect(list).toBeTruthy();
  const scroll = list.closest(".scroll")!;
  expect(scroll, ".colophon-list sits inside .scroll").toBeTruthy();
  expect(scroll.getAttribute("role")).toBe("region");
  expect(scroll.getAttribute("tabindex")).toBe("0");
  const label = scroll.getAttribute("aria-labelledby");
  expect(label && d.getElementById(label)?.textContent?.trim()).toBeTruthy();
  expect(scroll.closest(".handscroll")).toBeTruthy();
  expect(list.querySelectorAll("li.colophon").length).toBeGreaterThan(0);
});

it("the watercolour painting is no longer inlined as the centrepiece", async () => {
  const html = await page("/");
  const d = doc(html);
  expect(d.querySelector("figure.painting")).toBeNull();
  expect(d.querySelector(".painting-art")).toBeNull();
  // public/painting.svg's own root viewBox: the inlined painting, if it's back.
  const viewBox = readFileSync("public/painting.svg", "utf8").match(/<svg[^>]*viewBox="([^"]+)"/)![1]!;
  expect(html).not.toContain(`viewBox="${viewBox}"`);
  expect(html).not.toContain("Spruce, granite and a path");
});

// An unknown ?error= code is just no message; one that names a property every
// object inherits must not be looked up as if it were a message.
it("an ?error= naming an inherited object property still answers with the page", async () => {
  for (const code of ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf", "nonsense"]) {
    const res = await fetch(new URL(`/?error=${code}`, baseUrl));
    expect(res.status, code).toBe(200);
    const d = doc(await res.text());
    expect(d.querySelector("form.write-form"), code).toBeTruthy();
    expect(d.querySelector(".form-error"), code).toBeNull();
  }
});

// L1 (decisions.md D3, D4): one landmark named Colophons, a polite status line
// for arrivals outside the list, and a pointer-only overview strip that is
// invisible to assistive tech and never takes focus.
it("the scroll is the only region named Colophons, and the section doesn't name itself", async () => {
  await post("/colophons", { body: marker("page-region") });
  const d = doc(await page("/"));
  expect(d.querySelector("section.scroll-section")!.hasAttribute("aria-labelledby")).toBe(false);
  const named = [...d.querySelectorAll("[role=region], section[aria-labelledby], section[aria-label]")].filter((el) => {
    const id = el.getAttribute("aria-labelledby");
    const name = id ? d.getElementById(id)?.textContent : el.getAttribute("aria-label");
    return name?.trim() === "Colophons";
  });
  expect(named).toHaveLength(1);
  expect(named[0]!.matches(".scroll[role=region]")).toBe(true);
});

it("arrivals have a visually hidden polite status line, outside the list", async () => {
  const d = doc(await page("/"));
  const status = d.querySelectorAll("[role=status]");
  expect(status).toHaveLength(1);
  const line = status[0]!;
  expect(line.classList.contains("visually-hidden")).toBe(true);
  expect(line.getAttribute("aria-live") ?? "polite").toBe("polite");
  expect(line.closest(".colophon-list")).toBeNull();
  expect(line.closest(".scroll")).toBeNull();
  expect(line.textContent).toBe("");
});

it("the overview strip is hidden from assistive tech and nothing in it takes focus", async () => {
  await post("/colophons", { body: marker("page-overview") });
  const d = doc(await page("/"));
  const strip = d.querySelector(".scroll-overview")!;
  expect(strip, "expected the overview strip on a scroll with lines").toBeTruthy();
  expect(strip.hasAttribute("hidden")).toBe(false);
  expect(strip.getAttribute("aria-hidden")).toBe("true");
  expect(strip.hasAttribute("tabindex")).toBe(false);
  expect(strip.querySelector("[tabindex], a[href], button, input, select, textarea, summary")).toBeNull();
});

it("anything scrolled into view clears the dock: html's scroll-padding-bottom uses --dock-h", () => {
  const css = readFileSync("public/styles.css", "utf8");
  const rules = [...css.matchAll(/(?:^|})\s*html\s*\{([^}]*)\}/g)].map((m) => m[1]!);
  expect(rules.some((r) => /scroll-padding-bottom\s*:[^;]*var\(--dock-h\b/.test(r))).toBe(true);
});

// L2: each sheet's date is the link to that line, on the page and in the
// live event that carries a new one.
it("each sheet's date links to its own line, on the page and in a live entry", async () => {
  const cookie = await newVisitor();
  const stream = openStream("/events", { Cookie: cookie });
  await stream.ready;
  try {
    const line = marker("permalink");
    await post("/colophons", { body: line }, cookie);
    const li = [...doc(await page("/", cookie)).querySelectorAll("li.colophon")].find((el) =>
      el.textContent!.includes(line),
    )!;
    const id = li.getAttribute("data-id")!;
    expect(li.id).toBe(`c-${id}`);
    const link = li.querySelector<HTMLAnchorElement>(".colophon-date a.colophon-link")!;
    expect(link.getAttribute("href")).toBe(`/#c-${id}`);
    expect(link.textContent!.trim().length).toBeGreaterThan(0);

    expect(await stream.waitFor((e) => e.some((ev) => ev.data.id === Number(id)), 3000)).toBe(true);
    const live = stream.events.find((ev) => ev.data.id === Number(id))!;
    const liveLink = doc(`<ol>${live.data.html}</ol>`).querySelector(".colophon-date a.colophon-link")!;
    expect(liveLink.getAttribute("href")).toBe(`/#c-${id}`);
  } finally {
    stream.close();
  }
});

// An empty scroll can't be produced on the shared database, so this renders
// the page directly against a scratch one.
const scratch = mkdtempSync(join(tmpdir(), "colophon-page-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

it("an empty scroll says no one has written yet, inside the scroll", async () => {
  process.env.DB_PATH = join(scratch, "empty.db");
  const { renderIndex } = await import("../src/render.ts");
  const d = doc(renderIndex([], "00000000-0000-4000-8000-000000000000"));
  const note = d.querySelector(".empty-note")!;
  expect(note.textContent).toMatch(/no one has written/i);
  expect(note.closest(".scroll")).toBeTruthy();
  expect(d.querySelector("form.write-form")!.closest(".dock")).toBeTruthy();
  // The strip and its cue are always there, hidden until a first line, so
  // scroll.js can reveal them when one arrives live.
  const strip = d.querySelector(".scroll-overview")!;
  const cue = d.querySelector(".scroll-cue")!;
  expect(strip).toBeTruthy();
  expect(cue).toBeTruthy();
  expect(strip.hasAttribute("hidden")).toBe(true);
  expect(cue.hasAttribute("hidden")).toBe(true);
  expect(strip.getAttribute("aria-hidden")).toBe("true");
});
