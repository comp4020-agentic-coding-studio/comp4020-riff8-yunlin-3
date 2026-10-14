# TODO

The running to-do list for this repo: re-read it before each task, update it in
the same commit as the work.

## Now

- Nothing in progress. The crit 9 pod prompt (a five-hour team run aimed at
  crit 10 "Fly by instruments") is done and `prompt.md` is deleted; pick up
  from Next. The harness pushes this run's commits after it stops, and CI
  deploys them; until then the live app serves the pre-run version.

## Next

- [ ] P1 have a Chinese reader review every row of `src/dictionary.ts` and
  `src/dictionary/*.ts` (glyph, pinyin, gloss, search words), now 885 rows,
  before the seals are trusted
- [ ] P1 after the harness push and CI deploy, check the live URL: `/`,
  `/readme/`, `/seal` and `/adr/0002-who-did-what/` answer 200 and `/`
  carries the handscroll and the dock (read-only; never write to live)
- [ ] P2 scrolls of ~10,000 lines: glides, the line-mode wheel and live
  arrivals still cost 50-90 ms long tasks (2,000 lines are clean). Chrome's
  per-frame check over 10k `content-visibility: auto` sheets is about half
  the cost. A JS render window fixed the wheel but broke find-in-page and
  copy, so it was dropped; floating the sheets instead of a flex row cut the
  insert reflow in a probe and is the next thing to try
- [ ] P2 one-line notes sit on 480 px sheets, so much of the scroll is empty
  paper; a crit will ask (it suits Ni Zan, but have the argument ready)
- [ ] P2 at 200% text size the band's 18rem minimum is taller than the room
  above the collapsed dock; an em-based cap on short viewports would fix it
- [ ] P2 a test for the SSE stream cap (200) and the 25 s keepalive; both are
  in `src/live.ts` but untested (see Context)
- [ ] P3 under forced colours, the cue's "yours in red" no longer holds
- [ ] P3 remaining extras not attempted: a cairn whose height tracks the
  colophon count, and a time-of-day sky tint (both ruled out by the
  consultant this run as decoration)

## Done

- [x] P2 L9: a line too long for its sheet fades at the foot and takes focus
  so keys scroll it; the dock collapses on short viewports and large text;
  forced colours keep the chosen ink and the strip; one h1 a page (07f29b9).
  final-reviewer: GO

- [x] P2 L8: a frontispiece (引首) at the oldest end, 題記 in plain ink with
  the year the scroll was begun; fixed contained sheet widths and arithmetic
  geometry, so long scrolls cost less and find-in-page and copy reach every
  line; resizing keeps the sheet you were reading (see the merge after 732be41)

- [x] P2 L7: crossing the length limit is announced once each way; a
  rejected no-JS page marks the text `aria-invalid`; seal results labelled by
  their heading; ADR 0002 tells a narrator the tag is the person (b009a73)

- [x] P0 L6: the textarea no longer has `maxlength`, which silently cut a
  321-character paste mid-word against the "never auto-truncate" rule; the
  server is the only length boundary and the counter shows how far over.
  Back after taking a seal reloads instead of showing the old seal; the
  strip ships hidden until the script can drive it (a82d649)

- [x] P1 L5: your own line glides into view even when you were reading
  elsewhere; Back after a date link restores where you were; permalinks
  don't push the page down; seal results as a card grid with #results
  paging; pages never cached; lanterns stay above the dock (c427bdb). ux:
  six of seven L4 findings proven fixed

- [x] P1 L4: the list is newest first in the page itself (`ol reversed`),
  so keyboard, screen reader and no-JS reading all start at the newest
  line; "Skip past the scroll" link; README and CLAUDE.md caught up (bcea551).
  ux: newest sheet is Tab stop 7 with no jump (was 942 stops, first one the
  oldest line)

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

- The brief was the pod's crit 9 `prompt.md` (deleted in the last commit),
  aimed at crit 10 "Fly by instruments": a lead agent, a consultant, four
  builders and five testers, worktrees under `.claude/worktrees/`, nine loop
  iterations (L1-L9). The run's working files (board, contract, decisions,
  findings, screenshots) lived in gitignored `.claude/team/` and are gone
  with the run; the decisions that matter are in `README.md`, `CLAUDE.md`
  and the ADRs.
- Decisions that shaped the build: the scroll reads right to left like a
  real handscroll, newest at the left, and the DOM is newest first
  (`ol reversed`) so keyboard, screen reader and no-JS reading match the
  screen; the writing dock is CSS-fixed; logs are logfmt with
  `who=<glyph>#<6 hex of sha256("colophon-log:"+token)>`, streams counted
  but never named (ADR 0002); someone else's new line is announced with an
  excerpt, glyph only while you type; sheets are sized by line length
  (short/mid/long); a frontispiece (引首) at the oldest end; no "new lines"
  pill (a notification) and no JS render window (breaks find and copy).
- Real bugs testers found and fixed, each with a spec or a CLAUDE.md rule:
  a half-sent request body crashed the server; `?error=constructor` gave an
  empty reply; the textarea's `maxlength` silently cut a pasted line (the
  "never auto-truncate" rule); focus dropped to body after a submit; the
  dock covered focused content; 942 Tab stops through the scroll, starting
  at the oldest line; Back showed a stale seal from the bfcache; nine wrong
  dictionary search words and one wrong glyph (淞 for 凇).
- `memory/` was left alone: in a pod run it belongs to the agent's own
  ticks, so this hand-off lives here rather than in `memory/now.md`.
- Local checks: start the app with a scratch DB, e.g.
  `DB_PATH=/tmp/colophon/c.db PORT=8613 node src/server.ts`, then
  `APP_URL=http://127.0.0.1:8613 pnpm check`. Other runs share the machine,
  so ports may be taken; kill your own server by PID only. `scripts/seed.ts`
  fills a scratch DB (refuses `/data`); reseed rather than reuse a DB that
  specs have written thousands of lines into, or jsdom tests slow down.
- SSE: first connect passes `?after=<newest rendered id>`, reconnects use
  `Last-Event-ID`; replay and registration happen in one synchronous turn,
  so no gap. Over 200 missed: a `reload` event. Each stream renders "yours"
  against its own cookie, so tokens never leave the server.
- The stream cap and keepalive aren't tested: opening 200 streams races
  other spec files' streams, and a keepalive test waits 25 s. An env var to
  lower both in tests would make it cheap.
- `POST /colophons` with `Accept: application/json` answers 201 `{id, html,
  legend}` or 422 `{error, message}`; the plain form gets a 303 on success
  and a 422 page with the text kept on a rejection.
- Seal tests release their claims, so a reused local DB doesn't fill the pool.
- Client tests (`spec/client.test.ts`) run the served `scroll.js` and
  `app.js` in jsdom against the running app, with a fixed fake layout for
  the scroll; `window.colophonConfig.handoffMs` shortens the lantern handoff.
- Measured: 0 long tasks and 100% of frames within 60 fps scrolling 2,000
  lines at 1920 and 390; `/` is 60 kB gzipped at 2,000 lines.
