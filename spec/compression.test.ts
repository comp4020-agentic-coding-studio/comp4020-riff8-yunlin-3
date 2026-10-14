import { request, type IncomingHttpHeaders } from "node:http";
import { gunzipSync } from "node:zlib";
import { expect, it } from "vitest";
import { baseUrl, marker, post } from "./helpers.ts";

// Pages and static text go out gzipped when the client asks; the live event
// stream and images never do. Node's fetch decompresses on its own and hides
// the header, so these read the raw response over node:http.
interface Raw {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

// headersOnly: resolve as soon as the headers arrive and hang up (the event
// stream never ends on its own).
function raw(path: string, headers: Record<string, string> = {}, headersOnly = false): Promise<Raw> {
  return new Promise((resolve, reject) => {
    const req = request(new URL(path, baseUrl), { headers }, (res) => {
      if (headersOnly) {
        resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.alloc(0) });
        res.on("error", () => {});
        req.destroy();
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on("error", (e) => (headersOnly ? undefined : reject(e)));
    req.end();
  });
}

const varyIncludes = (h: IncomingHttpHeaders, v: string) =>
  String(h.vary ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .includes(v.toLowerCase());

it("the scroll page is gzipped when asked, and decompresses to the page", async () => {
  const line = marker("gzip");
  await post("/colophons", { body: line });
  const res = await raw("/", { "Accept-Encoding": "gzip, deflate, br" });
  expect(res.status).toBe(200);
  expect(res.headers["content-encoding"]).toBe("gzip");
  expect(varyIncludes(res.headers, "Accept-Encoding")).toBe(true);
  const html = gunzipSync(res.body).toString("utf8");
  expect(html).toContain('class="colophon-list"');
  expect(html).toContain(line);
});

it("without Accept-Encoding, or with gzip refused, the page goes out plain", async () => {
  const cases: Record<string, string>[] = [{}, { "Accept-Encoding": "identity" }, { "Accept-Encoding": "gzip;q=0" }];
  for (const headers of cases) {
    const res = await raw("/", headers);
    expect(res.status).toBe(200);
    expect(res.headers["content-encoding"], JSON.stringify(headers)).toBeUndefined();
    expect(varyIncludes(res.headers, "Accept-Encoding")).toBe(true);
    expect(res.body.toString("utf8")).toContain('class="colophon-list"');
  }
});

it("the stylesheet and script are gzipped when asked", async () => {
  for (const path of ["/public/styles.css", "/public/app.js"]) {
    const res = await raw(path, { "Accept-Encoding": "gzip" });
    expect(res.status, path).toBe(200);
    expect(res.headers["content-encoding"], path).toBe("gzip");
    expect(gunzipSync(res.body).length, path).toBeGreaterThan(0);
  }
});

it("the live event stream is never gzipped", async () => {
  const res = await raw("/events", { "Accept-Encoding": "gzip", Accept: "text/event-stream" }, true);
  expect(res.status).toBe(200);
  expect(res.headers["content-type"]).toMatch(/^text\/event-stream/);
  expect(res.headers["content-encoding"]).toBeUndefined();
});

it("the handscroll photograph is not gzipped", async () => {
  const res = await raw("/public/scroll.avif", { "Accept-Encoding": "gzip" });
  expect(res.status).toBe(200);
  expect(res.headers["content-encoding"]).toBeUndefined();
});
