import { lookupGlyph, type SealEntry } from "./dictionary.ts";

// A visitor who never chooses a seal still has one: a character drawn
// deterministically from their anonymous token, from a small pool of words
// real Chinese collectors' and connoisseurs' seals use for looking, keeping,
// and inscribing (鑑賞 "to appraise", 珍藏 "to treasure and keep", 題記 "to
// inscribe a note" among them). Every one of these is also in the dictionary,
// so its meaning can always be shown. It stands in for a name without being
// one, and holds no claim.
export const HASH_GLYPHS = ["鑑", "賞", "藏", "觀", "閱", "記", "題", "珍", "玩", "守", "傳", "校"];

export function sealGlyph(token: string): string {
  let hash = 0;
  for (const ch of token) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return HASH_GLYPHS[hash % HASH_GLYPHS.length]!;
}

export interface Seal {
  entry: SealEntry;
  chosen: boolean;
}

function toSeal(glyph: string, chosen: boolean): Seal {
  // Every glyph that can reach here is a dictionary or hash glyph, and every
  // hash glyph is in the dictionary (spec/seal-dictionary.test.ts).
  return { entry: lookupGlyph(glyph)!, chosen };
}

// The seal a visitor signs with right now: their claim, else their hash glyph.
export function currentSeal(token: string, claimed: string | undefined): Seal {
  return claimed && lookupGlyph(claimed) ? toSeal(claimed, true) : toSeal(sealGlyph(token), false);
}

// The seal an entry was written with: the snapshot on the row, else (rows
// from before seals could be chosen, or from visitors who never chose) the
// writer's hash glyph. Never the writer's current claim: history isn't
// rewritten when someone changes seals.
export function entrySeal(row: { seal: string | null; token: string }): Seal {
  return row.seal && lookupGlyph(row.seal) ? toSeal(row.seal, true) : toSeal(sealGlyph(row.token), false);
}
