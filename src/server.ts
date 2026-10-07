import { createServer } from "node:http";
import { readFile, readFileSync } from "node:fs";
import { extname } from "node:path";
import { addColophon, claimedGlyphs, claimOf, claimSeal, listColophons, releaseSeal } from "./db.ts";
import { sealToken } from "./cookies.ts";
import {
  colophonEntry,
  errorMessage,
  legendItem,
  renderIndex,
  renderReadme,
  renderSealChooser,
  MAX_BODY_LENGTH,
} from "./render.ts";
import { renderMarkdown } from "./markdown.ts";
import { broadcast, openStream, setEntryRenderer } from "./live.ts";
import { inkKey } from "./ink.ts";
import { lookupGlyph, searchSeals, suggestWords } from "./dictionary.ts";
import { entrySeal } from "./seal.ts";

const PORT = Number(process.env.PORT ?? 8080);
const README = readFileSync("README.md", "utf8");
const ADR_0001 = readFileSync("docs/adr/0001-seal-claims.md", "utf8");

const MIME: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
};

setEntryRenderer((c, ownToken) => ({ html: colophonEntry(c, ownToken), legend: legendItem(entrySeal(c).entry) }));

// The page's script posts with Accept: application/json so it can launch the
// lantern only on a real acceptance; the plain form gets the redirect it
// always has.
function wantsJson(req: import("node:http").IncomingMessage): boolean {
  return (req.headers.accept ?? "").includes("application/json");
}

// A URL-encoded 320-character colophon body never comes close to this — it's
// a hard ceiling against a request that skips the form's own maxlength, not a
// tuned limit. Checked as bytes arrive, not after the fact: buffering an
// unbounded body into memory first (whatever a crafted Content-Length or a
// chunked request without one claims) is itself the vulnerability on a
// single-machine deploy with a tight memory ceiling.
const MAX_REQUEST_BODY_BYTES = 16 * 1024;

// Once the cap is crossed, later chunks are read and discarded rather than
// accumulated — costs no memory, since each one is immediately eligible for
// GC — but the stream is still let run to its natural end before responding.
// Destroying the connection early, tried first, raced a still-writing client
// into a raw connection error instead of a clean 413: a declared
// Content-Length is a promise the client already committed to keeping, and
// only reading it out fully guarantees the client's own write has finished
// before it goes to read our response. A stalled or genuinely enormous body
// is bounded by Node's own default request timeout, not by this function.
async function readBody(req: import("node:http").IncomingMessage): Promise<string | undefined> {
  const declared = Number(req.headers["content-length"]);
  let tooLarge = Number.isFinite(declared) && declared > MAX_REQUEST_BODY_BYTES;

  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    total += buf.length;
    if (total > MAX_REQUEST_BODY_BYTES) tooLarge = true;
    if (!tooLarge) chunks.push(buf);
  }
  return tooLarge ? undefined : Buffer.concat(chunks).toString("utf8");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://internal");
  const { token, setCookie } = sealToken(req.headers.cookie);
  if (setCookie) res.setHeader("Set-Cookie", setCookie);

  if (req.method === "GET" && url.pathname === "/") {
    const error = url.searchParams.get("error");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderIndex(listColophons(), token, error ?? undefined));
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    openStream(req, res, url, token);
    return;
  }

  if (req.method === "POST" && url.pathname === "/colophons") {
    const raw = await readBody(req);
    if (raw === undefined) {
      res.writeHead(413, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("payload too large");
      return;
    }
    const params = new URLSearchParams(raw);
    const body = (params.get("body") ?? "").trim();
    const ink = inkKey(params.get("ink"));

    let error: string | undefined;
    if (body.length === 0) error = "empty";
    else if (body.length > MAX_BODY_LENGTH) error = "long";
    else if (ink === undefined) error = "ink";

    if (error) {
      if (wantsJson(req)) {
        res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error, message: errorMessage(error) }));
      } else {
        res.writeHead(303, { Location: `/?error=${error}` });
        res.end();
      }
      return;
    }

    // The seal in force right now is snapshotted onto the row; the live event
    // goes out from this same path, after the insert, so only a confirmed
    // colophon ever travels.
    const colophon = addColophon(token, body, claimOf(token) ?? null, ink!);
    broadcast(colophon);

    if (wantsJson(req)) {
      res.writeHead(201, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          id: colophon.id,
          html: colophonEntry(colophon, token),
          legend: legendItem(entrySeal(colophon).entry),
        }),
      );
    } else {
      res.writeHead(303, { Location: "/" });
      res.end();
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/seal") {
    const err = url.searchParams.get("error");
    const wanted = lookupGlyph(url.searchParams.get("glyph") ?? "");
    // A refused claim with no search behind it still shows alternatives: the
    // others that share the wanted seal's first word.
    const query = (url.searchParams.get("q") || (err === "taken" ? wanted?.words[0] : "") || "").slice(0, 40);
    const claimedParam = url.searchParams.get("claimed") ?? undefined;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      renderSealChooser({
        query,
        results: searchSeals(query),
        suggestions: suggestWords(query),
        claimed: claimedGlyphs(),
        token,
        error: err === "taken" || err === "unknown" ? err : undefined,
        wanted: wanted?.glyph,
        justClaimed: claimedParam && lookupGlyph(claimedParam) ? claimedParam : undefined,
        released: url.searchParams.has("released"),
      }),
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/seal") {
    const raw = await readBody(req);
    if (raw === undefined) {
      res.writeHead(413, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("payload too large");
      return;
    }
    const params = new URLSearchParams(raw);
    const glyph = params.get("glyph") ?? "";
    const q = encodeURIComponent((params.get("q") ?? "").slice(0, 40));

    // Glyphs only ever come from the dictionary; Location headers are
    // percent-encoded, since a raw non-ASCII header value throws in node:http.
    let location: string;
    if (glyph === "") {
      releaseSeal(token);
      location = "/seal?released=1";
    } else if (!lookupGlyph(glyph)) {
      location = `/seal?q=${q}&error=unknown`;
    } else if (claimSeal(token, glyph) === "claimed") {
      location = `/seal?claimed=${encodeURIComponent(glyph)}`;
    } else {
      location = `/seal?q=${q}&error=taken&glyph=${encodeURIComponent(glyph)}`;
    }
    res.writeHead(303, { Location: location });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/adr/0001-seal-claims/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderReadme(renderMarkdown(ADR_0001), "ADR 0001 — Colophon", "a decision about several people at once"));
    return;
  }

  if (req.method === "GET" && url.pathname === "/readme/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderReadme(renderMarkdown(README)));
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/public/")) {
    const ext = extname(url.pathname);
    const type = MIME[ext];
    if (!type) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    readFile(`.${url.pathname}`, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": type });
      res.end(data);
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`colophon listening on 0.0.0.0:${PORT}`);
});
