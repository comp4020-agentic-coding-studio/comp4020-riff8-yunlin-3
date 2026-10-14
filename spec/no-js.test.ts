import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
import { baseUrl, marker, newVisitor, page, post } from "./helpers.ts";

// CLAUDE.md: reading and writing work with JavaScript off. These read the
// served HTML as a browser with scripts disabled would see it, then drive the
// forms exactly as that browser would submit them.
const doc = (html: string) => new JSDOM(html).window.document;

it("the write form posts body and ink to /colophons, and an ink choice is stored as a class", async () => {
  const cookie = await newVisitor();
  const form = doc(await page("/", cookie)).querySelector<HTMLFormElement>("form.write-form")!;
  expect(form.getAttribute("method")).toBe("post");
  expect(form.getAttribute("action")).toBe("/colophons");
  expect(form.querySelector("textarea[name=body]")).toBeTruthy();
  const inks = [...form.querySelectorAll<HTMLInputElement>("input[type=radio][name=ink]")].map((i) => i.value);
  expect(inks).toEqual(["mo-lan", "dian-qing", "shi-lu", "zi", "mo"]);
  expect(form.querySelector<HTMLInputElement>("input[name=ink]:checked")!.value).toBe("mo-lan");

  const line = marker("no-js-ink");
  const res = await post("/colophons", { body: line, ink: "shi-lu" }, cookie);
  expect(res.status).toBe(303);
  expect(res.headers.get("location")).toBe("/");
  const li = [...doc(await page("/", cookie)).querySelectorAll("li.colophon")].find((el) =>
    el.textContent!.includes(line),
  )!;
  expect(li.classList.contains("ink--shi-lu")).toBe(true);
});

// prompt.md §8 T2 ("Error messages from a rejected submission ... show in the
// dock, next to the text, with the text still there") and decisions.md D1: a
// rejected plain POST answers 422 with the whole page, not a redirect.
it("an unknown ink key or a colour value is refused, never rendered as a colophon or a style", async () => {
  for (const ink of ["red", "#ff0000", "mo-lan; color:red"]) {
    const line = marker("bad-ink");
    const res = await post("/colophons", { body: line, ink });
    expect(res.status).toBe(422);
    const html = await res.text();
    const d = doc(html);
    expect(d.querySelector(".form-error")!.textContent).toMatch(/ink/i);
    expect(d.querySelector<HTMLTextAreaElement>("form.write-form textarea[name=body]")!.value).toBe(line);
    expect([...d.querySelectorAll("li.colophon")].some((li) => li.textContent!.includes(line))).toBe(false);
    for (const el of d.querySelectorAll("[style]")) expect(el.getAttribute("style")).not.toContain(ink);
    expect(html).not.toContain("color:red");
    expect(html).not.toContain("#ff0000");
    expect(d.querySelector<HTMLInputElement>("input[name=ink]:checked")!.value).toBe("mo-lan");
    expect(await page("/")).not.toContain(line);
  }
});

it("a too-long line answers 422 with the page, its text kept in the box and its ink still chosen", async () => {
  const cookie = await newVisitor();
  const line = `${marker("too-long")} ${"y".repeat(320)}`.slice(0, 321);
  expect(line).toHaveLength(321);
  const res = await post("/colophons", { body: line, ink: "zi" }, cookie);
  expect(res.status).toBe(422);
  expect(res.headers.get("content-type")).toMatch(/^text\/html/);
  const d = doc(await res.text());
  const form = d.querySelector<HTMLFormElement>("form.write-form")!;
  expect(form.querySelector<HTMLTextAreaElement>("textarea[name=body]")!.value).toBe(line);
  expect(form.querySelector<HTMLInputElement>("input[name=ink]:checked")!.value).toBe("zi");
  const error = d.querySelector(".form-error")!;
  expect(error.textContent).toMatch(/320/);
  expect(error.nextElementSibling).toBe(form);
  expect(await page("/", cookie)).not.toContain(line);
});

it("a rejected line carrying markup comes back escaped inside the box, never as live markup", async () => {
  const tag = marker("xss-422");
  const line = `<script>window.pwned_${tag.replace(/\W/g, "")}=1</script></textarea><img src=x onerror=alert(1)> ${tag} ${"z".repeat(330)}`;
  const res = await post("/colophons", { body: line });
  expect(res.status).toBe(422);
  const html = await res.text();
  expect(html).not.toContain("<script>window.pwned");
  expect(html).not.toContain("</textarea><img");
  const d = doc(html);
  expect(d.querySelector<HTMLTextAreaElement>("textarea[name=body]")!.value).toBe(line);
  expect([...d.querySelectorAll("script")].some((s) => s.textContent!.includes("pwned"))).toBe(false);
  expect(d.querySelector("img[onerror]")).toBeNull();
});

it("a GET to /colophons (a reload after a 422) goes back to the scroll", async () => {
  const res = await fetch(new URL("/colophons", baseUrl), { redirect: "manual" });
  expect(res.status).toBe(303);
  expect(res.headers.get("location")).toBe("/");
});

it("a line posted with no ink field uses the default ink", async () => {
  const line = marker("default-ink");
  await post("/colophons", { body: line });
  const li = [...doc(await page("/")).querySelectorAll("li.colophon")].find((el) => el.textContent!.includes(line))!;
  expect(li.classList.contains("ink--mo-lan")).toBe(true);
});

it("choosing a seal works through plain forms: a GET search, then a POST claim, then the new seal signs", async () => {
  const cookie = await newVisitor();
  const search = doc(await page("/seal", cookie)).querySelector<HTMLFormElement>("form.seal-search")!;
  expect(search.getAttribute("method")).toBe("get");
  expect(search.querySelector("input[name=q]")).toBeTruthy();

  const results = doc(await page("/seal?q=dream", cookie));
  const claimForm = results.querySelector<HTMLFormElement>("form.claim-form");
  expect(claimForm, "expected 夢 to be free to take").toBeTruthy();
  expect(claimForm!.getAttribute("method")).toBe("post");
  const glyph = claimForm!.querySelector<HTMLInputElement>("input[name=glyph]")!.value;

  const res = await post("/seal", { glyph, q: "dream" }, cookie);
  expect(res.status).toBe(303);
  const confirmed = await page(res.headers.get("location")!, cookie);
  expect(confirmed).toContain("From now on you sign with");

  const line = marker("no-js-seal");
  await post("/colophons", { body: line }, cookie);
  const li = [...doc(await page("/", cookie)).querySelectorAll("li.colophon")].find((el) =>
    el.textContent!.includes(line),
  )!;
  expect(li.querySelector("summary")!.getAttribute("aria-label")).toContain(`Seal ${glyph}`);
  expect(li.querySelector(".colophon-seal")!.tagName).toBe("DETAILS");

  await post("/seal", { glyph: "" }, cookie);
});

it("every seal on the page reveals its meaning, and the legend lists each one in use", async () => {
  const line = marker("legend");
  await post("/colophons", { body: line });
  const d = doc(await page("/"));
  const seals = [...d.querySelectorAll("li.colophon summary")];
  expect(seals.length).toBeGreaterThan(0);
  for (const s of seals) expect(s.getAttribute("aria-label")).toMatch(/^Seal .+, .+: .+/);
  const legendGlyphs = new Set([...d.querySelectorAll(".seal-legend li")].map((li) => li.getAttribute("data-glyph")));
  for (const s of seals) expect(legendGlyphs.has(s.textContent!.trim())).toBe(true);
});
