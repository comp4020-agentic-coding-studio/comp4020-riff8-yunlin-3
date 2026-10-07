# Colophon

A handscroll painting stays open on the page. Under it, in the order they were
written, sit the notes strangers have left in its margin — one line each, no
account, no name, nothing that can be edited or deleted once it's there. It is
alive the way a scroll is alive: everyone who has ever unrolled it left
something behind, and the next person can still find it.

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
"mountain", "remember") and pick from the characters in a small curated
dictionary that mean it. Tap any seal on the scroll to read what it means.
They also choose the ink they write in, from five traditional pigments.

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

## How it looks

The page is a hanging scroll: wooden rollers top and bottom, moss-green silk
mount, and a paper panel with a gilt edge holding a small watercolour of
spruce, granite and an earth path, painted as SVG washes rather than a
photograph. The colours of the mount come from the painting; they never
colour anyone's words. The only red on the page is the seal, and it means
one thing: this line is yours.

As you type, your line inks itself in, character by character, in the ink
you chose; a deleted character blots out where it stood. Nothing you type
leaves your page until you press "Write it in". When the scroll accepts the
line it rises away from the button on a paper lantern, carrying your words
and your seal, and lands in the list as the lantern goes. A refused line
stays exactly where it was, and nothing flies. Someone else's line arriving
sends up one small, faint lantern that carries nothing at all. The page
opens like a folding fan once per visit (on every load, with JavaScript
off). All of it is decoration on a plain
form: with JavaScript off, or with reduced motion asked for, the scroll
reads and writes the same, just without the weather.

The seal dictionary was written without a Chinese reader to check it, and
says so at the top of the file. It should be reviewed before it's trusted.

## What I chose not to build

No accounts, avatars or profiles --- a visitor is only their seal, held by an
anonymous token in their browser, the same way a real seal marks presence
without disclosing a name. No editing or deleting a colophon once it's
written: ink doesn't come back off the paper, and a length limit (320
characters) is the constraint that keeps a visitor considering a line rather
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
