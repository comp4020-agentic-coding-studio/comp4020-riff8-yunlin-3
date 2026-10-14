# Crit 10 riff: unroll Colophon into a real handscroll, as a team, in five hours

Written by pod 3 of yunlin's crit on 14 October 2026, for one unattended run.

Nobody will read your questions or answer them, so this file is the whole
brief. Run it start to finish in one go and work the full five hours (§1).
The riff block at the top of `CLAUDE.md` still governs:

- keep `main` deployable
- leave that block exactly as it is
- delete this file in your last commit

## 0. Ground rules for an unattended run

- **No one is there.** Never ask a question, and never end your turn
  waiting for a reply. Where you would ask, escalate (§5), act on the
  ruling and keep going.
- **Never end your turn while work is in flight.** If a worker is running,
  a milestone is unshipped, or the clock (§1) hasn't run out, keep working.
  Review what has come back, prepare the next merge, start the next loop
  iteration (§7), or poll the status files (§4).
- **Never write to the live app.** A colophon can't be edited or deleted,
  and a seal claim is real, so anything you post to
  `https://comp4020-riff8-yunlin-3.fly.dev` stays there for every future
  visitor. Every write, every test and every playtest runs against a local
  server or a local Docker container with a scratch `/data`. Against the
  live app you may only `GET`.
- **Colophon stays Colophon.** This is not a new app. Every rule below the
  line in `CLAUDE.md` still holds: no accounts, names, likes, replies,
  threads, presence or typing indicators; no edit or delete; escape every
  body; inks are palette keys; `--seal` means only "yours"; the core flow
  works with JavaScript off. A feature that breaks one of those rules is
  not a feature here. If a change genuinely needs a rule bent, the argument
  in `README.md` and the rule in `CLAUDE.md` change first, in the same
  commit, and the consultant (§5) signs off on it.
- **Never drop or rewrite existing colophons or seal claims.** Migrations
  stay idempotent and are tested against a database that already has rows.
- **`main` is always deployable.** Every milestone and every loop iteration
  ships green (§6). If the run is cut off at any moment, what's on `main`
  must be a working, coherent scroll.
- **Keep `spec/invariants.test.ts` green.** You may change or delete the
  agent's own spec tests where this brief changes the behaviour they encode
  (for example `layout.test.ts` once the layout moves, and the dictionary
  size bounds in `seal-dictionary.test.ts`). Never weaken a safety test:
  escaping, cookie safety, request limits, static-file traversal and seal
  claim atomicity keep every case they have today.
- **Don't touch `comp4020-final-yunlin`.** It's the original repo.

## 1. The goal, and the clock

**The goal.** Today the page is a watercolour painting on top, the Wang Yi
photograph in a small strip, a vertical list of colophons, and the writing
form at the very bottom, so a visitor has to scroll past everything to add
a line. After this run:

1. **The colophons are the scroll.** The visitors' own lines, each signed
   with its seal and written in its ink, are laid out as a visual
   handscroll that takes the place of the watercolour painting as the
   page's centrepiece. Reading Colophon means unrolling it.
2. **Writing is always within reach.** The text box, the ink swatches, the
   submit button and the link to change your seal live in a dock that sits
   outside the scroll, stays put while the scroll moves, and never needs a
   scroll to reach. On a phone too.
3. **It moves like silk.** Scrolling, by wheel, trackpad, touch, keyboard or
   a new arrival, is smooth, never janky, never yanked.
4. **There's a seal for almost anything you care about.** The seal
   dictionary grows from 142 entries to at least 800, and finding one by
   meaning stays quick and pleasant.

Then the team keeps going: a loop of test, find, fix and build (§7) that
makes the scroll more delightful and easier to use for as long as the
clock allows.

**The next brief.** Crit 10, "Fly by instruments"
(<https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/10-fly-by-instruments/>):
two people in separate Chrome profiles use the app from its URL alone,
while someone narrates from `flyctl logs` who did what. Fetch it and read
it in Phase 0. Colophon already tells people apart by the seal cookie and
already decides on the server what each may change (only your own seal
claim; nobody may change any colophon). What's missing is the **logs**:
T5 adds them. It's small, but without it the crit has nothing to narrate.

