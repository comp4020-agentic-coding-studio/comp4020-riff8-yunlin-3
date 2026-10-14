// Fills a scratch database with colophons for local testing: a realistic mix
// of short lines, lines at the 320-character limit, one unbroken 320-character
// string, every ink, chosen and unchosen seals. Refuses to run without an
// explicit DB_PATH, so it can never touch /data (the live volume) by default.
//
//   DB_PATH=/tmp/colophon-perf/c.db node scripts/seed.ts 2000
//
// Start the server afterwards against the same DB_PATH.
import { randomUUID } from "node:crypto";

if (!process.env.DB_PATH || process.env.DB_PATH.startsWith("/data")) {
  console.error("set DB_PATH to a scratch file (not under /data)");
  process.exit(1);
}

const { db } = await import("../src/db.ts");
const { INKS } = await import("../src/ink.ts");
const { DICTIONARY } = await import("../src/dictionary.ts");

const count = Number(process.argv[2] ?? 2000);
const LINES = [
  "Came back after twenty years; the pine is still here.",
  "Read it twice in the rain.",
  "My grandmother kept a scroll like this above the stove.",
  "Quiet.",
  "Patience is a path under spruce, walked slowly.",
  "I don't know who you all are, but I like sitting with you here.",
  "Written on a train between Canberra and Sydney, somewhere near Goulburn.",
  "The rocks look like they've been waiting for someone to say something.",
];
const LONG =
  "A long line, the kind people write when they've been sitting with a painting for a while and finally decide to leave something behind: the light on the granite, the way the path bends out of sight, a friend who would have liked it, the smell of ink, the hum of the heater, and a promise to come back in spring.";
const UNBROKEN = "x".repeat(320);

const tokens = Array.from({ length: 40 }, () => randomUUID());
const insert = db.prepare("INSERT INTO colophons (token, body, created_at, seal, ink) VALUES (?, ?, ?, ?, ?)");
const start = Date.now() - count * 60_000;

db.exec("BEGIN");
for (let i = 0; i < count; i++) {
  const token = tokens[i % tokens.length]!;
  const body = i === Math.floor(count / 2) ? UNBROKEN : i % 17 === 0 ? LONG.slice(0, 320) : LINES[i % LINES.length]!;
  const seal = i % 3 === 0 ? DICTIONARY[(i * 7) % DICTIONARY.length]!.glyph : null;
  const ink = INKS[i % INKS.length]!.key;
  insert.run(token, body, start + i * 60_000, seal, ink);
}
db.exec("COMMIT");
console.log(`seeded ${count} colophons into ${process.env.DB_PATH}`);
