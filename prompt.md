# Prompt: make Colophon live, let visitors choose a seal and an ink, and dress it as a cloth scroll

You are taking Colophon (a shared handscroll margin: anonymous, permanent,
one-line notes) from a static page to a live, shared, more beautiful object.
You run unattended start to finish. Nobody will answer questions, so where
this prompt is silent, make the smaller, more conservative choice and write
the choice down in the ADR or a code comment.

Read `README.md` and the harness in `CLAUDE.md` (below the rule) before
touching anything. The harness rules still hold. Where this prompt needs one
of them bent, the argument in `README.md` and the rule in `CLAUDE.md` change
first, in the same commit as the code, and say why the new thing is still not
a name, an account or a feed.

## What good looks like

A stranger opens the scroll on their phone while someone else has it open on a
laptop. The first writes a line; the second sees it appear, inked in, within
about a second, with no reload. Each of them has a seal they chose by meaning,
and an ink colour from a small palette of traditional pigments. The page opens
like a folding fan and reads as a silk-mounted hanging scroll holding a
watercolour painting of spruce and granite, not a web form. Everything still works with JavaScript off, at 1920x1080
and 390x844, with no horizontal scroll.

## Running to-do list: your working memory

You will run for a long time with a limited budget and may be cut off at any
point. Keep a running list so you never lose the thread, and so that whatever
state you stop in is honest and deployable.

- Your first commit creates `TODO.md` at the repo root (after the `CLAUDE.md`
  working agreement). It has four parts: **Now** (the one task in progress),
  **Next** (ordered, each tagged P0 to P3), **Done** (with the commit hash),
  and **Context** (decisions made, gotchas found, file locations, anything a
  fresh you would need after a context reset). Re-read it at the start of every
  task; update it in the same commit as the work.
- Prioritise by value for the brief under the time limit:
  - **P0** the brief's fixed spec: live append within ~1 s, reconnect, the ADR,
    docs consistent with `spec/`. Nothing else matters if this is not done.
  - **P1** seal chooser with the two-way dictionary, ink palette.
  - **P2** ink-in typing, lantern launch, mount layout and cloth, the watercolour
    painting.
  - **P3** fan opening and extras.
- Time-box: if one task has eaten roughly a quarter of your effort or failed
  twice, cut its scope, write what remains into `TODO.md`, and move on.
  A smaller thing that works beats a bigger thing half done.
- After every task `main` must be green and deployable and `TODO.md` accurate.
  If you are about to run out, stop starting new work and spend the remainder
  on making `TODO.md`, the README, the ADR and the tests agree with reality.
- Your last commit leaves `TODO.md` in place (it is the hand-off to whoever
  picks the repo up next) with every unfinished item marked as not done. Delete
  only `prompt.md`.
- You are encouraged to add features of your own once the P0 to P2 items are
  done, if they fit the theme (see "Extras" after Tier 3). Add each to
  `TODO.md` with a one-line reason before you start it.

Seed `TODO.md` with these, in this order:

- [ ] P0 `CLAUDE.md` working agreement, `TODO.md`
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

## Do these in order. Stop after any tier if you run short. A coherent partial result beats a broken whole.

### Tier 1: the core (must ship)

**1. Real-time append.**
- When a colophon is confirmed, it appears on every other open session within
  about 1 second, with no reload. Use Server-Sent Events over the existing
  `node:http` server (no new dependency). The client is a progressive
  enhancement; the page still renders fully server-side and the plain form
  still posts and redirects.
- The server owns the order. A colophon is appended only when it is confirmed
  (the POST succeeds), and the live event is sent from the same code path that
  persists it, after the insert, carrying the already-escaped rendered HTML or
  a payload the client escapes. No colophon body ever reaches a template
  unescaped, in the server render or the live one.
- Reconnect: send an event id per colophon; on reconnect the client sends
  `Last-Event-ID` and receives what it missed in order, with no duplicates and
  no gaps. A visitor returning the next day just gets the full page.
- Cap the number of concurrent SSE connections and send a keepalive comment
  every ~25 s. Do not break `spec/request-limits.test.ts`; extend it if the
  limits change.
- Unfinished drafts are never sent to anyone. Only confirmed colophons travel.

**2. Seal choice by meaning, with a two-way translator.**
- Today a seal is one of 12 characters hashed from the visitor's anonymous
  token (`src/seal.ts`). Let a visitor choose their seal by typing an English
  word (for example "keep", "look", "mountain", "remember"). Do not offer free
  text and do not accept arbitrary Chinese input. Seals come only from a
  curated dictionary.