**What good looks like.** A visitor on a phone in portrait opens the URL.
They see the scroll, unrolled to the newest lines, with the dock at the
bottom of the screen. They swipe back through the scroll and it glides.
They tap the dock, type a line, pick an ink and press "Write it in"
without scrolling once; the line inks itself onto the end of the scroll,
and the seal presses. Someone on a laptop watching the same scroll sees it
arrive within a second, and the laptop's view doesn't jump if they were
reading somewhere else. They go to choose a seal, type "lighthouse" or
"grandmother" or "patience", and find one. Meanwhile, `flyctl logs` shows
two different seals, one writing a line and one claiming a seal, and never
a token. Everything still works with JavaScript off, at 1920x1080 and
390x844, with no horizontal page scroll (the scroll itself scrolls; the
page doesn't).

**The clock.**
1. As your first action, run `date` and write the start time to
   `.claude/team/board.md`.
2. The deadline is **start + 5 hours**.
3. At every milestone gate and every loop iteration, run `date` again and
   write the time remaining on the board.
4. If you're behind, cut from the bottom of §8's priority list, never from
   the top.
5. The improvement loop (§7) runs until **start + 4h35**. From then on,
   only close out (Phase 6).

Your token budget may end the run sooner than the clock. That's why every
milestone and every loop iteration ships.

## 2. The team

You are the **project lead**. You plan, write the shared contract, hand
out all the implementation, merge, judge and ship, and you are the only
one who commits to `main`.

**Every agent on this team, you included, runs Claude Opus 5.5
(`claude-opus-5-5`).** No Sonnet, no Haiku. If a spawn would fall back to
another model, pass `model: "opus"` explicitly.

| Agent | Effort | Owns (writes only these) | When |
|---|---|---|---|
| lead (you) | high; think hard at every gate | `main`, merges, `package.json` and the lockfile, `Dockerfile`, `.claude/team/*`, `TODO.md`, `memory/now.md`, removing `prompt.md` | always |
| `consultant` | xhigh | nothing (gives rulings) | Phase 1, then on call |
| `ui-dev` | high | `src/render.ts`, `public/app.js`, `public/fan.js`, `public/styles.css`, `public/*.svg` | M1 onwards |
| `scroll-dev` | high | `public/scroll.js`, `public/scroll.css` (new), and the scroll's markup contract in `contract.md` via the lead | M1 onwards |
| `lexicographer` | high | `src/dictionary.ts` and any new `src/dictionary/**` data files | M1 onwards |
| `server-dev` | high | `src/server.ts`, `src/db.ts`, `src/migrate.ts`, `src/live.ts`, `src/seal.ts`, `src/cookies.ts`, `src/log.ts` (new) | M1 onwards |
| `test-engineer` | high | `spec/**` except `spec/invariants.test.ts` and `spec/global-setup.ts` | every milestone |
| `docs-writer` | medium | `README.md`, `docs/**`, the harness rules below the line in `CLAUDE.md` | M2 onwards |
| `lexicon-checker` | high | nothing (writes findings) | every dictionary batch |
| `ux-tester` | high | nothing (writes findings and screenshots) | every gate and every loop |
| `a11y-tester` | high | nothing (writes findings) | every gate and every loop |
| `perf-tester` | high | nothing (writes findings and traces) | every gate and every loop |
| `reviewer` | high | nothing (writes findings) | every gate |
| `final-reviewer` | xhigh | nothing (go / no-go) | before M2 ships and before close-out |

The four **testers** (`lexicon-checker`, `ux-tester`, `a11y-tester`,
`perf-tester`) are what makes this a team and not four people typing. They
never fix what they find; they find it, prove it with a command, a
screenshot or a number, and hand it back. Their findings drive the loop.

**How to spawn them:**
1. In Phase 0, write the agent definitions in Appendix A to
   `.claude/agents/`. That folder is gitignored and local to this run, and
   each file sets the role's model (`claude-opus-5-5`) and effort.
2. If those types then appear among the subagent types you can spawn, use
   them.
3. If they don't, spawn `general-purpose` with `model: "opus"`. Paste the
   role's definition body and its effort line at the top of the task card.

**Limits:**
- At most **four builders** (`ui-dev`, `scroll-dev`, `lexicographer`,
  `server-dev`, `test-engineer`, `docs-writer`) run at once. Testers and
  reviewers don't count against that, but run at most three of them at
  once.
- Workers can't spawn agents. Only you do.
- If the Agent tool isn't available at all, don't stall. Do every role
  yourself, in the same worktrees and the same order, and still run every
  tester's checklist yourself before each ship. Reason escalations through
  in writing in `.claude/team/decisions.md`.

## 3. Worktree layout

```
comp4020-riff8-yunlin-3/                 main checkout: lead only; integration happens here
├── .claude/                             gitignored: none of this is ever committed
│   ├── agents/*.md                      Appendix A
│   ├── team/
│   │   ├── board.md                     start time, deadline, task table (id, owner, agent id, branch, status, tip SHA), loop log
│   │   ├── contract.md                  the shared contract (Phase 2), the source of truth
│   │   ├── decisions.md                 every ruling, by whom, and why
│   │   ├── backlog.md                   the loop's ranked list of findings and ideas (§7)
│   │   ├── status/<role>.md             each worker's heartbeat (§4)
│   │   ├── findings/<role>.md           tester and reviewer output
│   │   └── shots/                       screenshots and traces, named <iteration>-<role>-<what>.png
│   └── worktrees/
│       ├── ui/                          branch team/ui        port 8301
│       ├── scroll/                      branch team/scroll    port 8302
│       ├── lexicon/                     branch team/lexicon   port 8303
│       ├── server/                      branch team/server    port 8304
│       ├── tests/                       branch team/tests     port 8305
│       └── docs/                        branch team/docs      (no server)
```

**Creating them.** Create each worktree when its first task starts, from
the current tip of `main`, so later work builds on shipped work:

```sh
git worktree add ".claude/worktrees/<r>" -b "team/<r>" main
(cd ".claude/worktrees/<r>" && pnpm install --frozen-lockfile)
```

Before each new task, the worker brings its branch up to date with
`git merge main` inside its worktree. If `pnpm` isn't on `PATH`, prefix
every command with `mise exec --`.

**Ports.** Each worker runs its own server with its own scratch database:

```sh
DB_PATH=/tmp/colophon-<role>/c.db PORT=<port> node src/server.ts &
APP_URL=http://127.0.0.1:<port> pnpm check
```

Use `127.0.0.1`, never `localhost`. The lead uses port 8300. Testers run
against the lead's integration server on 8300, or the Docker container on
8310 (§6). Kill your own servers by PID only; other runs share the
machine. The server reads `README.md` and `docs/adr/` once at startup, so
restart it after editing either.

**Paths.** Gitignored files don't exist inside a worktree. Every path to
`.claude/team/` that you give a worker must be absolute, pointing into the
main checkout.

**Branches.** All branches live in one repository, so any worktree can
`git merge team/<other>` without pushing.

**`vitest` and `tsc`.** Both are anchored to the repo root, so the nested
worktrees must never be picked up. Check that in Phase 0 and keep it so.

## 4. How the team communicates

There are four channels. The lead is the only writer of `board.md`,
`contract.md`, `decisions.md` and `backlog.md`.

1. **Task card (lead to worker).** This is the Agent prompt. Use this
   template:

   ```
   ROLE: <role>. EFFORT: <level>. MODEL: claude-opus-5-5. MILESTONE: <M# or L#>.
   WORKTREE: <absolute path>. BRANCH: team/<r>. PORT: <port>.
   GOAL: <one paragraph from §8, or the backlog items for this iteration>
   YOU OWN: <paths>. Touch nothing else; to change anything outside, escalate.
   CONTRACT: <paste the sections of contract.md you need>; full text at <absolute path>.
   ACCEPTANCE: <checklist: each item something you can run, measure or read>
   TIMEBOX: <minutes>. If you'll overrun, report what's done and what's left.
   STATUS FILE: <absolute path to .claude/team/status/<role>.md>
   ESCALATION: §5 of <absolute path to prompt.md>.
   REPORT: end your turn with the report format below, never any other way.
   ```

2. **Status file (worker to lead, throughout).** The worker overwrites
   `.claude/team/status/<role>.md` at every step:

   ```
   STATE: STARTED | WORKING | BLOCKED | DONE | FAILED
   STEP: <what you're on>
   BRANCH TIP: <sha>
   CHECK: <last `pnpm check` result, one line>
   QUESTION: <only if BLOCKED: the question, 2 or 3 options, your recommendation>
   ```

   If the harness hands control back to you while workers run, poll these
   files, along with `git -C <worktree> log --oneline -3`. Don't idle.

3. **Report (worker to lead, at the end of a turn).** It opens with
   `DONE`, `BLOCKED` or `FAILED`, then gives:
   - the branch and tip SHA
   - what changed, file by file, one line each
   - the exact checks run, with their last lines of output
   - what's left, if the timebox ran out

   A tester's report instead gives its findings, each as `BLOCKING`,
   `MAJOR` or `MINOR`, with where (URL and viewport, or `file:line`), the
   evidence (a command and its output, a screenshot path or a number) and
   one line on what a fix would be.

4. **Resume (lead to worker).** Use `SendMessage`, addressed to the agent
   id recorded on the board. It carries a ruling, a fix request, findings
   or the next task card. The worker keeps its context. Resume the same
   worker for the same files across milestones and loop iterations rather
   than starting a new one.

**Commits.** Workers commit small and often on their own branch, one idea
per commit, with `pnpm check` green first. Messages are prefixed with the
role: `ui: `, `scroll: `, `seals: `, `server: `, `spec: ` or `docs: `. The
lead merges with `--no-ff`, so the history shows the team, and updates
`TODO.md` in the merge's follow-up commit.

## 5. Escalation: when anyone is stuck

**A worker escalates when any of these happen:**
- the same check still fails after two honest fix attempts
- the contract or the task card doesn't settle a choice, and more than one
  answer is plausible
- the change would break a rule below the line in `CLAUDE.md`, or
  `spec/invariants.test.ts`
- they need to edit a file they don't own
- the timebox is about to run out on a must-have

**The worker's procedure:**
1. Set the status file to `BLOCKED`, with the question, the options and
   their recommendation.
2. End the turn with a `BLOCKED` report.

**The lead's procedure:**
- If the answer follows plainly from §8, the contract or this file, answer
  it yourself.
- Otherwise, ask `consultant`. Spawn it once in Phase 1, then resume it
  with `SendMessage` so its rulings stay consistent. Send it the question,
  the options, the file paths it needs, the time remaining, and a request
  for a ruling of 10 lines or fewer: decision, reason, risk.
- Record the ruling in `decisions.md`, then resume the worker with it.

**The lead also consults when:**
- two workers' reports conflict
- an integrated build fails and no single owner clearly owns the failure
- a tester and an author disagree about whether something is a defect
- a milestone is going to miss its time
- you're choosing which new feature a loop iteration builds (§7)
- you've been stuck yourself for two attempts

**It's bounded.** After two consultant rounds on one question, take the
option that keeps `main` green and the scroll coherent and costs the least
time. Record it and move on. Rulings are binding unless one would break an
item in §10.

## 6. The plan

The times below are targets, measured from the start time on the board.

**Phase 0: Orient and set up (lead, 0:00 to 0:20).**
- Read:
  - the riff block in `CLAUDE.md`, and everything below the line
  - `README.md`, `TODO.md`, `memory/now.md`, `docs/adr/0001-seal-claims.md`
  - everything in `src/`, `public/app.js`, `public/styles.css` and `spec/`
  - `fly.toml`, the `Dockerfile` and `.github/workflows/checks.yml`
- Fetch the crit 10 brief (§1).
- Confirm `pnpm check` is green on port 8300 before any change.
- Confirm how `src/server.ts` serves files from `public/`, so new files
  like `public/scroll.js` are served and `spec/static-files.test.ts` stays
  red-proof. No new runtime dependency is needed for any of this; add one
  only through the consultant.
- Open `agent-browser` once against port 8300 and screenshot `/` at
  1920x1080 and 390x844, so everyone has a "before".
- Write the agent definitions (Appendix A), `board.md` and `backlog.md`.

**Phase 1: Decide (`consultant`, 0:20 to 0:35). Run it alongside
Phase 2.** Ask it for a short memo on the three design questions the pod
left open:
- **The scroll's shape** (T1): the direction it unrolls and reads, what one
  colophon looks like on it, where the newest line sits, and how it
  behaves at 390 px wide.
- **The dock's shape** (T2): bottom bar or side panel per viewport, what
  it shows collapsed and expanded, and how it avoids covering the line
  the visitor is reading.
- **The log line** (T5): what each event logs, and how a visitor is named
  in a log without the token ever appearing.

Challenge it once if it's weak. Accept it into `decisions.md`.

**Phase 2: Contract (lead, by 0:35).**
- Write `contract.md`: the scroll's markup (elements, classes, `data-`
  attributes, ARIA), which `ui-dev` renders and `scroll-dev` styles and
  drives; the dock's markup; the dictionary's data shape and search API;
  the log line format; file ownership.
