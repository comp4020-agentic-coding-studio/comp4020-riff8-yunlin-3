import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { baseUrl, marker, newVisitor, until } from "./helpers.ts";

// The page's own script, as the running app serves it, run in jsdom against
// the running app: real POSTs, real responses, and a fake EventSource the
// test drives so it can echo a live event back on purpose. Lanterns are the
// reward for an accepted line only; nothing typed is lost on a refusal.

class FakeEventSource {
  static last: FakeEventSource | undefined;
  listeners = new Map<string, ((e: { data: string }) => void)[]>();
  constructor(public url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(type: string, fn: (e: { data: string }) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]);
  }
  emit(type: string, data: unknown): void {
    for (const fn of this.listeners.get(type) ?? []) fn({ data: JSON.stringify(data) });
  }
  close(): void {}
}

async function openPage(
  scripts: string[] = ["/public/app.js"],
  visitor?: string,
  edit: (html: string) => string = (html) => html,
): Promise<{ window: JSDOM["window"]; document: Document; errors: string[] }> {
  const cookie = visitor ?? (await newVisitor());
  const html = edit(await (await fetch(new URL("/", baseUrl), { headers: { Cookie: cookie } })).text());
  const sources = await Promise.all(scripts.map(async (src) => (await fetch(new URL(src, baseUrl))).text()));
  const errors: string[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(String(e)));
  // Scripts in the HTML are not run; the test runs app.js itself, once its
  // fakes are in place.
  const dom = new JSDOM(html, { url: baseUrl, runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
  const w = dom.window as unknown as Record<string, unknown>;
  w.EventSource = FakeEventSource;
  w.colophonConfig = { handoffMs: 30 };
  // jsdom has no matchMedia; every browser does. Report no preference.
  w.matchMedia ??= (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
  w.fetch = (url: string, init: RequestInit = {}) =>
    fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Cookie: cookie } });
  for (const source of sources) dom.window.eval(source);
  // Parsing a long page blocks this process for seconds, long enough for the
  // server's keep-alive timeout to close the pooled socket the page came
  // over. One turn of the event loop lets the client see that close before
  // the test's first request, rather than sending it down a dead socket.
  await new Promise((r) => setTimeout(r, 50));
  return { window: dom.window, document: dom.window.document, errors };
}

const settle = (ms = 300) => new Promise((r) => setTimeout(r, ms));

function type(document: Document, text: string): void {
  const textarea = document.querySelector("textarea")!;
  textarea.value = text;
  textarea.dispatchEvent(new document.defaultView!.Event("input"));
}

const entriesWith = (document: Document, text: string) =>
  [...document.querySelectorAll("li.colophon")].filter((li) => li.querySelector(".colophon-body")!.textContent === text);

it("an accepted line launches exactly one lantern carrying it, then appears exactly once", async () => {
  const { document, errors } = await openPage();
  const line = marker("lantern");
  type(document, line);
  expect(document.querySelectorAll(".inkwell-mirror .ink-ch").length).toBe(line.length);
  document.querySelector<HTMLFormElement>(".write-form")!.requestSubmit();
  await until(() => entriesWith(document, line).length > 0);

  const lanterns = document.querySelectorAll(".lantern-sky .lantern");
  expect(lanterns).toHaveLength(1);
  expect(lanterns[0]!.querySelector(".lantern-text")!.textContent).toBe(line);
  expect(lanterns[0]!.querySelector(".lantern-seal")!.textContent).toBe(
    document.querySelector<HTMLElement>(".write-form")!.dataset.ownSeal,
  );
  expect(document.querySelector("textarea")!.value).toBe("");
  expect(entriesWith(document, line)).toHaveLength(1);
  expect(errors).toEqual([]);
});

