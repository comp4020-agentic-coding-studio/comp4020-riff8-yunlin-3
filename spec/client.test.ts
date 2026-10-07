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

async function openPage(): Promise<{ window: JSDOM["window"]; document: Document; errors: string[] }> {
  const cookie = await newVisitor();
  const html = await (await fetch(new URL("/", baseUrl), { headers: { Cookie: cookie } })).text();
  const script = await (await fetch(new URL("/public/app.js", baseUrl))).text();
  const errors: string[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => errors.push(String(e)));
  // Scripts in the HTML are not run; the test runs app.js itself, once its
  // fakes are in place.
  const dom = new JSDOM(html, { url: baseUrl, runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
  const w = dom.window as unknown as Record<string, unknown>;
  w.EventSource = FakeEventSource;
  w.colophonConfig = { handoffMs: 30 };
  w.fetch = (url: string, init: RequestInit = {}) =>
    fetch(url, { ...init, headers: { ...(init.headers as Record<string, string>), Cookie: cookie } });
  dom.window.eval(script);
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