- Workers build against it. If it changes, announce the change to every
  affected worker with `SendMessage`.
- Then cut the worktrees.

**Milestones.** Each milestone, and each loop iteration in §7, ends with
the same gate:
1. Integrate in the main checkout, on `team/integration` from `main`,
   merging each team branch `--no-ff`.
2. `pnpm check` on port 8300, gated on its own exit code.
3. Build and run the Docker image the way CI does, with a scratch `/data`,
   on port 8310, and run `APP_URL=http://127.0.0.1:8310 pnpm check`
   against it.
4. `reviewer` and the testers run in parallel against the integration
   build (which testers: see each milestone).
5. Fix every `BLOCKING` finding: send it to its owner, re-merge and
   recheck only what changed. `MAJOR` findings go to the top of
   `backlog.md`; `MINOR` ones go into it, ranked.
6. Fast-forward `main` to `team/integration` and `git push`. If CI runs on
   the push, watch it (`gh run watch`) through deploy, then do the live
   check. If the push is refused or the harness owns pushing, keep the
   commit on local `main`, note it on the board, and carry on.
7. Update `TODO.md` (Now, Next, Done with the hash, Context) and note the
   time on the board.

Never push red to `main`.

**M1: The scroll is reachable and searchable, live by 1:30.**
- Builders: `ui-dev` (T2 the dock), `lexicographer` (T4, first batch to at
  least 450 entries), `server-dev` (T5 the logs), `test-engineer`.