it("a refused line launches nothing and leaves the typed text where it was", async () => {
  const { document } = await openPage();
  type(document, "   ");
  // Bypass the browser's own required/maxlength checks the way a real
  // refusal would arrive: from the server.
  document.querySelector("textarea")!.removeAttribute("required");
  const before = document.querySelectorAll("li.colophon").length;
  document.querySelector<HTMLFormElement>(".write-form")!.requestSubmit();
  await until(() => document.querySelector(".form-error"));

  expect(document.querySelectorAll(".lantern")).toHaveLength(0);
  expect(document.querySelector("textarea")!.value).toBe("   ");
  expect(document.querySelector(".form-error")!.textContent).toBe("A colophon needs at least a few words.");
  expect(document.querySelectorAll("li.colophon")).toHaveLength(before);
});

it("markup in a line appears on the lantern as literal text, creating no element", async () => {
  const { document } = await openPage();
  const line = `<img src=x onerror=alert(1)> ${marker("lantern-xss")}`;
  type(document, line);
  document.querySelector<HTMLFormElement>(".write-form")!.requestSubmit();
  await until(() => document.querySelector(".lantern"));
  const lantern = document.querySelector(".lantern")!;
  expect(lantern.querySelector(".lantern-text")!.textContent).toBe(line);
  expect(lantern.querySelector("img")).toBeNull();
  expect(document.querySelector(".inkwell-mirror img")).toBeNull();
  await until(() => entriesWith(document, line).length > 0);
  const entry = entriesWith(document, line)[0]!;
  expect(entry.querySelector("img")).toBeNull();
});

it("a 320-character line is clipped on the lantern, but the listed entry is the whole line", async () => {
  const { document } = await openPage();
  const tag = marker("long");
  const line = tag + "長".repeat(320 - tag.length);
  expect(line).toHaveLength(320);
  type(document, line);
  document.querySelector<HTMLFormElement>(".write-form")!.requestSubmit();
  await until(() => document.querySelector(".lantern-text") || document.querySelector(".form-error"));
  expect(document.querySelector(".form-error")?.textContent ?? null, "the line was refused").toBeNull();
  const text = document.querySelector<HTMLElement>(".lantern-text")!;
  expect(text.textContent).toBe(line);
  // The clip is CSS only: a fixed box, hidden overflow and a fade.
  const css = readFileSync("public/styles.css", "utf8");
  const rule = css.match(/\.lantern-text\s*\{([^}]*)\}/)![1]!;
  expect(rule).toMatch(/overflow:\s*hidden/);
  expect(rule).toMatch(/mask-image/);
  await until(() => entriesWith(document, line).length > 0);
  expect(entriesWith(document, line)).toHaveLength(1);
  const served = await (await fetch(new URL("/", baseUrl))).text();
  expect(served).toContain(line);
});

it("the writer's own entry is not duplicated when its live event echoes back", async () => {
  const { document } = await openPage();
  const line = marker("echo");
  type(document, line);
  document.querySelector<HTMLFormElement>(".write-form")!.requestSubmit();
  // A lantern launches only on a 2xx, so once it's up the line is stored.
  await until(() => document.querySelector(".lantern"));
  const id = Number(
    (await (await fetch(new URL("/", baseUrl))).text()).match(new RegExp(`data-id="(\\d+)"[^]*?${line}`))?.[1],
  );
  const html = `<li class="colophon ink--mo-lan" data-id="${id}"><p class="colophon-body">${line}</p></li>`;
  FakeEventSource.last!.emit("colophon", { id, html, legend: "" }); // during the lantern
  await settle(200);
  FakeEventSource.last!.emit("colophon", { id, html, legend: "" }); // after it
  await settle(50);
  expect(document.querySelectorAll(`li[data-id="${id}"]`)).toHaveLength(1);
});

