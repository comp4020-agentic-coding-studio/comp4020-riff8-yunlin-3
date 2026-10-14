# TODO

The running to-do list for this repo: re-read it before each task, update it in
the same commit as the work.

## Now

- Crit 9 pod prompt (team run, aimed at crit 10 "Fly by instruments"):
  M2 in progress: the colophons become a right-to-left handscroll, a fixed
  writing dock, smooth scrolling, the dictionary to 800+.

## Next

- [ ] P1 have a Chinese reader review every row of `src/dictionary.ts` and
  `src/dictionary/*.ts` (glyph, pinyin, gloss, search words), now 885 rows,
  before the seals are trusted
- [ ] P2 a test for the SSE stream cap (200) and the 25 s keepalive; both are
  in `src/live.ts` but untested (see Context)
- [ ] P3 the spruces in `scripts/paint.py` still read a little like stacked
  chevrons; softer, more irregular tiers would be closer to the brief's
  watercolour
- [ ] P3 remaining extras not attempted: a cairn whose height tracks the
  colophon count, and a time-of-day sky tint computed in the browser

## Done

- [x] P1 L2: browse seals by theme on /seal (no JS, paginated, never
  echoed), each sheet's date links to its line, other people's lines
  announced with a short excerpt (glyph only while you type), the overview
  strip appears with the first line, pages gzipped (1.15 MB to 53 kB at
  2,000 lines). L3: sheets sized by their line, so short notes take a
  narrow strip and two share a phone screen (087edcd). Testers: a11y L2 no
  blockers; 942 Tab stops through the scroll is the one major (next)

- [x] P1 the seal dictionary from 142 to 885 entries in nine themes, every
  batch checked row by row (nine wrong search words and one wrong glyph
  fixed); kinder ranked search: case, plurals, -ing/-ed, gloss words (ddc94e6)
- [x] P1 L1: new lines announced to screen readers; focus stays in the box
  after a submit; nothing hidden under the dock; overview strip with "you are
  here", a line cue and red ticks for your own lines; README and CLAUDE.md
  rewritten for the handscroll (ddc94e6). Testers: ux proved every M1b
  finding fixed; perf 0 long tasks, p95 16.7 ms at 2,000 rows

- [x] P0 the writing dock (fixed, CSS-only, no-JS form) and the colophons as a
  right-to-left mounted handscroll that opens at the newest line; eased wheel,
  keys, arrivals that never move a reader elsewhere; painting removed (55c779f)

- [x] P0 who did what, in the logs: logfmt `who=<glyph>#<tag>`, never a
  token or body; ADR 0002; error boundary so a half-sent body can't crash
  the server; a rejected plain POST answers 422 with the text kept (ba16ff7)

- [x] P0 `CLAUDE.md` working agreement, `TODO.md` (fe07cb6)
- [x] P0 SSE live append + `Last-Event-ID` reconnect + tests (a9d4284)
- [x] P0 DB migration + seal/ink columns, tested on a populated database
  (a9d4284)
- [x] P0 ADR 0001 + README/CLAUDE.md consistency (a9d4284)
- [x] P1 dictionary + English to Chinese chooser, atomic claims (a9d4284)
- [x] P1 Chinese to English reveal + legend (a9d4284, styled in 72787aa)
- [x] P1 ink palette + contrast and seal-distance tests (72787aa)
- [x] P2 theme: mount, cloth, tokens (72787aa)
- [x] P2 watercolour painting + header wash (72787aa)
- [x] P2 ink-in typing (32519bb)
- [x] P2 lantern launch, including the optional faint lantern for other
  people's arrivals (32519bb)
- [x] P3 fan opening (CSS in 72787aa, once-per-session gate in 32519bb)
- [x] P3 extras: fresh ink that dries over ~8 s, so a live arrival reads as
  just written (a6edc00)
- [x] P3 extras: seal press as an entry lands, the way a collector's seal
  finishes a colophon (a6edc00)
- [x] P3 extras: mist drifting across the painting, so it feels like weather
  (a6edc00)
- [x] P3 extras: print stylesheet, checked by printing `/readme/` to PDF
  (72787aa)
- [x] README on the look and behaviour; claim-button label fix (1c8468c)

## Context

- The brief was the pod's crit 8 `prompt.md` (deleted in the last commit),
  aimed at crit 9 "All at once". Pod run: the harness pushes and CI deploys.
- Local checks: start the app with a scratch DB, e.g.
  `DB_PATH=/tmp/colophon/c.db PORT=8613 node src/server.ts`, then
  `APP_URL=http://localhost:8613 pnpm check`. Other runs share the machine,
  so 8080 may be taken; kill your own server by PID only.
- SSE: first connect passes `?after=<newest rendered id>`, reconnects use
  `Last-Event-ID`; replay and registration happen in one synchronous turn,
  so no gap. Over 200 missed: a `reload` event. Each stream renders "yours"
  against its own cookie, so tokens never leave the server.
- The stream cap and keepalive aren't tested: opening 200 streams races
  other spec files' streams, and a keepalive test waits 25 s. An env var to
  lower both in tests would make it cheap.
- Ink: a missing key means the default; an unknown key is refused
  (`?error=ink`, or 422 JSON for the script).
- `POST /colophons` with `Accept: application/json` answers 201 `{id, html,
  legend}` or 422 `{error, message}`; the plain form gets 303s as before.
- Seal tests release their claims, so a reused local DB doesn't fill the pool.
- Client tests (`spec/client.test.ts`) run the served `app.js` in jsdom
  against the running app with real POSTs and a fake EventSource;
  `window.colophonConfig.handoffMs` shortens the lantern handoff there.
- The script reserves the page's own accepted ids until the lantern hands
  over, and queues live events while a submit is in flight, so the echo
  never lands early or twice.
- Decided: the Wang Yi handscroll photo stays, smaller, as "the tradition
  this margin borrows from"; the watercolour is the mounted painting.
- Browser checks done: two independent agent-browser sessions (390x844
  writer, 1920x1080 watcher) saw the line arrive ~60 ms after the click; a
  server restart with a line written before the page reconnected was
  replayed via `Last-Event-ID` with no reload; both viewports have no
  horizontal scroll; reduced motion drops the fan, lanterns and ink-in.