- `scroll-dev` starts T3 (smooth scrolling) on the current layout's
  scroller and page, and studies T1's design.
- Testers at the gate: `ux-tester`, `a11y-tester`, `lexicon-checker`.

**M2: The colophons are the scroll, live by 2:45.**
- Builders: `ui-dev` and `scroll-dev` together on T1, then T3 again on the
  new scroll; `lexicographer` (T4, to at least 800 entries, plus browsing);
  `test-engineer`; `docs-writer` joins for T6.
- Testers at the gate: all four. `final-reviewer` gives a go / no-go
  before this milestone ships.

**The loop (§7), from M2 until 4:35.**

**Phase 6: Close out (lead, from 4:35, or earlier if the token budget is
running low).**
1. `final-reviewer` does a go / no-go on what's on `main`. Fix any
   `BLOCKING` item it raises, or revert the change that caused it.
2. Make `README.md`, `CLAUDE.md`, `docs/adr/` and `spec/` agree with what
   actually shipped (the working agreement requires it).
3. Rewrite `memory/now.md` as a hand-off in the agent's existing style:
   what this run built, the loop iterations and what each shipped, what
   the testers still flag, and what the next run should look at first.
   `TODO.md` stays, with every unfinished item marked not done.
4. Remove the worktrees, delete the merged `team/*` branches locally and
   on the remote, and stop every server and container you started.
5. Make the **last commit**: the hand-off updates, plus `git rm prompt.md`.
   Push it, watch its run go green through deploy if CI runs, and repeat
   the live check.

**The live check at every ship (read-only).**
- `curl -s -o /dev/null -w '%{http_code}'` on
  `https://comp4020-riff8-yunlin-3.fly.dev/`, `/readme/` and `/seal` must
  each return 200.
- `/` contains the scroll's markup and the dock's form.
- `agent-browser` opens `/` at 1920x1080 and 390x844 and screenshots it,
  and you read the screenshots. No writes, no seal claims.

## 7. The improvement loop

Once M2 is live, the run doesn't stop: it iterates. Each pass makes the
scroll better for the people using it, proven by a tester, not by the
author's say-so.

**One iteration (aim for 30 to 40 minutes, `L1`, `L2`, ...):**
1. **Look.** `ux-tester`, `a11y-tester` and `perf-tester` each sweep the
   integration build with the journeys in Appendix B, and write findings.
   Rotate a fresh focus each iteration (for example: first-time phone
   visitor; returning visitor with a chosen seal; two windows watching
   each other; keyboard only; slow 3G throttled; JavaScript off).
2. **Rank.** Merge the findings into `backlog.md`. Rank: `BLOCKING` bugs,
   then `MAJOR` UX friction, then one new feature from the idea pool
   below, then `MINOR` polish. Ask `consultant` to sanity-check the pick
   if a new feature is in it.
3. **Pick.** Take the top two to four items that fit in the iteration and
   don't fight over the same files. Write the iteration on the board: its
   number, its items, their owners, the time.
4. **Build.** Task cards to the owners. Every bug fix comes with a spec
   test or a new harness rule in `CLAUDE.md`, per the working agreement.
5. **Prove.** The tester who raised each item re-runs its journey and
   confirms it fixed, with evidence. Not fixed means it goes back, once;
   after that it's cut back to the backlog.
6. **Ship** through the gate (§6), then log the iteration on the board and
   in `TODO.md`: what shipped, what each tester now says, time remaining.

**Stop starting new iterations at 4:35.** If an iteration would run past
it, ship what's green and cut the rest back to the backlog.

**The idea pool.** New features must fit the rules below the line in
`CLAUDE.md` (no social features, no edit or delete, nothing red but
"yours"). Good candidates, in roughly this order; the testers' findings
may well suggest better ones:
- a minimap or overview strip of the whole scroll, with "you are here",
  that jumps you there when clicked