- Create the dictionary in one source file, about 100 to 150 single characters
  suited to collectors' seals, in traditional forms to match the existing
  glyphs. Each entry: character, pinyin with tone marks, a short English
  gloss, and the English search words that map to it. It must include all 12
  existing hash glyphs (鑑 賞 藏 觀 閱 記 題 珍 玩 守 傳 校). Put a comment at
  the top: "Needs review by a Chinese reader before it is trusted." Do not
  invent obscure or ambiguous characters; fewer, correct entries beat more.
- English to Chinese: a no-JS page (a plain GET form, then a plain POST to
  claim) shows matches as `珍 zhēn: to treasure`; the visitor picks one. No
  match shows "no seal for that word" and a few close suggestions. Never
  output a transliteration of arbitrary input, since that would be a name
  field in disguise.
- Chinese to English: every seal shown on an entry reveals its meaning when
  tapped or clicked (a `<details>`-style control so it works without JS, and
  usable by touch). Give each seal an accessible label with the meaning
  (today it is `aria-hidden`). Add a small "Seals on this scroll" legend
  listing each glyph in use with its pinyin and meaning.
- The chosen seal is snapshotted onto each colophon row when it is written,
  so old entries keep the seal they were written with. Rows with no stored
  seal fall back to the existing hash glyph. Never rewrite history.
- Migrate the existing SQLite database in place and idempotently (the app
  runs on persistent data). Test the migration against a database that
  already has rows.

**3. ADR for the concurrency decision: unique seal claims.**
Write `docs/adr/0001-seal-claims.md`: status, context, options considered,
decision, consequences. The decision to implement is **first-come unique
claims**: a seal chosen from the dictionary belongs to one visitor token at a
time; if two visitors claim the same seal at once, exactly one wins and the
other is told it is taken and shown alternatives. Enforce this with a
database `UNIQUE` constraint so the race is decided atomically, not with a
check-then-insert. Options to record and reject honestly, with their costs:
allow duplicates (simple, but a seal means less and is easy to imitate), and
unique pairs of two characters (more combinations, more dictionary to get
right). Record what first-come costs: scarcity in a small pool, squatting, and
a lost cookie meaning a lost claim. State the rules you chose: a visitor holds
at most one claim; changing it releases the old one; entries already written
keep the seal they were written with; visitors who never choose keep their
hash glyph and hold no claim. Also record the second decision: unfinished
drafts are not broadcast, why, and what that costs.
Link the ADR from `README.md` and keep the README's claims true.

**Tier 1 tests (new, in `spec/`, each must fail without the feature):**
- A second SSE client receives a confirmed colophon within 1000 ms, with no
  reload; two quick writes arrive in order.
- Reconnect with `Last-Event-ID` delivers exactly the missed colophons.
- Two simultaneous claims of the same seal: exactly one succeeds, the other
  gets a clear refusal; neither corrupts the other's entries.
- Every glyph in the dictionary and every glyph the hash can produce has a
  pinyin and a gloss; the 12 legacy glyphs are present.
- A colophon body with markup is escaped in both the page and the live event.
- The migration upgrades a database that already has colophons without
  losing any.
- The form still works with JavaScript disabled for writing and for claiming a
  seal.

### Tier 2: how it looks and feels

**4. Ink palette.** Let the visitor choose the ink colour of their entries
from this fixed list (each passes 4.5:1 contrast on the paper `#f3ede1`):

| key | name | colour |
|---|---|---|
| `mo-lan` | 墨藍 blue ink (default) | `#2a4f9a` |
| `dian-qing` | 靛青 indigo | `#1f3a6e` |
| `shi-lu` | 石綠 malachite | `#2f6b57` |
| `zi` | 紫 plum | `#6a3a5c` |
| `mo` | 墨 ink black | `#2b2721` |

- The form posts the **key**. The server validates it against the list;
  an unknown key is rejected or falls back to the default. Never accept a
  hex value, and never put visitor input into a `style` attribute. Render a
  CSS class such as `ink--shi-lu`. Snapshot the key on the colophon row like
  the seal; rows without one use the default.
- Offer it as radio swatches (works with JS off), each with a visible text
  label and a focus state, tappable at 390 px.
- `--seal` red keeps exactly one meaning, "this colophon is yours". No
  palette colour may be red or close to it. Add a test that every palette
  colour is far from `--seal` and meets 4.5:1 contrast, including against the
  darkest value of any texture behind it.

