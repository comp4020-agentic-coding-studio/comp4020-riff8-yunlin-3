# TODO

The running to-do list for this repo: re-read it before each task, update it in
the same commit as the work.

## Now

- Docs pass: README on the look and the live behaviour; final checks

## Next

- [ ] P3 extras: print stylesheet (rollers, lanterns, fan and form dropped;
  the scroll as a clean page) --- already in `styles.css`, untested

## Done

- [x] P3 extras: fresh ink --- an arriving line looks wet and dries over
  ~8 s, so a live arrival reads as just written, not as a reload
- [x] P3 extras: seal press --- the seal stamps down as an entry lands, the
  way a collector's seal finishes a colophon
- [x] P3 extras: mist --- a slow, faint drift across the painting, so the
  mounted picture feels like weather rather than a flat image

- [x] P3 fan opening (item 9) (CSS in 72787aa, gate in 32519bb)

- [x] P2 ink-in typing (item 5) (32519bb)
- [x] P2 lantern launch (item 6) (32519bb), including the optional faint lantern for
  other people's arrivals

- [x] P1 ink palette + contrast and seal-distance tests (item 4) (72787aa)
- [x] P2 theme: mount, cloth, tokens (item 7) (72787aa)
- [x] P2 watercolour painting + header wash (item 8) (72787aa)

- [x] P0 SSE live append + `Last-Event-ID` reconnect + tests (item 1) (a9d4284)
- [x] P0 DB migration + seal/ink columns, tested on a populated database (a9d4284)
- [x] P0 ADR 0001 + README/CLAUDE.md consistency (item 3) (a9d4284)
- [x] P1 dictionary + English to Chinese chooser, atomic claims (item 2) (a9d4284)
- [x] P1 Chinese to English reveal + legend (item 2) (a9d4284, styled in
  the theme commit)

- [x] P0 `CLAUDE.md` working agreement, `TODO.md` (fe07cb6)

## Context

- The brief is the pod's crit 8 `prompt.md` (deleted in the last commit),
  aimed at crit 9 "All at once".
- Pod run: the harness pushes when the run stops and CI deploys; this run
  neither pushes nor deploys.
- Local checks: start the app with a scratch DB, e.g.
  `DB_PATH=/tmp/colophon-riff3/c.db PORT=8613 node src/server.ts`, then
  `APP_URL=http://localhost:8613 pnpm check`. Other pod runs share the
  machine, so 8080 may be taken.
- SSE: first connect passes `?after=<newest rendered id>`, reconnects use
  `Last-Event-ID`; replay and registration happen in one synchronous turn,
  so no gap. Over 200 missed: `reload` event. Each stream renders "yours"
  against its own cookie, so tokens never leave the server.
- The stream cap (200) and 25 s keepalive aren't tested: opening 200 streams
  races other spec files' streams, and a keepalive test would wait 25 s.
- Ink: a missing key means the default; an unknown key is refused
  (`?error=ink`, or 422 JSON for the script).
- `POST /colophons` with `Accept: application/json` answers 201 `{id, html,
  legend}` or 422 `{error, message}`; the plain form gets 303s as before.
- Seal tests release their claims so a reused local DB doesn't fill the pool.
- Kill scratch servers by PID only; other pod runs share the machine.
- Theme: the wall is plaster, the mount silk carries the brocade, sheets are
  paper with a gilt edge.
- Decided: the Wang Yi handscroll photo stays, smaller, as "the tradition
  this margin borrows from"; the watercolour is the mounted painting.
- Client tests (`spec/client.test.ts`) run the served `app.js` in jsdom
  against the running app with real POSTs and a fake EventSource;
  `window.colophonConfig.handoffMs` shortens the lantern handoff there.
- Own accepted ids are `reserved` until the lantern hands over, and live
  events are queued while a submit is in flight, so the echo never lands
  early or twice.
- Browser checks done: two independent agent-browser sessions (390x844
  writer, 1920x1080 watcher) saw the line arrive ~60 ms after the click; a
  server restart with a line written before the page reconnected was
  replayed via `Last-Event-ID` with no reload.