- "go to my lines": jump between the colophons written with your own seal
- filter or highlight the scroll by seal glyph, by clicking a seal in the
  legend
- a permalink to a single colophon (`/#c-<id>`) that unrolls the scroll to
  it and gives it a brief, motion-safe glow
- dictionary browsing by theme (studio, landscape, virtue, season, kin,
  craft), with the theme shown on the seal page
- a cairn at the end of the scroll whose height tracks the colophon count
- a time-of-day tint on the silk, computed in the browser
- a "new lines" pill when lines arrive while you're reading elsewhere,
  instead of moving your view
- keyboard shortcuts (Home and End unroll to the start and end; `/`
  focuses the dock), listed in a small help line
- printing the whole scroll from the print stylesheet

## 8. Tasks

**Priority.** Cut from the bottom.

- **Must-have, M1:** T2, T4 (first batch), T5.
- **Should-have, M2:** T1, T3, T4 (to 800), T6.
- **The loop:** §7, from M2 until 4:35.

**T1. The visual scroll (`ui-dev` renders it, `scroll-dev` styles and
drives it).**
- The colophons themselves become the handscroll, and it **replaces the
  watercolour painting** at the top of the page as the centrepiece. The
  "Spruce, granite and a path" figure and its caption go. The header wash
  and the small scenery ornaments may stay if they still help.
- The Wang Yi photograph may stay as a small, credited "the tradition
  this borrows from" note below the scroll, or go; the consultant
  decides. It must not compete with the visitors' scroll.
- It reads as a mounted handscroll: silk mount, rollers at each end, the
  paper ground, each colophon laid onto it as a written passage in its own
  ink with its seal impressed beside it, and a sense of continuous length.
  Traditional handscrolls unroll right to left, with colophons added at
  the end; the consultant decides whether to honour that or run left to
  right, and the README says why. English text stays horizontal and
  readable.
- It opens unrolled to the **newest** lines, because that's where a new
  line will go.
- The markup underneath stays the semantic `<ol class="colophon-list">` of
  `<li class="colophon ...">` entries (or the contract's equivalent), so
  screen readers, no-JS visitors, `public/app.js`'s live append and the
  existing tests all still work. The scroll is CSS on top of a real list,
  not a canvas and not a picture.
- With JavaScript off it is still a scrollable, readable scroll (native
  `overflow` scrolling), and the empty state still says no one has written
  yet.
- Live arrivals land at the scroll's newest end with the existing ink-in,
  seal press and fresh ink, and never move the view of someone reading
  elsewhere (see T3).
- Every body still goes through `escapeHtml`; long unbroken text can't
  blow the layout out (keep `layout.test.ts`'s guarantee in whatever form
  the new CSS takes).

**Acceptance:**
- At 1920x1080 and 390x844: no horizontal page scroll; the scroll is the
  first thing you see; text in every ink keeps 4.5:1 on every surface it
  sits on (extend `spec/ink-palette.test.ts` if the paper changes).
- `spec/no-js.test.ts`, `spec/live.test.ts` and `spec/client.test.ts` pass,
  updated only where the markup contract changed.
- A test that `/` no longer inlines the watercolour painting as the
  centrepiece, and does render the colophon list inside the scroll.

**T2. The dock (`ui-dev`).**
- The write form (text box with its count, the ink swatches, "Write it
  in", and the line saying which seal you sign with and the link to change
  it) moves out of the scroll's flow into a dock that stays fixed on
  screen. A visitor never scrolls to reach it, on any viewport.
- With JavaScript off it is still a plain HTML form posting to
  `/colophons`, and it's still fixed (CSS does the fixing, not script).
- On a phone it's compact until focused, respects
  `env(safe-area-inset-bottom)`, and stays usable with the on-screen
  keyboard open (use `visualViewport` as an enhancement if needed).
- It never permanently covers content: the scroll leaves room for it, and
  the newest colophon is fully visible above or beside it.
- Error messages from a rejected submission (too long, unknown ink) show
  in the dock, next to the text, with the text still there.
- The lantern still launches only on a 2xx, from the dock.

**Acceptance:**
- At 390x844 and 1920x1080: the textarea, every swatch and the submit
  button are visible on load without scrolling, at least 44x44 px to tap,
  and reachable by Tab with a visible focus state.
- A spec test that the form is outside the colophon list and carries the
  fixed-dock class the contract names.

**T3. Smooth scrolling (`scroll-dev`).**
- Wheel and trackpad scroll the handscroll naturally: a vertical wheel
  gesture over the scroll moves it along its length (as an enhancement,
  eased, with no fight against native trackpad horizontal scrolling).
- Touch uses native momentum. Never hijack it.
- Keyboard: the scroll is focusable; arrow keys, Page Up and Down, and
  Home and End move it smoothly.
- Jumps (to newest, to a permalink, from the minimap) use smooth scrolling,
  and are instant under `prefers-reduced-motion`.
- New arrivals: if the viewer is already at the newest end, the scroll
  glides to keep the new line in view; if they're reading elsewhere, it
  doesn't move them.
- No jank: scroll listeners are passive and do their work in
  `requestAnimationFrame`; decorative animation (mist, fresh ink, fan,
  lanterns) uses only `transform` and `opacity`; long scrolls use
  `content-visibility: auto` or similar so a scroll with thousands of
  lines stays fast.

**Acceptance (measured by `perf-tester`):**
- Seed a local scratch database with at least 2,000 colophons (a script
  under `scripts/`, never against live). Scroll end to end in
  `agent-browser` with a performance trace: no long task over 50 ms during
  the scroll, and frame times overwhelmingly within a 60 fps budget.
  Record the numbers in the findings file.
- Reduced motion: no smooth scrolling, no eased wheel, everything still
  reachable.

**T4. A much larger seal dictionary (`lexicographer`, checked by
`lexicon-checker`).**
- Grow `src/dictionary.ts` from 142 entries to **at least 800**, aiming
  for 1,000, in batches of about 150. Keep the shape (glyph, pinyin with
  tone marks, a short English gloss, search words) and the rules at the
  top of the file: single characters, traditional forms, the kind of word
  a collector or scholar might carve on a seal, nothing outside the list
  can become a seal, and nothing is transliterated.
- Cover what people actually care about: nature and seasons, places and
  weather, virtues and states of mind, family and friendship, crafts and
  arts, animals and plants, times of day, study and work, hope and loss.
  Every entry gets several search words, including everyday synonyms and
  both British and American spellings, so a visitor's word finds a seal.
- No offensive, political, or misleading glyphs. When unsure of a reading
  or a gloss, leave the character out.
- If the file grows unwieldy, move the data into `src/dictionary/*.ts`
  modules and keep `src/dictionary.ts` as the API.
- Searching stays dictionary-only, but gets kinder: case-insensitive,
  simple plural and "-ing"/"-ed" folding, and results ranked by how well
  they match. The seal page shows the results without becoming a wall:
  paginate or group them, and say how many matched.
- The twelve legacy hash glyphs stay exactly as they are (`src/seal.ts`).

**`lexicon-checker`**, for each batch: verifies every new row's glyph is a
single traditional character, its pinyin and tone are right, its gloss is
accurate and its search words fit, with no duplicates of glyph across the
whole file. It writes `BLOCKING` for any wrong reading or gloss; the
lexicographer fixes or removes the row before the batch merges.

**Acceptance:**
- `spec/seal-dictionary.test.ts`'s size bounds move to at least 800 and at
  most 2,000; its other checks still pass for every row.
- New tests: search folds plurals and case; a sample of everyday words
  ("lighthouse" may not have a seal; pick words the dictionary does cover)
  each find at least one seal; search time over the whole dictionary stays
  under 5 ms per query.
- `TODO.md`'s existing note that a Chinese reader should review the
  dictionary stays, now covering the new rows too.

**T5. Who did what, in the logs (`server-dev`). This is crit 10's brief.**
- Add `src/log.ts`: one structured line per event to stdout, so
  `flyctl logs -a comp4020-riff8-yunlin-3` shows it. At least:
  - a colophon written: the visitor's seal glyph, the colophon's id, its
    ink and its length
  - a submission rejected: the visitor's seal glyph and why
  - a seal claimed, refused because it's taken, or given up: the glyph
  - a live stream opened and closed, with the count of open streams
- Name a visitor by their seal glyph plus a short, stable, non-reversible
  tag derived from the token on the server (so two hash-seal visitors
  sharing a glyph can still be told apart). **Never log the token itself,
  the cookie header or the request body.**
- Server-side checks stay as they are: only you can claim or give up your
  own seal; nobody can change a colophon.
- `docs-writer` records the identity and logging decision as
  `docs/adr/0002-who-did-what.md`: context, decision, at least two
  alternatives with their strongest case, costs, and how it's checked.

**Acceptance:**
- A spec test that captures the server's output (or calls `src/log.ts`
  directly), writes a colophon and claims a seal, and finds both events
  with the right glyph, and no token, anywhere in the output.

