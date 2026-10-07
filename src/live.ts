import type { IncomingMessage, ServerResponse } from "node:http";
import { colophonsAfter, type Colophon } from "./db.ts";

// One server-sent-events stream per open page. Only confirmed colophons ever
// travel here: addColophon's caller broadcasts after the insert succeeds, so
// a draft, a rejected line or anything a visitor is still typing never
// reaches anyone else (docs/adr/0001-seal-claims.md, second decision).

// A 256 MB single machine: each stream is a socket plus a small object, but an
// unbounded count is still an unbounded cost. Past the cap a page just doesn't
// go live; it still renders, and a reload shows everything.
export const MAX_STREAMS = 200;
const KEEPALIVE_MS = 25_000;
// A reconnect that missed more than this is better served by a fresh page
// than by replaying a backlog down the stream.
const MAX_REPLAY = 200;

interface Stream {
  res: ServerResponse;
  token: string;
}

const streams = new Set<Stream>();

// Each viewer gets the entry rendered for them: "yours" is decided against
// the token on that stream's own request, so no token ever leaves the server.
export type EntryRenderer = (c: Colophon, ownToken: string) => { html: string; legend: string };

let renderEntry: EntryRenderer = () => ({ html: "", legend: "" });
export function setEntryRenderer(fn: EntryRenderer): void {
  renderEntry = fn;
}

function frame(c: Colophon, token: string): string {
  const { html, legend } = renderEntry(c, token);
  return `id: ${c.id}\nevent: colophon\ndata: ${JSON.stringify({ id: c.id, html, legend })}\n\n`;
}

function lastSeen(req: IncomingMessage, url: URL): number | undefined {
  // EventSource sends Last-Event-ID itself on every reconnect; the first
  // connect carries ?after= (the newest id the server-rendered page already
  // shows), so nothing written between render and connect is lost.
  const raw = req.headers["last-event-id"] ?? url.searchParams.get("after") ?? undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value !== undefined && /^\d{1,15}$/.test(value) ? Number(value) : undefined;
}

export function openStream(req: IncomingMessage, res: ServerResponse, url: URL, token: string): void {
  if (streams.size >= MAX_STREAMS) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "30" });
    res.end("too many open pages; reload later");
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 2000\n\n");

  // Replay and registration happen in the same synchronous turn, and inserts
  // are synchronous too, so no colophon can land between the two: no gap, no
  // duplicate.
  const after = lastSeen(req, url);
  if (after !== undefined) {
    const missed = colophonsAfter(after, MAX_REPLAY + 1);
    if (missed.length > MAX_REPLAY) res.write("event: reload\ndata: {}\n\n");
    else for (const c of missed) res.write(frame(c, token));
  }

  const stream: Stream = { res, token };
  streams.add(stream);
  const drop = (): void => {
    streams.delete(stream);
  };
  req.on("close", drop);
  res.on("error", drop);
}

export function broadcast(c: Colophon): void {
  for (const s of streams) s.res.write(frame(c, s.token));
}

setInterval(() => {
  for (const s of streams) s.res.write(": keepalive\n\n");
}, KEEPALIVE_MS).unref();
