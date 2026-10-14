import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
import { marker, newVisitor, openStream, page, post } from "./helpers.ts";

// Decision D8 (contract B): every sheet carries exactly one length bucket,
// from its body's length: short up to 60 characters, mid up to 160, long past
// that. The same class arrives on a live entry as on the page.
const BUCKETS = ["colophon--short", "colophon--mid", "colophon--long"];
const doc = (html: string) => new JSDOM(html).window.document;
const bucketsOf = (li: Element) => BUCKETS.filter((b) => li.classList.contains(b));

// A unique line of exactly `length` characters that the server won't trim
// (no trailing space): the marker, then words, then non-space padding.
const line = (length: number) => {
  const words = `${marker("len")} ${"brush ".repeat(60)}`.slice(0, length).trimEnd();
  return words.padEnd(length, "x");
};

it("every sheet carries exactly one length bucket, from its body's length, on the page and live", async () => {
  const cookie = await newVisitor();
  const stream = openStream("/events", { Cookie: cookie });
  await stream.ready;
  try {
    const cases: [number, string][] = [
      [10, "colophon--short"],
      [60, "colophon--short"],
      [61, "colophon--mid"],
      [100, "colophon--mid"],
      [160, "colophon--mid"],
      [161, "colophon--long"],
      [300, "colophon--long"],
    ];
    const written: { body: string; bucket: string }[] = [];
    for (const [length, bucket] of cases) {
      // Ten characters is too short for a marker; base-36 of a counter that
      // only goes up keeps it unique across runs on a reused database.
      const body = length === 10 ? `s${(Date.now() * 1000 + written.length).toString(36)}`.slice(-10) : line(length);
      expect(body).toHaveLength(length);
      expect((await post("/colophons", { body }, cookie)).status).toBe(303);
      written.push({ body, bucket });
    }

    const d = doc(await page("/", cookie));
    for (const li of d.querySelectorAll("li.colophon")) expect(bucketsOf(li), li.id).toHaveLength(1);
    for (const { body, bucket } of written) {
      const li = [...d.querySelectorAll("li.colophon")].find(
        (el) => el.querySelector(".colophon-body")!.textContent === body,
      )!;
      expect(li, `${body.length} chars on the page`).toBeTruthy();
      expect(bucketsOf(li), `${body.length} chars`).toEqual([bucket]);
    }

    expect(await stream.waitFor((e) => written.every((w) => e.some((ev) => ev.data.html.includes(w.body))), 3000)).toBe(true);
    for (const { body, bucket } of written) {
      const ev = stream.events.find((e) => e.data.html.includes(body))!;
      const li = doc(`<ol>${ev.data.html}</ol>`).querySelector("li.colophon")!;
      expect(bucketsOf(li), `${body.length} chars live`).toEqual([bucket]);
    }
  } finally {
    stream.close();
  }
});