**T6. Record (`docs-writer`).**
- Update `README.md` in the agent's voice: how the scroll now looks and
  behaves, the dock, the bigger dictionary, the logs. Keep the headings
  `spec/invariants.test.ts` reads, in order.
- Update the harness below the line in `CLAUDE.md` where the layout
  changed (the "Stack and layout" list, design tokens if any were added).
  Add a rule for each real bug the testers found. Never touch the riff
  block.
- The README, `CLAUDE.md`, the ADRs and `spec/` agree.

## 9. Things that will go wrong, and the answer

- **CI is red but it's green locally.** CI runs the Docker image on a
  fresh `/data`. Reproduce with step 3 of the gate.
- **The lockfile is out of date.** CI installs frozen. Only the lead
  changes dependencies, then commits `pnpm-lock.yaml`.
- **`vitest` hangs.** A stream or socket is still open. Close everything
  in `afterEach`.
- **The README check fails after a docs edit.** The server caches
  `README.md` at startup. Restart it.
- **The dock covers the newest line on a phone.** The scroll needs bottom
  padding equal to the dock's height, including the safe area.
- **Live append breaks after the markup change.** `public/app.js` finds
  the list by the contract's selector. Update the contract, then both
  sides, then `spec/client.test.ts`.
- **Wheel scrolling fights the trackpad.** Only map vertical wheel deltas
  when `deltaX` is near zero, and never call `preventDefault` on a touch.
- **The dictionary has a doubtful row.** Remove it. A smaller, correct
  dictionary beats a larger, wrong one.
- **The deploy or Fly fails for reasons outside the repo.** Don't loop on
  it. Confirm the code is green locally against the Docker image, write the
  failure into `memory/now.md`, and carry on with the next item so it's
  ready to ship.

## 10. Definition of done

At the deadline, or earlier if the token budget is running out, all of
these are true and checked, not assumed:

- [ ] The colophons are a visual handscroll that has replaced the
  watercolour painting as the page's centrepiece, at both viewports, and
  still a readable list with JavaScript off.
- [ ] The dock: writing a line needs no scrolling at 390x844 or 1920x1080,
  and works with JavaScript off.
- [ ] Scrolling is smooth by `perf-tester`'s numbers, and instant under
  reduced motion.
- [ ] The dictionary has at least 800 entries, every batch passed
  `lexicon-checker`, and search finds seals for everyday words.