it("a live colophon from someone else is placed in id order, once", async () => {
  const { document } = await openPage();
  const ids = [...document.querySelectorAll<HTMLElement>("li.colophon")].map((li) => Number(li.dataset.id));
  const next = Math.max(0, ...ids) + 100000;
  const html = `<li class="colophon ink--zi" data-id="${next}"><p class="colophon-body">from afar</p></li>`;
  FakeEventSource.last!.emit("colophon", { id: next, html, legend: "" });
  FakeEventSource.last!.emit("colophon", { id: next, html, legend: "" });
  // Decision D10: the list is newest first, so the newest line is the first
  // child, and every line sits before any older one.
  const list = [...document.querySelectorAll<HTMLElement>("li.colophon")];
  expect(list[0]!.dataset.id).toBe(String(next));
  const order = list.map((li) => Number(li.dataset.id));
  expect(order).toEqual([...order].sort((a, b) => b - a));
  // Fresh ink and the seal press hang off this class.
  expect(list[0]!.classList.contains("colophon--arriving")).toBe(true);
  expect(list.filter((li) => li.dataset.id === String(next))).toHaveLength(1);
  expect(FakeEventSource.last!.url).toBe(`/events?after=${Math.max(0, ...ids)}`);
});

it("without the script the form is a plain post: the script is external and deferred", async () => {
  const html = await (await fetch(new URL("/", baseUrl))).text();
  const doc = new JSDOM(html).window.document;
  const script = doc.querySelector<HTMLScriptElement>('script[src="/public/app.js"]')!;
  expect(script.defer).toBe(true);
  const form = doc.querySelector("form.write-form")!;
  expect(form.getAttribute("method")).toBe("post");
  expect(form.getAttribute("action")).toBe("/colophons");
  expect(doc.querySelector(".lantern")).toBeNull();
});

// The scroll's motion script and the page script together, in the order the
// page loads them: a live line from someone else still lands once, at the
// newest end, and nothing throws (prompt.md §8 T1, T3; contract §S).
it("with the scroll's script loaded first, a live arrival still lands once at the newest end", async () => {
  const { window, document, errors } = await openPage(["/public/scroll.js", "/public/app.js"]);
  const api = (window as unknown as { colophonScroll?: Record<string, unknown> }).colophonScroll;
  expect(api && typeof api.beforeArrive).toBe("function");
  expect(api && typeof api.afterArrive).toBe("function");
  const ids = [...document.querySelectorAll<HTMLElement>("li.colophon")].map((li) => Number(li.dataset.id));
  const next = Math.max(0, ...ids) + 200000;
  const html = `<li class="colophon ink--zi" data-id="${next}"><p class="colophon-body">from the far bank</p></li>`;
  FakeEventSource.last!.emit("colophon", { id: next, html, legend: "" });
  FakeEventSource.last!.emit("colophon", { id: next, html, legend: "" });
  await settle(100);
  const list = [...document.querySelectorAll<HTMLElement>(".scroll .colophon-list li.colophon")];
  expect(list[0]!.dataset.id).toBe(String(next));
  expect(list.filter((li) => li.dataset.id === String(next))).toHaveLength(1);
  expect(errors).toEqual([]);
});

// L1: what a screen-reader user hears. Someone else's line is announced in
// the hidden status line (after a short gather, so a burst is one count);
// your own accepted line says it was written in. Text only, never markup.
const statusText = (document: Document) => document.getElementById("scroll-status")!;

function liveFrom(document: Document, offset: number, body: string, label = "Seal 守, shǒu: to guard"): number {
  const ids = [...document.querySelectorAll<HTMLElement>("li.colophon")].map((li) => Number(li.dataset.id));
  const id = Math.max(0, ...ids) + offset;
  const html = `<li class="colophon ink--zi" data-id="${id}"><p class="colophon-body">${body}</p>
    <details class="colophon-seal"><summary aria-label="${label}">x</summary></details></li>`;
  FakeEventSource.last!.emit("colophon", { id, html, legend: "" });
  return id;
}