**5. Ink-in typing.** As the visitor types, their line draws itself in the
chosen ink as if being brushed onto the scroll: each character fades in with a
slight blur-to-sharp, ink-soaking feel. Backspaced characters blot out (fade to
a smudge) rather than vanish. This is a local progressive enhancement: nothing
is sent anywhere while typing and nothing is stored until the visitor confirms;
confirming posts the form and the colophon is appended. Show the remaining
characters against the 320 limit; never truncate silently. Changing the
swatch recolours the preview. This replaces a separate preview/confirm page;
with JS off the plain textarea and button still work. Respect
`prefers-reduced-motion`.

**6. Lantern launch.** Clicking "Write it in" sends a Chinese sky lantern
rising from the button. The lantern is a reward for a colophon that was
actually accepted, never for a click that failed.
- With JS, intercept the submit and post in the background. Only when the
  server accepts the colophon (2xx) does the lantern launch and the new entry
  appear, through the same live-append code path used for other sessions
  (de-duplicate by event id so the visitor's own entry is not inserted twice
  when its live event echoes back). If the server rejects it (empty, too long,
  seal taken, bad ink key), show the error exactly as today and launch nothing.
- Without JS, the plain form posts and redirects as it does now, with no
  lantern. Nothing about the core flow may depend on this animation.
- The lantern carries the line itself. The ink-in text the visitor typed
  (item 5) lifts off the writing area, settles onto the lantern's paper
  body in their chosen ink, and rises with it. The visitor's seal character
  is stamped small at the bottom of the lantern. Order matters: the typed
  text stays exactly where it is until the server has accepted the line, so a
  rejected submit loses nothing and nothing moves. Only on acceptance does
  the text transfer to the lantern and the textarea clear.
- Long lines: the lantern is small and a colophon can be 320 characters, so
  show the line scaled to fit and, if it still does not fit, visually clip it
  with a soft fade at the lantern's edge. This clip is only the animation.
  The stored colophon and the entry in the list are always the complete,
  untouched text.
- The text on the lantern is untrusted user input. Put it in with
  `textContent` or SVG `<text>` set via `textContent`, never `innerHTML`, and
  mark the whole lantern `aria-hidden` so screen readers read the real entry
  once, not the lantern too.
- Look: a small paper lantern as inline SVG, warm amber and paper tones with a
  soft glow, kept pale enough that the ink colours in the palette still meet
  4.5:1 contrast against the lantern body (extend the contrast test to cover
  it). Do not use `--seal` red for it (red keeps exactly one meaning,
  "yours"). It rises roughly 4 s, drifts slightly sideways, shrinks a little
  and fades out near the top of the viewport. At 390 px it starts at the
  button and must not cause horizontal scroll or cover the form.
- The entry appears in the list as the lantern leaves, so the line is never
  on screen in two places at full strength at once.
- Mechanics: animate only `transform` and `opacity`; render in a fixed,
  `aria-hidden`, `pointer-events: none` layer that clips its overflow; remove
  each lantern from the DOM on `animationend`; allow at most 5 in flight at
  once (drop the extra animation, never the entry). Skip it under
  `prefers-reduced-motion`: the entry just appears.
- Optional, only if everything else in this tier is done: when a confirmed
  colophon arrives live from another visitor, send one small, faint lantern
  rising quietly behind the page. It carries no text, no seal and no
  information about who wrote it (the entry itself is what shows the words),
  and is the only live cue besides the entry.
- Tests (jsdom is available): an accepted submit adds exactly one lantern and
  one entry; a rejected submit adds no lantern and leaves the typed text in
  place; the lantern shows the written line, and a body containing markup
  such as `<img src=x onerror=alert(1)>` appears as literal text with no
  element created; a 320-character line is clipped on the lantern but the
  stored and listed entry is complete; the entry is not duplicated when its
  own live event echoes back; with the script absent the form still posts.

**7. Theme and layout.** Extend the existing theme (paper, ink, seal red,
Georgia) so every page, including `/readme/`, feels like one object.
- Make the page a hanging-scroll mount: top and bottom rollers, a silk mount
  border in a contrasting cloth, the painting as a panel inside it. Colophons
  sit like inscriptions on the mount.
- Leave generous empty space. Behind the header, a faint, misty crop of the
  watercolour from item 8, faded to paper at its edges and kept light enough
  that header text stays at 4.5:1. A vertical-rl accent for the title "題記"
  is welcome; keep entries horizontal for reading.
