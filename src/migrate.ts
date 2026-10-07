import type { DatabaseSync } from "node:sqlite";

// Runs on every boot against whatever /data already holds, so every step is
// idempotent and additive: columns are added, never dropped or rewritten, and
// existing colophons keep exactly what they had. A row written before seals
// and inks existed gets NULL in both, which renders as the hash-glyph seal and
// the default ink — what it always looked like.
export function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS colophons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  const columns = new Set(
    (db.prepare("PRAGMA table_info(colophons)").all() as { name: string }[]).map((c) => c.name),
  );
  // The seal and ink in force when the line was written, snapshotted so a
  // later change of seal never rewrites history.
  if (!columns.has("seal")) db.exec("ALTER TABLE colophons ADD COLUMN seal TEXT");
  if (!columns.has("ink")) db.exec("ALTER TABLE colophons ADD COLUMN ink TEXT");

  // First-come unique claims (docs/adr/0001-seal-claims.md): the PRIMARY KEY
  // on glyph decides a race atomically, the UNIQUE on token holds a visitor to
  // one claim.
  db.exec(`
    CREATE TABLE IF NOT EXISTS seal_claims (
      glyph TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      claimed_at INTEGER NOT NULL
    )
  `);
}