// Decision D6: someone else's line is announced with its glyph and a short
// excerpt, unless the visitor is writing (#body focused), when only the
// glyph, so their own words aren't talked over. Bursts stay a count.
it("a live line from someone else is announced with its glyph and an excerpt, as text", async () => {
  const { document, errors } = await openPage();
  const status = statusText(document);
  expect(status.getAttribute("role")).toBe("status");
  // Markup in the body and the seal label: if either were written with
  // innerHTML, an element would appear inside the status line.
  liveFrom(document, 300000, "heard &lt;b&gt;across&lt;/b&gt; the water", "Seal 守&lt;img/src=x&gt;, x: y");
  await until(() => statusText(document).textContent);
  expect(status.textContent).toBe("A new line, signed 守<img/src=x>: heard <b>across</b> the water");
  expect(status.children).toHaveLength(0);
  expect(errors).toEqual([]);
});

it("a long line is announced as an excerpt of at most 80 characters, cut at a word, with an ellipsis", async () => {
  const { document } = await openPage();
  const status = statusText(document);
  const body = "the river runs past the pine and the pine stays where it is while the water goes on ".repeat(3).trim();
  liveFrom(document, 310000, body);
  await until(() => statusText(document).textContent);
  const said = status.textContent!;
  const prefix = "A new line, signed 守: ";
  expect(said.startsWith(prefix)).toBe(true);
  const excerpt = said.slice(prefix.length);
  expect(excerpt.endsWith("…")).toBe(true);
  const cut = excerpt.slice(0, -1);
  expect(cut.length).toBeGreaterThan(40);
  expect(cut.length).toBeLessThanOrEqual(80);
  expect(body.startsWith(cut)).toBe(true);
  // At a word boundary: the next character of the body is a space.
  expect(body[cut.length]).toBe(" ");
});

it("a short line is announced whole, with no ellipsis", async () => {
  const { document } = await openPage();
  liveFrom(document, 315000, "  pine,\n  rock  ");
  await until(() => statusText(document).textContent);
  expect(statusText(document).textContent).toBe("A new line, signed 守: pine, rock");
});

it("while the visitor is writing, someone else's line is announced by glyph only", async () => {
  const { document } = await openPage();
  const status = statusText(document);
  document.querySelector<HTMLTextAreaElement>("#body")!.focus();
  liveFrom(document, 320000, "do not read this over my typing");
  await until(() => statusText(document).textContent);
  expect(status.textContent).toBe("A new line on the scroll, signed 守.");
});

it("a burst of live lines is announced once, as a count", async () => {
  const { document } = await openPage();
  const status = statusText(document);
  const ids = [...document.querySelectorAll<HTMLElement>("li.colophon")].map((li) => Number(li.dataset.id));
  const base = Math.max(0, ...ids) + 400000;
  for (let i = 0; i < 3; i++) {
    const id = base + i;
    FakeEventSource.last!.emit("colophon", {
      id,
      html: `<li class="colophon ink--mo" data-id="${id}"><p class="colophon-body">burst ${i}</p></li>`,
      legend: "",
    });
  }
  await until(() => statusText(document).textContent);
  expect(status.textContent).toMatch(/^3 new lines/);
});

it("your own accepted line is announced as written in", async () => {
  const { document, errors } = await openPage();
  type(document, marker("announce-own"));
  document.querySelector<HTMLFormElement>(".write-form")!.requestSubmit();
  await until(() => statusText(document).textContent);
  expect(statusText(document).textContent).toBe("Your line is written in.");
  expect(errors).toEqual([]);
});

it("after a refused line, focus is back in the text and the button was never disabled", async () => {
  const { document } = await openPage();
  const textarea = document.querySelector<HTMLTextAreaElement>("#body")!;
  const button = document.querySelector<HTMLButtonElement>(".write-form button[type=submit]")!;
  type(document, "   ");
  textarea.removeAttribute("required");
  button.focus();
  let everDisabled = false;
  const watch = new document.defaultView!.MutationObserver(() => (everDisabled ||= button.disabled));
  watch.observe(button, { attributes: true });
  document.querySelector<HTMLFormElement>(".write-form")!.requestSubmit();
  expect(button.disabled).toBe(false);
  await until(() => document.querySelector(".form-error") && !button.hasAttribute("aria-disabled"));
  watch.disconnect();
  expect(document.querySelector(".form-error")).toBeTruthy();
  expect(document.activeElement).toBe(textarea);
  expect(everDisabled).toBe(false);
  expect(button.disabled).toBe(false);
  expect(button.hasAttribute("aria-disabled")).toBe(false);
});