- Colour tokens come from the painting, not from stock greens: `--spruce
  #3d5a3a` (deep green), `--moss #7b9a5a`, `--granite #8a8378` (warm grey),
  `--clay #b79d7c` (earth path), pale overcast sky `#e6e9e4`; paper stays
  `#f3ede1`. The mount silk is a moss green (about `#61785a`) rather than
  celadon blue-grey. These are scenery tokens: they never colour a visitor's
  text, never mean "yours", and are separate from the ink palette and `--seal`.
- Restyle the stock blue and purple links to ink tones.
- Cloth texture, all CSS and inline SVG, no raster assets: faint warp-and-weft
  weave from two `repeating-linear-gradient` layers; a small tiled
  `feTurbulence` data-URI tile for silk slub, blended with multiply; a richer
  brocade-like pattern on the mount than on the painting; soft crease and edge
  shading near the rollers. Subtle: you should see cloth when you look for it,
  not when you read. Keep the texture lowest-amplitude under entry text. Tile
  once; never apply a live SVG filter over large areas; animate only
  transforms and opacity. Drop the texture under `prefers-contrast: more` and
  in print. Use `rem` tile sizes so it holds at both viewports.

**8. The watercolour painting: spruce, granite and a path.** The painting inside
the scroll is a watercolour of a forest, built by you as inline SVG. A
photographic reference existed (a Nordic spruce forest with granite boulders);
you do not have it, so paint from this description.
- Composition, portrait like a hanging scroll (viewBox about 820 x 1230): tall,
  dark spruces on the left, centre and right against a pale overcast sky; a
  stack of weathered granite boulders in the middle distance; one large mossy
  boulder, lower right, with grass tufts along its top; a pale earth path with
  exposed roots curving in from the lower left; a soft, blurred boulder across
  the bottom edge as foreground. Hazy, quiet, a little cool.