- [ ] `flyctl logs` would tell two visitors apart by seal, with no token
  logged; ADR 0002 records it, with a test.
- [ ] At least two loop iterations shipped, each logged on the board and
  in `TODO.md` with tester evidence.
- [ ] `spec/invariants.test.ts` is green. `/readme/` serves the updated
  README. README, `CLAUDE.md`, ADRs and `spec/` agree.
- [ ] `main` is green and deployable; the live check passes, or the reason
  it can't is in `memory/now.md`.
- [ ] `memory/now.md` is a fresh hand-off and `TODO.md` is accurate. The
  `CLAUDE.md` riff block is untouched. The worktrees and `team/*` branches
  are gone.
- [ ] The last commit deletes `prompt.md`.

When the only items left are blocked outside the repo, record them in
`memory/now.md` and stop.

## Appendix A: agent definitions

Write each of these to `.claude/agents/<name>.md` in Phase 0. Every one
runs on `claude-opus-5-5`.

```markdown
---
name: consultant
description: Colophon team's senior engineer and designer. Makes the design decisions and rules on escalations. Read-only.
model: claude-opus-5-5
effort: xhigh
---
You are the senior engineer and designer the team escalates to. You write no
code and commit nothing. Read what you're pointed at and return a ruling:
decision, reason, risk, in 10 lines or fewer unless asked for a memo. Judge
against README.md's "what good means here" and the rules below the line in
CLAUDE.md: Colophon is small, quiet and finished, not a platform. Prefer the
option that keeps main green and the scroll coherent and costs the least of
the time remaining. Be decisive. Nobody can answer a question back.
```

```markdown
---
name: ui-dev
description: Colophon team UI engineer. Owns src/render.ts and public/app.js, fan.js, styles.css, *.svg: page markup, the dock, live append.
model: claude-opus-5-5
effort: high
---
You are the UI engineer. The lead's task card is your whole brief. Work only
in the worktree it names and write only the paths it says you own. Every
visitor string goes through escapeHtml; user text reaches the DOM only via
textContent. The core flow works with JavaScript off. Every animation
respects prefers-reduced-motion, every control has a keyboard path and a
visible focus state, text keeps 4.5:1. Screenshot at 1920x1080 and 390x844
with agent-browser after any visual change and read the screenshots. Commit
small with a "ui: " prefix. Escalate per prompt.md §5. End every turn with a
DONE, BLOCKED or FAILED report. You cannot spawn agents.
```

```markdown
---
name: scroll-dev
description: Colophon team scroll engineer. Owns public/scroll.js and public/scroll.css: the handscroll's look and smooth scrolling.
model: claude-opus-5-5
effort: high
---
You are the scroll engineer. You make the colophon list read as a mounted
handscroll and move like silk. Style and drive the markup the contract
names; never change it yourself (escalate instead). Native scrolling first,
enhancement on top: passive listeners, work in requestAnimationFrame, only
transform and opacity animate, never hijack touch, instant under
prefers-reduced-motion. Measure, don't guess. Screenshot at 1920x1080 and
390x844 after each change. Commit with a "scroll: " prefix. Escalate per
prompt.md §5. End every turn with a DONE, BLOCKED or FAILED report. You
cannot spawn agents.
```

```markdown
---
name: lexicographer
description: Colophon team lexicographer. Owns src/dictionary.ts and src/dictionary/**: grows the seal dictionary and its search.
model: claude-opus-5-5
effort: high
---
You grow the seal dictionary in batches of about 150 rows. Every row is one
traditional character a collector or scholar might carve on a seal, with
correct tone-marked pinyin, an accurate short gloss, and several everyday
English search words. When unsure of any part of a row, leave the character
out. Never add offensive or political glyphs, never transliterate, never
change the twelve legacy hash glyphs. Keep search dictionary-only. Commit
each batch with a "seals: " prefix, then hand it to lexicon-checker via the
lead. Escalate per prompt.md §5. End every turn with a DONE, BLOCKED or
FAILED report. You cannot spawn agents.
```

```markdown
---
name: server-dev
description: Colophon team server engineer. Owns server.ts, db.ts, migrate.ts, live.ts, seal.ts, cookies.ts and log.ts.
model: claude-opus-5-5
effort: high
---
You are the server engineer. The lead's task card is your whole brief. Work
only in your worktree and owned paths. Validate at the boundary, never crash
on bad input, never drop or rewrite existing rows, keep migrations
idempotent. Log who did what by seal glyph and a non-reversible tag; never
log a token, a cookie header or a request body. Commit with a "server: "
prefix. Escalate per prompt.md §5. End every turn with a DONE, BLOCKED or
FAILED report. You cannot spawn agents.
```

```markdown
---
name: test-engineer
description: Colophon team test engineer. Owns spec/** except invariants.test.ts and global-setup.ts.
model: claude-opus-5-5
effort: high
---
You are the test engineer. Specs run against the running app over HTTP (and
jsdom for the client), share one server, close every stream, release every
seal claim they make, and must never be flaky: report a flaky test as a
failure. Never weaken a safety test; change a behaviour test only where the
brief changed the behaviour, and say which line of prompt.md changed it.
Never edit spec/invariants.test.ts. Commit with a "spec: " prefix. Escalate
per prompt.md §5. End every turn with a DONE, BLOCKED or FAILED report. You
cannot spawn agents.
```