// The overview strip (decision D4): pointer only, so the cue line says in
// words what the red ticks show, and the strip itself never takes focus.
it("the strip's cue says your lines are in red once you've written one, and the strip stays out of the tab order", async () => {
  const cookie = await newVisitor();
  const res = await fetch(new URL("/colophons", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie },
    body: new URLSearchParams({ body: marker("strip-mine") }).toString(),
  });
  expect(res.status).toBe(303);
  const { document, errors } = await openPage(["/public/scroll.js", "/public/app.js"], cookie);
  await settle(100);
  expect(document.querySelector(".scroll-cue")!.textContent).toContain("yours in red");
  const strip = document.querySelector<HTMLElement>(".scroll-overview")!;
  expect(strip.title).toBe("Jump along the scroll");
  expect(strip.getAttribute("aria-hidden")).toBe("true");
  expect(strip.hasAttribute("tabindex")).toBe(false);
  expect(strip.querySelector("[tabindex], a[href], button, input, summary")).toBeNull();
  expect(errors).toEqual([]);
});

it("a visitor with no lines of their own isn't told about red", async () => {
  const { document } = await openPage(["/public/scroll.js", "/public/app.js"]);
  await settle(100);
  expect(document.querySelector(".scroll-cue")!.textContent).not.toContain("red");
});

// The strip and cue render hidden on an empty scroll (the shared database is
// never empty, so this page is the served one with every line taken out, the
// way the server renders a scroll with none); the first live line shows them.
it("on an empty scroll the strip and cue appear with the first live line", async () => {
  const empty = (html: string) =>
    html
      .replace(/<ol class="colophon-list"[^>]*>[\s\S]*?<\/ol>/, '<ol class="colophon-list" reversed data-last-id="0"></ol>')
      .replace('<div class="scroll-overview" aria-hidden="true">', '<div class="scroll-overview" aria-hidden="true" hidden>')
      .replace('<p class="scroll-cue">', '<p class="scroll-cue" hidden>');
  const { document, errors } = await openPage(["/public/scroll.js", "/public/app.js"], undefined, empty);
  await settle(50);
  expect(document.querySelectorAll("li.colophon")).toHaveLength(0);
  expect(document.querySelector<HTMLElement>(".scroll-overview")!.hidden).toBe(true);
  expect(document.querySelector<HTMLElement>(".scroll-cue")!.hidden).toBe(true);
  liveFrom(document, 1, "the first line");
  await settle(150);
  expect(document.querySelectorAll("li.colophon")).toHaveLength(1);
  expect(document.querySelector<HTMLElement>(".scroll-overview")!.hidden).toBe(false);
  expect(document.querySelector<HTMLElement>(".scroll-cue")!.hidden).toBe(false);
  expect(errors).toEqual([]);
});

// D10: an older line arriving late (a reconnect replay out of order) still
// lands in id order, after every newer line and before every older one.
it("a live line older than some on the page lands between them, newest first", async () => {
  const { document } = await openPage();
  const ids = [...document.querySelectorAll<HTMLElement>("li.colophon")].map((li) => Number(li.dataset.id));
  const top = Math.max(0, ...ids);
  const newer = top + 500002;
  const older = top + 500001;
  for (const id of [newer, older]) {
    FakeEventSource.last!.emit("colophon", {
      id,
      html: `<li class="colophon ink--mo" data-id="${id}"><p class="colophon-body">order ${id}</p></li>`,
      legend: "",
    });
  }
  const order = [...document.querySelectorAll<HTMLElement>("li.colophon")].map((li) => Number(li.dataset.id));
  expect(order.slice(0, 3)).toEqual([newer, older, top]);
  expect(order).toEqual([...order].sort((a, b) => b - a));
});
