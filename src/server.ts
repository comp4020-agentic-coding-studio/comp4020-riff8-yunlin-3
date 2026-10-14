import { createServer } from "node:http";
import { readdirSync, readFile, readFileSync } from "node:fs";
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
import { DEFAULT_INK, inkKey } from "./ink.ts";
import { lookupGlyph, searchSeals, suggestWords } from "./dictionary.ts";
import { currentSeal, entrySeal } from "./seal.ts";
import { log, who } from "./log.ts";

const PORT = Number(process.env.PORT ?? 8080);
const README = readFileSync("README.md", "utf8");

// Every decision record, read once at startup and served at /adr/<slug>/.
// A request only ever looks a slug up in this map; no part of the URL reaches
// the filesystem. A missing docs/adr/ or file just means fewer ADRs.
const ADR_KICKERS: Record<string, string> = {
  "0001-seal-claims": "a decision about several people at once",
  "0002-who-did-what": "who did what, in the logs",
};
const ADRS = new Map<string, { number: string; markdown: string }>();
try {
  for (const file of readdirSync("docs/adr")) {
    const m = /^((\d{4})-[a-z0-9-]+)\.md$/.exec(file);
    if (!m) continue;
    try {
      ADRS.set(m[1]!, { number: m[2]!, markdown: readFileSync(`docs/adr/${file}`, "utf8") });
    } catch {}
  }
} catch {}

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

const FORM_ERRORS = new Set(["empty", "long", "ink"]);

// The route a failed request was for, named only if it's one this server
// serves; any other path is client-supplied text and stays out of the log.
const ROUTES = new Set(["/", "/colophons", "/seal", "/events", "/readme/"]);
function routeName(rawUrl: string | undefined): string {
  try {
    const { pathname } = new URL(rawUrl ?? "/", "http://internal");
    if (ROUTES.has(pathname)) return pathname;
    if (/^\/adr\/[a-z0-9-]+\/$/.test(pathname) && ADRS.has(pathname.slice(5, -1))) return "/adr";
    if (pathname.startsWith("/public/")) return "/public";
  } catch {}
  return "?";
}

// The glyph a visitor signs with right now, before whatever they're doing.
function actor(token: string): string {
  return who(token, currentSeal(token, claimOf(token)).entry.glyph);
}

async function handle(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://internal");
  const { token, setCookie } = sealToken(req.headers.cookie);
  if (setCookie) res.setHeader("Set-Cookie", setCookie);

  if (req.method === "GET" && url.pathname === "/") {
    // Only a known error key reaches the page: anything else in ?error= is a
    // stranger's query string, and "constructor" or "__proto__" would resolve
    // to an object property rather than a message.
    const raw = url.searchParams.get("error");
    const error = raw !== null && FORM_ERRORS.has(raw) ? raw : undefined;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(renderIndex(listColophons(), token, error));
    return;
  }

  if (req.method === "GET" && url.pathname === "/events") {
    openStream(req, res, url, token);
    return;
  }

  if (req.method === "POST" && url.pathname === "/colophons") {
    const raw = await readBody(req);
    if (raw === undefined) {
      log("colophon.rejected", { who: actor(token), reason: "too-large" });
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
      log("colophon.rejected", { who: actor(token), reason: error, len: body.length });
      if (wantsJson(req)) {
        res.writeHead(422, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error, message: errorMessage(error) }));
      } else {
        // Without JavaScript, a redirect would lose what they wrote. Answer
        // with the page itself, the text back in the box (escaped by
        // renderIndex) and their ink still chosen, so they can fix and resend.
        const draft = { body: (params.get("body") ?? "").slice(0, 2000), ink: ink ?? DEFAULT_INK };
        res.writeHead(422, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderIndex(listColophons(), token, error, draft));
      }
      return;
    }

    // The seal in force right now is snapshotted onto the row; the live event
    // goes out from this same path, after the insert, so only a confirmed
    // colophon ever travels.
    const writer = actor(token);
    const colophon = addColophon(token, body, claimOf(token) ?? null, ink!);
    log("colophon.written", { who: writer, id: colophon.id, ink: ink!, len: body.length });
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

  // A 422 page leaves /colophons in the address bar; a reload there is a GET.
  if (req.method === "GET" && url.pathname === "/colophons") {
    res.writeHead(303, { Location: "/" });
    res.end();
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
    // A client's unknown glyph is never logged; a dictionary glyph is safe to.
    const visitor = actor(token);
    let location: string;
    if (glyph === "") {
      const held = claimOf(token);
      releaseSeal(token);
      if (held) log("seal.released", { who: visitor, seal: held });
      location = "/seal?released=1";
    } else if (!lookupGlyph(glyph)) {
      log("seal.refused", { who: visitor, reason: "unknown" });
      location = `/seal?q=${q}&error=unknown`;
    } else if (claimSeal(token, glyph) === "claimed") {
      log("seal.claimed", { who: visitor, seal: glyph });
      location = `/seal?claimed=${encodeURIComponent(glyph)}`;
    } else {
      log("seal.refused", { who: visitor, reason: "taken", seal: glyph });
      location = `/seal?q=${q}&error=taken&glyph=${encodeURIComponent(glyph)}`;
    }
    res.writeHead(303, { Location: location });
    res.end();
    return;
  }

  const adr = req.method === "GET" ? /^\/adr\/([a-z0-9-]+)\/$/.exec(url.pathname) : null;
  const record = adr ? ADRS.get(adr[1]!) : undefined;
  if (adr && record) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      renderReadme(
        renderMarkdown(record.markdown),
        `ADR ${record.number} — Colophon`,
        ADR_KICKERS[adr[1]!] ?? "a decision record",
      ),
    );
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
}

// One error boundary for every request. An async handler's rejection is
// otherwise unhandled, and Node exits on one: a client that sends half its
// declared Content-Length and hangs up made the body read throw and took the
// whole server down for every reader. Logs a known route name only, never a body,
// cookie or query string.
const server = createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    log("error", { path: routeName(req.url), code: (err as { code?: string })?.code ?? "?" });
    if (!res.headersSent && !res.destroyed) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("server error");
    } else if (!res.writableEnded) {
      res.destroy();
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`colophon listening on 0.0.0.0:${PORT}`);
});
