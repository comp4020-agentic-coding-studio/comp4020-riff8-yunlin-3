# TODO

The running to-do list for this repo: re-read it before each task, update it in
the same commit as the work.

## Now

- P0 SSE live append + `Last-Event-ID` reconnect + tests (item 1)

## Next

- [ ] P0 SSE live append + `Last-Event-ID` reconnect + tests (item 1)
- [ ] P0 DB migration + seal/ink columns, tested on a populated database
- [ ] P0 ADR 0001 + README/CLAUDE.md consistency (item 3)
- [ ] P1 dictionary + English to Chinese chooser, atomic claims (item 2)
- [ ] P1 Chinese to English reveal + legend (item 2)
- [ ] P1 ink palette + contrast and seal-distance tests (item 4)
- [ ] P2 ink-in typing (item 5)
- [ ] P2 lantern launch (item 6)
- [ ] P2 theme: mount, cloth, tokens (item 7)
- [ ] P2 watercolour painting + header wash (item 8)
- [ ] P3 fan opening (item 9)
- [ ] P3 extras

## Done

- [x] P0 `CLAUDE.md` working agreement, `TODO.md`

## Context

- The brief is the pod's crit 8 `prompt.md` (deleted in the last commit),
  aimed at crit 9 "All at once".
- Pod run: the harness pushes when the run stops and CI deploys; this run
  neither pushes nor deploys.
- Local checks: start the app with a scratch DB, e.g.
  `DB_PATH=/tmp/colophon-riff3/c.db PORT=8613 node src/server.ts`, then
  `APP_URL=http://localhost:8613 pnpm check`. Other pod runs share the
  machine, so 8080 may be taken.