```markdown
---
name: docs-writer
description: Colophon team writer. Owns README.md, docs/**, and the harness rules below the line in CLAUDE.md. Writes ADR 0002.
model: claude-opus-5-5
effort: medium
---
You write the README, the ADRs and the harness rules, in the agent's
existing voice. Write ADRs from the consultant's memo, with the strongest
case for every alternative. Cite only sources you fetched and read. Keep the
README headings invariants.test.ts reads, in order. Never touch the riff
block at the top of CLAUDE.md. A claim must hold in README, CLAUDE.md, the
ADRs and spec/ alike. Commit with a "docs: " prefix. End every turn with a
DONE, BLOCKED or FAILED report. You cannot spawn agents.
```

```markdown
---
name: lexicon-checker
description: Colophon team dictionary tester. Verifies every new dictionary row. Read-only.
model: claude-opus-5-5
effort: high
---
You check the seal dictionary batch you're pointed at, row by row: one
traditional character; pinyin and tone correct; gloss accurate; search words
fit and would be typed by an ordinary English speaker; no glyph duplicated
anywhere in the file; nothing offensive, political or misleading. You change
nothing. Write each problem to your findings file as BLOCKING (wrong) or
MINOR (could be better), with the row and a one-line fix. Say how many rows
you checked. End with a DONE report.
```

```markdown
---
name: ux-tester
description: Colophon team UX tester. Walks real user journeys in a real browser at desktop and phone sizes. Read-only.
model: claude-opus-5-5
effort: high
---
You use the app the way a stranger would, in agent-browser, against the
local integration build or Docker container, never the live site for
anything but reading. Walk the journeys in prompt.md Appendix B at 1920x1080
and 390x844, screenshot each step into the shots folder, and read every
screenshot. Report friction as well as bugs: anything confusing, hidden,
hard to tap, slow, jumpy or ugly. Each finding is BLOCKING, MAJOR or MINOR,
with the viewport, the steps, the screenshot path and a one-line fix. Never
claim a check you didn't do. End with a DONE report.
```

```markdown
---
name: a11y-tester
description: Colophon team accessibility tester. Keyboard, screen-reader semantics, contrast, reduced motion, no-JS. Read-only.
model: claude-opus-5-5
effort: high
---
You test that everyone can read and write on the scroll. Using agent-browser
and the served HTML: complete the write journey with the keyboard alone and
note every focus stop; check landmarks, headings, labels, live-region
announcements for new lines and errors, and that decorative art is
aria-hidden; check 4.5:1 contrast for every ink on every surface; check
prefers-reduced-motion removes smooth scrolling and animation; check the
read and write journeys with JavaScript disabled. Findings are BLOCKING,
MAJOR or MINOR with evidence. End with a DONE report.
```

```markdown
---
name: perf-tester
description: Colophon team performance tester. Measures scroll smoothness, long tasks and load on a seeded local database. Read-only.
model: claude-opus-5-5
effort: high
---
You measure, never guess. Against a local server seeded with at least 2,000
colophons on a scratch database, use agent-browser to scroll the handscroll
end to end by wheel, keyboard and a programmatic smooth jump, recording
frame times (requestAnimationFrame deltas) and long tasks
(PerformanceObserver). Also time first load and the seal search. Report the
numbers, the method and a verdict against prompt.md T3's targets. Findings
are BLOCKING, MAJOR or MINOR. End with a DONE report.
```

```markdown
---
name: reviewer
description: Colophon team code reviewer. Reviews each gate's integration diff. Read-only.
model: claude-opus-5-5
effort: high
---
You review the integration diff for the current gate. You change no code.
Check it against contract.md and every rule below the line in CLAUDE.md.
Look hardest at unescaped visitor text, visitor input reaching a style
attribute, tokens in logs or on the wire, migrations that could touch
existing rows, static-file serving, listeners that leak, and anything that
would break the no-JS flow. Write each finding as BLOCKING or MINOR with
file:line and a one-line fix. Report only real defects. End with a DONE
report.
```

```markdown
---
name: final-reviewer
description: Colophon team go/no-go before M2 ships and before close-out. Fresh context, read-only.
model: claude-opus-5-5
effort: xhigh
---
You are the last review before a ship. Read the integration diff, README.md,
the ADRs, and every tester's latest findings, then look at the screenshots.
Answer: does this ship; is it still Colophon (small, quiet, anonymous,
permanent); is the scroll beautiful and easy to read and write on at both
sizes; does the bigger dictionary hold up; could the crit 10 narrator tell
two visitors apart from the logs; what would a sceptical crit attack first.
Give GO or NO-GO first, then at most 15 lines. You change nothing.
```

## Appendix B: tester journeys

Run these against the local build, at 1920x1080 and 390x844. Seed the
scratch database with a realistic mix first (some short lines, some at
320 characters, one unbroken 320-character string, all five inks, chosen
and unchosen seals).

1. **First visit, phone.** Open `/`. Is the scroll the first thing seen,
   unrolled to the newest lines? Is the dock visible? Write a line without
   scrolling. Does it ink in at the end of the scroll and press its seal?
2. **Two windows.** Window A at the newest end, window B reading near the
   start. Write from A. Does B receive it within a second without being
   moved? Does A keep the new line in view?
3. **Choose a seal.** From the dock, go to choose a seal. Search five
   everyday words. Are results quick, well ranked, not overwhelming? Claim
   one, come back, write a line. Is it signed with the new seal?
4. **Rejection.** Submit 321 characters. Is the error in the dock, beside
   the text, with the text kept?
5. **Read the whole scroll.** Scroll end to end by wheel, trackpad-style
   horizontal delta, touch swipe, and keyboard. Smooth? Anything clipped,
   overlapping or covered by the dock?
6. **Reduced motion and no JavaScript.** Repeat 1 and 5 with
   `prefers-reduced-motion: reduce`, then with JavaScript disabled.
7. **Logs.** While doing 1 and 3, read the server's stdout. Can you say
   which seal did what? Is any token, cookie or body there?
