import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { connect, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { log, who } from "../src/log.ts";
import { sealGlyph } from "../src/seal.ts";

// Crit 10: the logs say who did what, without saying who anyone is. A visitor
// is named by the seal in force plus six hex of a one-way hash of their token
// (docs/adr/0002-who-did-what.md). The shared app's stdout is out of reach
// from here, so the unit half calls src/log.ts directly and the integration
// half starts its own server on a scratch database and reads what it prints.

const TOKEN = "0f8e7d6c-5b4a-4392-8170-6f5e4d3c2b1a";
const OTHER = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

function captured(fn: () => void): string {
  const lines: string[] = [];
  const spy = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  });
  const write = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  try {
    fn();
  } finally {
    spy.mockRestore();
    write.mockRestore();
  }
  return lines.join("\n");
}

it("who() is the glyph plus six hex, stable per token, different across tokens, and never the token", () => {
  const a = who(TOKEN, "藏");
  expect(a).toMatch(/^藏#[0-9a-f]{6}$/);
  expect(who(TOKEN, "藏")).toBe(a);
  expect(who(OTHER, "藏")).not.toBe(a);
  expect(who(TOKEN, "山").slice(1)).toBe(a.slice(1));
  for (const piece of TOKEN.split("-")) expect(a).not.toContain(piece);
});

it("log() writes one logfmt line, and any value that could break the line becomes ?", () => {
  const body = "a line someone wrote = with \"quotes\" and spaces";
  const out = captured(() =>
    log("colophon.written", { who: who(TOKEN, "藏"), id: 7, ink: "mo-lan", len: body.length, note: body }),
  );
  expect(out.trim().split("\n")).toHaveLength(1);
  expect(out).toMatch(/^event=colophon\.written /);
  expect(out).toContain("id=7");
  expect(out).toContain("ink=mo-lan");
  expect(out).toContain(`len=${body.length}`);
  expect(out).toContain("note=?");
  expect(out).not.toContain("someone wrote");
  expect(out).not.toContain(TOKEN);
  for (const bad of ["a b", 'a"b', "a=b", "a\\b", "", "line\nbreak"]) {
    expect(captured(() => log("x", { v: bad }))).toMatch(/v=\?\s*$/);
  }
});

// ---- integration: our own server, our own stdout ----

let child: ChildProcess | undefined;
let dir = "";
let base = "";
let stdout = "";

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => resolve(port));
    });
  });
}