- Watercolour technique in SVG: layered translucent fills with
  `mix-blend-mode: multiply` so washes darken where they overlap; darker pooled
  edges (a low-opacity stroke along shape rims); one `feTurbulence` +
  `feDisplacementMap` on the painting group only, for wet, ragged edges; paper
  grain from a tiled tile; and an unpainted ragged border where the wash stops
  short of the paper. Spruce as stacked, drooping tiers of translucent green;
  boulders as angular washes with a few dry-brush texture strokes (the Ni Zan
  manner that the scroll's own README names); granite in `--granite`, moss
  caps in `--moss`, the path in `--clay`.
- Budget: one inline SVG, no raster file, no external image, about 25 KB or
  less. It carries `role="img"` with a plain-language `aria-label`. Show it
  centred, `max-height: 34rem` on desktop and full width on mobile, with open
  paper either side, the way a hanging scroll leaves the painting small inside
  a long mount.
- Reuse small pieces of it (a spruce, a boulder) as dividers, a header corner
  and a tiny rock beside the writing form. Decorative pieces are `aria-hidden`.
  At 390 px scale down or drop extras so nothing causes horizontal scroll.
- Text never sits on the painting. Entries and the form stay on plain paper.

### Tier 3: only if there is time

**9. Fan opening on launch.** The whole page opens like a Chinese folding
fan: revealed through a fan-shaped mask pivoting at bottom-centre, widening
from nothing to a half circle in about 1.2 s, with faint pleat ribs fading out
as it opens. (The inspiration was a Met Museum fan image the pod could not
embed here; a classic folding fan is the reference.) Implement in CSS with an
animated `@property` angle and a plain fade fallback; remove the mask when
the animation ends so nothing stays clipped. Content stays in the DOM and
readable throughout. Skip under `prefers-reduced-motion`. Do not replay it
after every posted colophon: gate it to once per browser session with a small
external script file (`sessionStorage`); with JS off it plays each load.

### Extras: only after P0 to P2 are done and green

If you have time, add small things of your own that belong to this world. Each
must be on theme, tested if it has behaviour, free of new dependencies,
respectful of `prefers-reduced-motion`, and written into `TODO.md` first. Ideas
you may take or ignore:
- **Fresh ink:** a newly arrived entry looks wet (a faint sheen and slightly
  deeper colour) and dries to its final ink over ~8 s.
- **Seal press:** the seal stamps down into the paper when an entry lands.
- **Mist:** very slow, low-contrast drift of mist across the painting, CSS only.
- **Cairn:** a small decorative stack of stones beside the path whose height
  tracks the number of colophons. It is a count, never a list of people.
- **Time of day:** the painting's sky tint follows the visitor's local hour,
  computed in the browser, nothing sent anywhere.
- **Print:** a print stylesheet that lays the scroll out as a clean page.
Never add anything that is a feed, presence, an identity or an edit: the
harness and the "Leave alone" list still win over any idea of yours.

## Working agreement: write this into `CLAUDE.md` first

Before building anything, add the following to `CLAUDE.md` in the harness
section below the rule (leave the riff block above it exactly as it is), and
commit it. Keep it short; `CLAUDE.md` is context for every future session.

- **What this is** (put it at the top of the harness, 4 to 6 lines): Colophon
  is a shared, anonymous, permanent margin on one Chinese handscroll painting.
  Visitors leave one-line notes (max 320 characters) that cannot be edited or
  deleted, signed with a seal they choose by meaning from a curated
  English/Chinese dictionary and written in an ink from a fixed palette.
  Confirmed notes appear on every open session within about a second. The
  look is a silk-mounted scroll with pine and rock, ink-in typing, a lantern
  launch and a fan opening. Small, quiet, finished; not a platform.
- **Stack and layout:** plain `node:http` server, SQLite, no framework; list
  the real files under `src/` and `public/` and what each is for, and update
  that list whenever it changes.
- **Design tokens:** list the colour tokens (`--paper`, `--ink`, `--ink-soft`,
  `--seal`, the five ink palette keys, the lantern and mount colours) with
  their one-line meaning, and the rule that `--seal` means only "yours".
- **Commit and push as you go:** commit small and often, one idea per commit,
  with a clear message. Run `pnpm check` first and commit only when it exits
  0 (gate on the command's own exit code, never on a pipe into `grep`).
  Push `main` after each green commit so every step is deployable and the
  live site is never far behind. Never commit or push on red; if something
  breaks, fix it or revert before moving on. Never commit secrets.
- **Look at it, at both viewports:** after any UI or layout change, open the
  running app in a real browser, take screenshots at desktop 1920x1080 and
  mobile 390x844, and read them. Use whatever headless browser tool is
  available in your environment (an agent browser, or Playwright as a
  dev-only dependency). Check: no horizontal scroll, controls reachable and
  tappable, canvas and scroll art not clipped, text legible over the cloth
  texture, the fan and lantern animations finishing and leaving nothing
  behind. If no browser is available, say so in the commit message and rely on
  the jsdom tests instead; do not claim a visual check you did not do.
- **Bugs:** when a check finds a real bug, the fix is a new `spec/` test or a
  rule here, not only a patched line. When you are corrected, put the rule
  here.
- **Motion and accessibility:** every animation respects
  `prefers-reduced-motion`; decorative art and lanterns are `aria-hidden`;
  every control has a keyboard path and a visible focus state; text keeps 4.5:1
  contrast on every surface it sits on.
- **Data safety:** the SQLite file lives on persistent storage. Migrations are
  idempotent and tested against a database that already has rows. Never drop
  or rewrite existing colophons.
- **Running to-do list:** `TODO.md` is the working memory described above;
  update it in the same commit as the work it records.
- **Keep docs consistent:** a claim in `README.md`, `CLAUDE.md`, the ADR and
  `spec/` must hold in all of them; if you change one, change the others in
  the same commit.

## Leave alone

- Everything in the harness: no accounts, names, profiles, likes, replies,
  threads or notifications; no editing or deleting a colophon; no silent
  truncation; every body through `escapeHtml`; reading and writing work with JS
  off; `--seal` means only "yours".
- No presence indicators, typing indicators or "who is here" lists. Visitors
  stay anonymous. The only live thing is a confirmed colophon arriving.
- No new runtime dependencies if the standard library can do it. No external
  fonts, scripts, translation APIs or image hosts.
- Keep `spec/invariants.test.ts` green. You may change or delete the other
  existing spec files only where they conflict with this brief, and replace
  them with tests that cover the same ground.

## Definition of done

- `pnpm check` is green with the app running; every new behaviour above has a
  test that fails without it.
- `README.md` and `CLAUDE.md` are updated and consistent with each other and
  with `spec/`: the seal is now chosen from a dictionary and snapshotted, ink
  is chosen from a fixed palette, and why neither is a name.
- Checked at 1920x1080 and 390x844: no horizontal scroll, controls reachable,
  nothing clipped.
- `main` is deployable after every commit; commit small, with clear messages.
- `TODO.md` is accurate and left in place, unfinished items marked not done.
- Delete `prompt.md` in your last commit.
