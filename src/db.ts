import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { migrate } from "./migrate.ts";

// /data is the one thing that survives a restart or redeploy (fly.toml mounts
// a volume there). Locally and in CI (which mounts a throwaway /data of its
// own, per checks.yml) it exists too; only a bare local checkout falls back
// to a repo-relative path.
const DB_PATH = process.env.DB_PATH ?? (existsSync("/data") ? "/data/colophon.db" : "./data/colophon.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
migrate(db);

export interface Colophon {
  id: number;
  token: string;
  body: string;
  created_at: number;
  seal: string | null;
  ink: string | null;
}

const selectAll = db.prepare("SELECT * FROM colophons ORDER BY id ASC");
const selectAfter = db.prepare("SELECT * FROM colophons WHERE id > ? ORDER BY id ASC LIMIT ?");
const insert = db.prepare(
  "INSERT INTO colophons (token, body, created_at, seal, ink) VALUES (?, ?, ?, ?, ?) RETURNING *",
);

export function listColophons(): Colophon[] {
  return selectAll.all() as unknown as Colophon[];
}

export function colophonsAfter(id: number, limit: number): Colophon[] {
  return selectAfter.all(id, limit) as unknown as Colophon[];
}

export function addColophon(token: string, body: string, seal: string | null, ink: string | null): Colophon {
  return insert.get(token, body, Date.now(), seal, ink) as unknown as Colophon;
}

const selectClaim = db.prepare("SELECT glyph FROM seal_claims WHERE token = ?");
const selectClaimed = db.prepare("SELECT glyph FROM seal_claims");
const deleteClaim = db.prepare("DELETE FROM seal_claims WHERE token = ?");
const insertClaim = db.prepare("INSERT INTO seal_claims (glyph, token, claimed_at) VALUES (?, ?, ?)");

export function claimOf(token: string): string | undefined {
  return (selectClaim.get(token) as { glyph: string } | undefined)?.glyph;
}

export function claimedGlyphs(): Set<string> {
  return new Set((selectClaimed.all() as { glyph: string }[]).map((r) => r.glyph));
}

// Changing seals releases the old one and takes the new one in one
// transaction. The glyph's PRIMARY KEY decides a simultaneous claim: the
// second insert fails, the transaction rolls back, and that visitor keeps
// whatever they held before. No check-then-insert anywhere.
export function claimSeal(token: string, glyph: string): "claimed" | "taken" {
  db.exec("BEGIN IMMEDIATE");
  try {
    deleteClaim.run(token);
    insertClaim.run(glyph, token, Date.now());
    db.exec("COMMIT");
    return "claimed";
  } catch (err) {
    db.exec("ROLLBACK");
    if (err instanceof Error && /UNIQUE|PRIMARY KEY/i.test(err.message)) return "taken";
    throw err;
  }
}

export function releaseSeal(token: string): void {
  deleteClaim.run(token);
}