async function until(pred: () => boolean, ms: number, what: string): Promise<void> {
  const end = Date.now() + ms;
  while (!pred()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}; stdout so far:\n${stdout}`);
    await new Promise((r) => setTimeout(r, 20));
  }
}

const logLines = () => stdout.split("\n").filter((l) => l.startsWith("event="));

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "colophon-logs-"));
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["src/server.ts"], {
    env: { ...process.env, PORT: String(port), DB_PATH: join(dir, "c.db") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout!.setEncoding("utf8").on("data", (d: string) => (stdout += d));
  child.stderr!.setEncoding("utf8").on("data", (d: string) => (stdout += d));
  await until(() => /listening/.test(stdout), 15_000, "the server to listen");
}, 20_000);

afterAll(async () => {
  if (child && child.exitCode === null) {
    const exited = new Promise((r) => child!.once("exit", r));
    child.kill("SIGTERM");
    await Promise.race([exited, new Promise((r) => setTimeout(r, 3000))]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  rmSync(dir, { recursive: true, force: true });
});

function send(path: string, fields: Record<string, string>, cookie?: string): Promise<Response> {
  return fetch(new URL(path, base), {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...(cookie ? { Cookie: cookie } : {}) },
    body: new URLSearchParams(fields).toString(),
  });
}

it("a written colophon and a claimed seal each log one line naming the right seal, and no token or body", async () => {
  const first = await fetch(new URL("/", base));
  const cookie = first.headers.get("set-cookie")!.split(";")[0]!;
  const token = decodeURIComponent(cookie.slice(cookie.indexOf("=") + 1));
  const hashGlyph = sealGlyph(token);
  const tag = who(token, hashGlyph).slice(hashGlyph.length);

  const body = `logs-body-${Date.now()}-unmistakable`;
  const wrote = await send("/colophons", { body, ink: "shi-lu" }, cookie);
  expect(wrote.status).toBe(303);
  await until(() => logLines().some((l) => l.startsWith("event=colophon.written ")), 5000, "colophon.written");
  const written = logLines().find((l) => l.startsWith("event=colophon.written "))!;
  expect(written).toContain(`who=${hashGlyph}${tag}`);
  expect(written).toContain("ink=shi-lu");
  expect(written).toContain(`len=${body.length}`);
  expect(written).toMatch(/ id=\d+/);

  // The page's own claim form names a seal free to take for "dream".
  const search = await (await fetch(new URL("/seal?q=dream", base), { headers: { Cookie: cookie } })).text();
  const glyph = search.match(/name="glyph" value="([^"]+)"/)?.[1];
  expect(glyph, "expected a free seal for 'dream' on a fresh database").toBeTruthy();
  const claimed = await send("/seal", { glyph: glyph!, q: "dream" }, cookie);
  expect(claimed.status).toBe(303);
  await until(() => logLines().some((l) => l.startsWith("event=seal.claimed ")), 5000, "seal.claimed");
  const claimLine = logLines().find((l) => l.startsWith("event=seal.claimed "))!;
  // who is the seal in force before the claim: still the hash glyph.
  expect(claimLine).toContain(`who=${hashGlyph}${tag}`);
  expect(claimLine).toContain(`seal=${glyph}`);

  await send("/seal", { glyph: "" }, cookie);
  await until(() => logLines().some((l) => l.startsWith("event=seal.released ")), 5000, "seal.released");
  expect(logLines().find((l) => l.startsWith("event=seal.released "))).toContain(`who=${glyph}${tag}`);

  expect(stdout).not.toContain(token);
  expect(stdout).not.toContain(cookie);
  expect(stdout).not.toContain(body);
  expect(stdout).not.toContain("unmistakable");
});

it("a rejected submission logs who and why, never the text", async () => {
  const first = await fetch(new URL("/", base));
  const cookie = first.headers.get("set-cookie")!.split(";")[0]!;
  const token = decodeURIComponent(cookie.slice(cookie.indexOf("=") + 1));
  const before = logLines().length;
  const body = `rejected-${"x".repeat(330)}`;
  await send("/colophons", { body }, cookie);
  await until(
    () => logLines().slice(before).some((l) => l.startsWith("event=colophon.rejected ")),
    5000,
    "colophon.rejected",
  );
  const line = logLines().slice(before).find((l) => l.startsWith("event=colophon.rejected "))!;
  expect(line).toContain(`who=${who(token, sealGlyph(token))}`);
  expect(line).toMatch(/ reason=\S+/);
  expect(line).toContain(`len=${body.length}`);
  expect(stdout).not.toContain("rejected-xxx");
  expect(stdout).not.toContain(token);
});

it("a body cut off mid-request logs an error line with no body, and the server keeps answering", async () => {
  const before = logLines().length;
  const { port } = new URL(base);
  await new Promise<void>((resolve) => {
    const socket = connect(Number(port), "127.0.0.1", () => {
      socket.write(
        "POST /colophons HTTP/1.1\r\nHost: x\r\nContent-Type: application/x-www-form-urlencoded\r\n" +
          "Content-Length: 100\r\n\r\nbody=halfway-secret",
        () => setTimeout(() => (socket.destroy(), resolve()), 100),
      );
    });
    socket.on("error", () => resolve());
  });
  await until(() => logLines().slice(before).some((l) => l.startsWith("event=error ")), 5000, "event=error");
  expect(child!.exitCode).toBeNull();
  expect((await fetch(new URL("/", base))).status).toBe(200);
  expect(stdout).not.toContain("halfway-secret");
});
