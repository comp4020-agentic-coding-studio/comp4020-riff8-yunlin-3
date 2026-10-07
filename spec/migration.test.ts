import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { migrate } from "../src/migrate.ts";

// The live app runs on a /data volume that already holds colophons written
// before seals and inks existed. The migration runs on every boot, so it has
// to upgrade that database in place, twice over, and lose nothing.
const dir = mkdtempSync(join(tmpdir(), "colophon-migrate-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

it("upgrades a database that already has colophons without losing or changing any", () => {
  const db = new DatabaseSync(join(dir, "old.db"));
  // The schema as it shipped at crit 8.
  db.exec(`CREATE TABLE colophons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`);
  const insert = db.prepare("INSERT INTO colophons (token, body, created_at) VALUES (?, ?, ?)");
  for (let i = 0; i < 25; i++) insert.run(`token-${i}`, `line ${i} <b>as written</b>`, 1_700_000_000_000 + i);
  const before = db.prepare("SELECT id, token, body, created_at FROM colophons ORDER BY id").all();

  migrate(db);
  migrate(db); // idempotent: every boot runs it

  const after = db.prepare("SELECT id, token, body, created_at FROM colophons ORDER BY id").all();
  expect(after).toEqual(before);

  const rows = db.prepare("SELECT seal, ink FROM colophons").all() as { seal: unknown; ink: unknown }[];
  expect(rows.every((r) => r.seal === null && r.ink === null)).toBe(true);

  // New rows carry the snapshot columns, and ids carry on from the old ones.
  db.prepare("INSERT INTO colophons (token, body, created_at, seal, ink) VALUES ('t', 'new', 1, '山', 'zi')").run();
  const newest = db.prepare("SELECT * FROM colophons ORDER BY id DESC LIMIT 1").get() as Record<string, unknown>;
  expect(newest).toMatchObject({ id: 26, seal: "山", ink: "zi" });

  // The claims table exists and enforces one holder per glyph.
  db.prepare("INSERT INTO seal_claims (glyph, token, claimed_at) VALUES ('山', 'a', 1)").run();
  expect(() => db.prepare("INSERT INTO seal_claims (glyph, token, claimed_at) VALUES ('山', 'b', 1)").run()).toThrow(
    /UNIQUE|PRIMARY/,
  );
  db.close();
});

it("creates the full schema on an empty database", () => {
  const db = new DatabaseSync(join(dir, "fresh.db"));
  migrate(db);
  const cols = (db.prepare("PRAGMA table_info(colophons)").all() as { name: string }[]).map((c) => c.name);
  expect(cols).toEqual(["id", "token", "body", "created_at", "seal", "ink"]);
  db.close();
});
