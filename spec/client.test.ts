import { JSDOM, VirtualConsole } from "jsdom";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { baseUrl, marker, newVisitor } from "./helpers.ts";

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
): Promise<{ window: JSDOM["window"]; document: Document; errors: string[] }> {
  const cookie = visitor ?? (await newVisitor());
  const html = await (await fetch(new URL("/", baseUrl), { headers: { Cookie: cookie } })).text();
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
  await settle(200);

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
  await settle();

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
  await settle(150);
  const lantern = document.querySelector(".lantern")!;
  expect(lantern.querySelector(".lantern-text")!.textContent).toBe(line);
  expect(lantern.querySelector("img")).toBeNull();
  expect(document.querySelector(".inkwell-mirror img")).toBeNull();
  await settle(200);
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
  await settle(150);
  const text = document.querySelector<HTMLElement>(".lantern-text")!;
  expect(text.textContent).toBe(line);
  // The clip is CSS only: a fixed box, hidden overflow and a fade.
  const css = readFileSync("public/styles.css", "utf8");
  const rule = css.match(/\.lantern-text\s*\{([^}]*)\}/)![1]!;
  expect(rule).toMatch(/overflow:\s*hidden/);
  expect(rule).toMatch(/mask-image/);
  await settle(200);
  expect(entriesWith(document, line)).toHaveLength(1);
  const served = await (await fetch(new URL("/", baseUrl))).text();
  expect(served).toContain(line);
});

it("the writer's own entry is not duplicated when its live event echoes back", async () => {
  const { document } = await openPage();
  const line = marker("echo");
  type(document, line);
  document.querySelector<HTMLFormElement>(".write-form")!.requestSubmit();
  await settle(100);
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
  const list = [...document.querySelectorAll<HTMLElement>("li.colophon")];
  expect(list.at(-1)!.dataset.id).toBe(String(next));
  // Fresh ink and the seal press hang off this class.
  expect(list.at(-1)!.classList.contains("colophon--arriving")).toBe(true);
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
  expect(list.at(-1)!.dataset.id).toBe(String(next));
  expect(list.filter((li) => li.dataset.id === String(next))).toHaveLength(1);
  expect(errors).toEqual([]);
});

// L1: what a screen-reader user hears. Someone else's line is announced in
// the hidden status line (after a short gather, so a burst is one count);
// your own accepted line says it was written in. Text only, never markup.
const statusText = (document: Document) => document.getElementById("scroll-status")!;

it("a live line from someone else is announced in the status line, as text", async () => {
  const { document, errors } = await openPage();
  const status = statusText(document);
  expect(status.getAttribute("role")).toBe("status");
  const ids = [...document.querySelectorAll<HTMLElement>("li.colophon")].map((li) => Number(li.dataset.id));
  const next = Math.max(0, ...ids) + 300000;
  // A seal label carrying markup: if it were written with innerHTML, an
  // element would appear inside the status line.
  const html = `<li class="colophon ink--zi" data-id="${next}"><p class="colophon-body">heard</p>
    <details class="colophon-seal"><summary aria-label="Seal <img/src=x>, x: y">x</summary></details></li>`;
  FakeEventSource.last!.emit("colophon", { id: next, html, legend: "" });
  await settle(1300);
  expect(status.textContent).toMatch(/new line on the scroll/i);
  expect(status.children).toHaveLength(0);
  expect(status.textContent).not.toContain("heard");
  expect(errors).toEqual([]);
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
  await settle(1300);
  expect(status.textContent).toMatch(/^3 new lines/);
});

it("your own accepted line is announced as written in", async () => {
  const { document, errors } = await openPage();
  type(document, marker("announce-own"));
  document.querySelector<HTMLFormElement>(".write-form")!.requestSubmit();
  await settle(300);
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
  await settle();
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
