import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { newVisitor, page, post } from "./helpers.ts";

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
