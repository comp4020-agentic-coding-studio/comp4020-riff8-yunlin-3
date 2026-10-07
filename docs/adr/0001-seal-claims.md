# 0001: seals are first-come unique claims; drafts are never broadcast

## Status

Accepted, crit 9 ("All at once").

## Context

Until now a visitor's seal was one of twelve characters hashed from their
anonymous browser token: there was nothing to decide when two people
arrived at once, because nobody chose anything. Two changes make Colophon a
place where several people act on the same thing at the same time.

First, a visitor can now choose their seal by meaning. They type an English
word ("keep", "mountain", "remember"), and the chooser offers the characters
in a curated dictionary of about 140 single-character seals
(`src/dictionary.ts`) that mean it. Real collectors' seals were personal
marks: a reader of an old scroll recognises the same 珍 on three colophons
as the same hand. A seal only does that work if it isn't everyone's.

Second, confirmed colophons now reach every open page within about a second
(`src/live.ts`). That raises the question of what else should travel:
specifically, whether other people should see a line while it's being
written.

## Decision 1: who may hold a seal

### Options considered

- **Allow duplicates.** Anyone may choose any seal. Simplest to build, with
  nothing to race over and nothing to refuse. But a seal then means less: 珍
  on two colophons says nothing about whether one hand wrote both, and
  anyone can imitate anyone's mark on purpose. It turns the seal into a
  mood, not a mark.
- **Unique pairs of two characters.** A seal is two characters (藏珍, 山月),
  unique per visitor. Many more combinations, so scarcity mostly disappears.
  But pairs read as phrases, and most of the ~20,000 pairs from a
  140-character list are nonsense or accidentally mean something we didn't
  intend; making them read well needs a far larger dictionary reviewed by
  someone who reads Chinese. More dictionary to get right, for an app whose
  dictionary is already flagged as needing that review.
- **First-come unique claims (chosen).** A seal chosen from the dictionary
  belongs to one visitor token at a time.

### Decision

First-come unique claims, enforced by the database. `seal_claims` has
`glyph TEXT PRIMARY KEY` and `token TEXT NOT NULL UNIQUE` (`src/migrate.ts`).
Claiming deletes the visitor's old claim and inserts the new one inside one
`BEGIN IMMEDIATE` transaction (`claimSeal` in `src/db.ts`). If two visitors
claim the same glyph at once, the second insert fails the primary key, its
transaction rolls back, and that visitor keeps whatever they held before and
is told the seal is taken, with the other seals for the same word offered
instead. There is no check-then-insert anywhere: the constraint decides the
race atomically, whatever order requests interleave in.

The rules:

- a visitor holds at most one claim
- changing seals releases the old one in the same transaction; a visitor can
  also give their seal up and go back to their hash glyph
- each colophon snapshots the seal in force when it was written (the `seal`
  column), so entries already written keep their seal when the writer
  changes or gives it up --- history is never rewritten
- visitors who never choose keep their hash glyph and hold no claim. Hash
  glyphs are a shared fallback, not claims: an unchosen 珍 may coincide with
  someone's chosen 珍, so chosen seals are drawn as a filled stamp and
  hash glyphs as an outline, and the two never look the same

### Why it isn't a name

The chooser only ever offers characters from the dictionary, found by an
English word. Free text is never accepted and arbitrary input is never
transliterated, so a visitor can't spell themselves out. A seal says what
someone cares about, not who they are.

### What it costs

- **Scarcity in a small pool.** About 140 seals. Once a few popular ones are
  held ("treasure", "mountain"), later visitors get their second choice or
  their hash glyph. That's honest to the object (a seal worth recognising is
  a seal someone else can't have) but it will feel like a refusal to some.
- **Squatting.** Nothing stops one person with many browsers, or a script,
  from claiming every seal. There's no account to rate-limit by, and adding
  one would break the harness. If it happens the remedy is operational
  (release claims whose token never wrote a line), and this ADR is where
  that would be decided.
- **A lost cookie is a lost claim.** The claim belongs to the browser's
  anonymous token. Clear cookies or switch devices and the seal stays held
  by a token nobody has any more, unclaimable forever unless someone
  releases it by hand. There's deliberately no recovery path, since recovery
  needs an identity.

## Decision 2: unfinished drafts are never broadcast

Only a confirmed colophon travels: the live event is sent from the same code
path that persists it, after the insert (`POST /colophons` in
`src/server.ts`). Nothing a visitor types is sent anywhere until they press
"Write it in"; the ink-in typing effect is local to their own page.

The alternative, showing other people a line as it's being written, is the
most "real-time" thing the app could do, and the most like a chat room.
Colophons are meant to be considered: a visitor should be able to write,
reconsider and delete a draft without anyone watching, because once it's in
it can't be taken back. Broadcasting drafts would also be a typing
indicator, which is presence, which the harness rules out.

What it costs: the room feels quieter than it is. Two people writing at the
same moment see nothing of each other until a line lands, and a line that
someone abandons leaves no trace at all. That quiet is the point.

## Consequences

- Reconnects are exact: each colophon's id is its SSE event id, and a page
  that drops its connection sends `Last-Event-ID` and gets what it missed, in
  order, with no duplicates (`spec/live.test.ts`). A page whose gap is too
  long to replay is told to reload; someone coming back the next day just
  loads the page.
- `spec/seal-claims.test.ts` races two claims of the same seal and checks
  exactly one wins, and that neither visitor's existing entries change.
