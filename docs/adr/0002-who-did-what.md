# 0002: who did what, in the logs

## Status

Accepted, crit 10 ("Fly by instruments").

## Context

Two people use Colophon from its live URL in separate Chrome profiles while
a third narrates, from `flyctl logs` alone, who did what. The finding is any
moment the narrator can't tell the two apart, or any action by one that
changes what should be the other's. Until now the server logged one line at
startup and nothing else, so the narrator had nothing to read.

Colophon has no accounts, and ADR 0001 explains why it never will. So the
question "who is a person" already has an answer: a person is one browser's
anonymous `seal` cookie, a random UUID set `HttpOnly` on the first visit
(`src/cookies.ts`). The server already decides what each token may change.
A visitor may claim or give up only their own seal, and nobody, the writer
included, may change any colophon once it's written. What was missing was a
record of those decisions that a person could read aloud.

## Decision

Every action the server takes on a visitor's behalf writes one logfmt line
through `log()` in `src/log.ts`, and names the visitor as
`who=<glyph>#<tag>`. The glyph is the seal they sign with at that moment,
before the action takes effect; the tag is the first six hex characters of
`sha256("colophon-log:" + token)`. These are the lines a narrator sees:

```
event=colophon.written who=校#6bb384 id=1 ink=mo-lan len=17
event=colophon.rejected who=校#6bb384 reason=empty len=0
event=colophon.rejected who=校#6bb384 reason=ink len=12
event=colophon.rejected who=校#6bb384 reason=too-large
event=seal.claimed who=校#6bb384 seal=山
event=seal.refused who=觀#3d7708 reason=taken seal=山
event=seal.refused who=觀#3d7708 reason=unknown
event=colophon.written who=山#6bb384 id=3 ink=mo len=17
event=seal.released who=山#6bb384 seal=山
event=stream.opened open=1
event=stream.closed open=0
event=error path=/colophons code=ECONNRESET
```

The glyph changes when someone claims a seal (校 becomes 山 above) and the
tag doesn't, so the narrator can follow one browser through a change of
seal, and tell 觀#3d7708's refused claim of 山 from the claim that took it.
`seal.released` is written only when a seal was actually held. So a
narrator reads the tag as the person and the glyph as the signature they
use right now: once one visitor gives up a seal and another takes it, the
same glyph appears with two different tags minutes apart.

Page streams carry no `who`, only a count (`src/live.ts`). Opening a page is
reading, not acting, and a log of who is reading is exactly the list of
who's here that Colophon refuses to show anyone.

Nothing identifying or written by a visitor is ever passed to `log()`: not
the token, the Cookie header, a colophon body, a query string, or a glyph a
client sent that isn't in the dictionary (an unknown claim logs
`reason=unknown` and nothing else). Behind that, `log()` itself writes any
value that isn't a finite number or a plain token (no space, quote, `=` or
backslash) as `?`, so even a mistaken call can't put a sentence of someone's
writing into the log or break the line's shape.

The request handler now has one error boundary. A client that sent half its
declared `Content-Length` and hung up used to make the body read throw an
unhandled rejection, and Node 24 exits on one: one visitor's dropped
connection took the page down for everyone. It is now caught, answered with
a 500 if nothing was sent yet, and logged as `event=error` with the path and
error code only.

## Options considered

- **HMAC the token with a Fly secret.** The strongest case: someone holding
  both a leaked log and a stolen cookie couldn't link the two, which a plain
  hash allows. Rejected because the token is already 122 random bits, so the
  plain hash can't be reversed or guessed from the log alone, and anyone
  holding the cookie can already act as that visitor. A secret adds config to
  set and rotate, and every tag changes when it does, mid-crit if unlucky.
  The `colophon-log:` prefix keeps the tag from matching any other hash of
  the token.
- **The glyph alone.** Simplest and the most readable aloud. Rejected
  because visitors who never choose a seal share twelve hash glyphs, so two
  of them collide often, and that collision is precisely the crit's finding.
- **The token, or a full hash.** Perfectly distinguishing. Rejected because
  the token is the identity cookie: logging it hands anyone who reads the
  log the power to write as that visitor, and a log is read by more people
  than the database.
- **JSON lines.** Machine-parseable and conventional. Rejected because
  logfmt reads aloud in a narration and Fly's log viewer shows it plainly;
  nothing here is parsed by a machine.

## What it costs

- **Volume.** One line per action, plus two per page view for the stream.
  Small for an app this size.
- **Tag collisions.** Six hex characters is about one chance in 16 million
  for any given pair of visitors. Combined with the glyph, a collision the
  narrator can't resolve is vanishingly unlikely at this scale.
- **The tag links a browser across time.** That's its job, but it means the
  log shows which actions one anonymous browser took, from first visit to
  last, for as long as Fly keeps logs. It doesn't say who that browser
  belongs to, and the database already holds the same link (each colophon
  stores its writer's token), so the log reveals nothing the server didn't
  already know. It is still a trace, and I'm writing it down rather than
  pretending it isn't one.

## How it's checked

`spec/logs.test.ts` starts its own server, writes a colophon and claims a
seal, and asserts both lines appear with the right glyph and that neither
the token nor the body appears anywhere in stdout. The `?` rule is in
`value()` in `src/log.ts`, where every field passes through it.
