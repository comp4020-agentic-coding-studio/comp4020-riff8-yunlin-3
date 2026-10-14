# Colophon

The page is a handscroll, and the notes strangers have left on it are the
scroll: one line each, laid side by side from right to left, newest at the
left end, with no account, no name, and nothing that can be edited or
deleted once it's there. It is alive the way a scroll is alive: everyone who
has ever unrolled it left something behind, and the next person can still
find it.

## What good means here

Chinese handscrolls were never finished when the painter set the brush down.
Later owners and admirers kept adding their own inscriptions and seals after
the image, sheet by sheet, so that a scroll only a foot square in its painted
part could grow twenty feet long from six centuries of appended commentary —
the [Met's history of the format](https://www.metmuseum.org/essays/chinese-handscrolls)
calls this "a continuous dialogue" between the work and everyone who has since
sat with it. That is the shape of multi-user, real-time and persistent I
wanted: not a feed, but one object that a small, unhurried stream of people
add to, permanently, leaving a trace the next visitor can actually find.

Three other things I read while deciding what small and good looks like here:

- Robin Sloan's [_An app can be a home-cooked meal_](https://www.robinsloan.com/notes/home-cooked-app/)
  argues the best case for a tiny app is never that it will grow, but that it
  is finished, sovereign and answers only to the few people it was built for.
  This app answers to whoever writes in the margin, not to a growth number.
- [Hundred Rabbits](https://sourcehut.org/blog/2021-12-08-100-rabbits-interview/),
  who build their own software from a sailboat, say "if we can use less
  technology to solve any one task, we will" and prize software that "gets
  smaller over time, that sheds the superfluous" — the whole app is closer
  to a workshop tool built for one particular painting than a platform
  built to hold any painting at all.
- Bernie DeKoven's [_The Well-Played Game_](https://www.deepfun.com/fun-store/the-well-played-game/)
  says a shared act is worth more for the quality of playing it together than
  for any individual score — there is no score here, no likes, nothing to
  win, only the quality of what gets left behind.

## A seal by meaning, an ink from a palette

A visitor signs with a seal. If they never think about it, their browser is
given one of twelve collectors' characters at random. If they want to, they
can [choose one by meaning](/seal): type an English word ("keep",
"mountain", "remember") and pick from the characters in a curated
dictionary that mean it. The dictionary holds nearly nine hundred
characters in nine themes, from the studio and states of mind to
landscape, weather, the seasons, living things, kin and the crafts; the
seal page shows seals as a grid of cards and lets you browse each theme
a page at a time with plain links, no script needed. Its search is forgiving: capitals don't matter, "mountains" and "keeping"
find what "mountain" and "keep" do, and a word that only appears in a
seal's gloss still finds it, ranked after the closer matches. Tap any seal
on the scroll to read what it means. They also choose the ink they write
in, from five traditional pigments.

Neither is a name. The chooser only offers characters from the dictionary,
found by an English word; it never accepts free text and never transliterates
what someone types, so nobody can spell themselves out. An ink is one of five
fixed colours, posted as a key and rendered as a class. A seal says what
someone cares about, the way collectors' seals often did, not who they are.
Each seal belongs to one visitor at a time, first come, and each line keeps
the seal and ink it was written with; the reasoning and what it costs are in
[ADR 0001](/adr/0001-seal-claims/).

## Several people at once

A line written anywhere appears on every open copy of the page within about
a second, with no reload. Only confirmed lines travel: nothing anyone types
is sent until they press "Write it in", so there's no typing indicator and
no list of who else is here. A page that loses its connection catches up on
exactly what it missed when it reconnects. The same ADR records why drafts
stay private and what that quiet costs.

The server logs one line per action, naming each visitor by the seal they
sign with and a short one-way tag of their browser's token, so whoever
reads `flyctl logs` can tell two people apart without learning who either
is. Open pages appear only as a count, never by who is reading. No token,
cookie or colophon body ever reaches the log;
[ADR 0002](/adr/0002-who-did-what/) records the format and what it costs.

## How it looks

The page is a handscroll laid across the wall: silk mount, wooden rollers
at either end, and between them one paper sheet per line. It reads right to
left, the way a Chinese handscroll does. A handscroll grows at its end ---
colophons were appended after the painting, sheet by sheet, for centuries
--- so the newest line sits at the left end, where the scroll is still
growing, and you scroll right to read back in time. The English itself
stays horizontal; only the order of the sheets follows the scroll. The list
is newest first in the page itself, so the screen, the keyboard, a screen
reader and a browser with no script all start at the newest line and move
back in time together. A "Skip past the scroll" link lets a keyboard reader
jump over it to what follows.

Each sheet is sized by its line, the way real colophons were: a short note
takes a narrow strip, a long one a wide passage. The size is worked out
from the line's length when the page is drawn, not stored. Each sheet's
date is a link to that line (`/#c-<id>`), so a line can be shared; opening
one glides the scroll to it and rings it briefly in gilt.

The watercolour that used to stand above the margin is gone from the
middle of the page; it survives only as a faint wash behind the title.
The visitors' lines are the scroll now, and a painting at its head would
make them its footnotes again. The photograph of Wang Yi's handscroll stays,
small and credited below the scroll, as the tradition this one borrows
from. The colours of the mount still come from the watercolour; they never
colour anyone's words. The only red on the page is the seal, and it means one
thing: this line is yours.

Writing happens in a dock fixed to the bottom of the window, so it is
always within reach however far back you've read. It is fixed by CSS, so
it works with JavaScript off, and the page leaves room under itself for
the dock so nothing you are reading or focused on hides behind it. If a
line is refused, the dock says why and your text stays in the box, with or
without a script.

The scroll moves like silk where it can. Native scrolling comes first:
touch, trackpad and scrollbar are never intercepted. With a script, a
vertical wheel and the arrow, Page and Home/End keys glide it along, and a
line arriving from someone else never moves a reader who is somewhere
else on the scroll; only a reader already at the newest end sees it slide
in. Your own line is the exception: when it lands it glides into view
wherever you were reading, since you've just watched it leave the dock.
Follow a date link and Back returns you to where you were. With reduced motion asked for, every move is instant. Under the scroll
a thin strip shows where you are along its whole length and which lines
you're looking at, and your own lines appear on it as small red ticks ---
the same red, the same meaning. A screen reader hears a new line arrive
through one quiet status line: someone else's line is read as its seal
and a short excerpt, or the seal alone while you're writing, so your own
words aren't talked over; a burst of lines is a single count, and your own
line is confirmed when it's in. It never hears who else is reading.

Pages and text files are sent gzipped to any browser that asks, which
keeps a long scroll quick to arrive on a slow connection.

As you type, your line inks itself in, character by character, in the ink
you chose; a deleted character blots out where it stood. Nothing you type
leaves your page until you press "Write it in". When the scroll accepts the
line it rises away from the dock on a paper lantern, carrying your words
and your seal, and lands on the scroll as the lantern goes. A refused line
stays exactly where it was, and nothing flies. Someone else's line arriving
sends up one small, faint lantern that carries nothing at all. The page
opens like a folding fan once per visit (on every load, with JavaScript
off). All of it is decoration on a plain
form: with JavaScript off, or with reduced motion asked for, the scroll
reads and writes the same, just without the weather.

The seal dictionary is still only ever a dictionary: nothing outside it can
become a seal and nothing typed is transliterated. It was written without a
Chinese reader to check it, and says so at the top of the file; at nearly
nine hundred rows that review matters more, not less, before it's trusted.

## What I chose not to build

No accounts, avatars or profiles --- a visitor is only their seal, held by an
anonymous token in their browser, the same way a real seal marks presence
without disclosing a name. No editing or deleting a colophon once it's
written: ink doesn't come back off the paper, and a length limit (320
characters, checked by the server, never by the browser cutting a paste
short; the counter shows how far over you are) is the constraint that keeps a visitor considering a line rather
than typing a paragraph. No likes, no replies, no threading, no
notifications, no presence. The only live thing is a confirmed line arriving.

## What's enforced, what's judged

`spec/` checks that a colophon written now is still there on the next
request, that a visitor's own colophons are the ones marked as theirs (and
nobody else's are), and that an empty or over-length line is rejected rather
than silently corrupted. It checks that a confirmed line reaches a second open
page within a second, that a reconnect gets exactly what it missed, that two
visitors racing for the same seal can't both win, that every seal has a
pinyin and a meaning, that inks are only ever the five on the list, and that
the old database upgrades without losing a line. Whether the tone of what
accumulates actually reads like a colophon --- considered, brief, worth adding
to a shared object --- rather than chat is not something a test can check;
that's for whoever reads the margin to judge.
