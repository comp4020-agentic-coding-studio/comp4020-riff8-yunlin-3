import { escapeHtml } from "./html.ts";
import { currentSeal, entrySeal, type Seal } from "./seal.ts";
import { DEFAULT_INK, INKS } from "./ink.ts";
import type { SealEntry } from "./dictionary.ts";
import { claimOf, type Colophon } from "./db.ts";

const dateFmt = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Australia/Canberra",
});

export const MAX_BODY_LENGTH = 320;

interface LayoutOptions {
  // An extra first link before the page, for a target far down the tab order.
  skip?: string;
  // Placed after the mount, outside the scroll's flow: the dock, the lantern
  // sky and scripts.
  after?: string;
  bodyClass?: string;
  // A hanging scroll (rollers top and bottom, silk between) for the reading
  // pages; the scroll page instead lays a handscroll across the wall.
  hanging?: boolean;
}

function layout(title: string, body: string, { after = "", bodyClass, hanging = true, skip = "" }: LayoutOptions = {}): string {
  return `<!doctype html>
<html lang="en-AU">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta
      name="description"
      content="Colophon: a shared margin on one painting, written a line at a time by whoever visits."
    />
    <link rel="icon" href="/public/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/public/styles.css" />
    <link rel="stylesheet" href="/public/scroll.css" />
    <script src="/public/fan.js"></script>
  </head>
  <body${bodyClass ? ` class="${bodyClass}"` : ""}>
    ${skip}
    <div class="fan-veil" aria-hidden="true"></div>
    <div class="fan-ribs" aria-hidden="true"></div>
    ${
      hanging
        ? `<div class="mount">
      <div class="roller roller--top" aria-hidden="true"></div>
      <div class="mount-silk">
        ${body}
      </div>
      <div class="roller roller--bottom" aria-hidden="true"></div>
    </div>`
        : `<div class="mount mount--wall">
      ${body}
    </div>`
    }
    ${after}
  </body>
</html>
`;
}

function header(kicker: string, linkHome: boolean, compact = false): string {
  const title = linkHome ? `<a href="/">Colophon</a>` : "Colophon";
  return `<header class="site-header${compact ? " site-header--compact" : ""}">
          ${compact ? "" : `<p class="title-accent" lang="zh-Hant" aria-hidden="true">題記</p>`}
          <h1>${title}</h1>
          <p class="kicker">${escapeHtml(kicker)}</p>
          <nav aria-label="Colophon"><a href="/">the scroll</a> · <a href="/seal">choose a seal</a> · <a href="/readme/">what good means here</a></nav>
        </header>`;
}

function sealLabel(s: SealEntry): string {
  return `Seal ${s.glyph}, ${s.pinyin}: ${s.gloss}`;
}

// A seal on an entry opens to its meaning when tapped or clicked: a plain
// <details>, so it works by touch, keyboard and with no script at all.
function sealMark(seal: Seal): string {
  const s = seal.entry;
  return `<details class="colophon-seal${seal.chosen ? " seal--chosen" : ""}">
          <summary aria-label="${escapeHtml(sealLabel(s))}"><span aria-hidden="true">${s.glyph}</span></summary>
          <p class="seal-meaning"><span lang="zh-Hant">${s.glyph}</span> ${escapeHtml(s.pinyin)}: ${escapeHtml(s.gloss)}</p>
        </details>`;
}

export function inkClass(key: string | null): string {
  return `ink--${INKS.some((i) => i.key === key) ? key : DEFAULT_INK}`;
}

export function colophonEntry(c: Colophon, ownToken: string): string {
  const mine = c.token === ownToken;
  return `<li class="colophon ${inkClass(c.ink)}${mine ? " colophon--mine" : ""}" id="c-${c.id}" data-id="${c.id}">
        <p class="colophon-body">${escapeHtml(c.body)}</p>
        <div class="colophon-foot">
          <p class="colophon-date">${dateFmt.format(new Date(c.created_at))}${mine ? " — yours" : ""}</p>
          ${sealMark(entrySeal(c))}
        </div>
      </li>`;
}

export function legendItem(entry: SealEntry): string {
  return `<li data-glyph="${entry.glyph}"><span class="legend-glyph" lang="zh-Hant">${entry.glyph}</span> ${escapeHtml(entry.pinyin)}: ${escapeHtml(entry.gloss)}</li>`;
}

function legend(colophons: Colophon[]): string {
  const seen = new Map<string, SealEntry>();
  for (const c of colophons) {
    const { entry } = entrySeal(c);
    seen.set(entry.glyph, entry);
  }
  return `<details class="seal-legend">
          <summary id="legend-heading">Seals on this scroll</summary>
          <ul>${[...seen.values()].map(legendItem).join("")}</ul>
        </details>`;
}

const ERRORS: Record<string, string> = {
  empty: "A colophon needs at least a few words.",
  long: `Keep it to ${MAX_BODY_LENGTH} characters — the margin is not infinite.`,
  ink: "Choose one of the inks on the list.",
};

export function errorMessage(code: string | undefined): string | undefined {
  return code ? ERRORS[code] : undefined;
}

function inkSwatches(checkedInk: string = DEFAULT_INK): string {
  const checked = INKS.some((i) => i.key === checkedInk) ? checkedInk : DEFAULT_INK;
  return INKS.map(
    (ink) => `<label class="swatch ${inkClass(ink.key)}">
              <input type="radio" name="ink" value="${ink.key}"${ink.key === checked ? " checked" : ""} />
              <span class="swatch-chip" aria-hidden="true"></span>
              <span class="swatch-name"><span lang="zh-Hant">${ink.hanzi}</span> ${escapeHtml(ink.name)}</span>
            </label>`,
  ).join("\n            ");
}

export interface Draft {
  body: string;
  ink: string;
}

export function renderIndex(colophons: Colophon[], ownToken: string, error?: string, draft?: Draft): string {
  const message = errorMessage(error);
  const own = currentSeal(ownToken, claimOf(ownToken));
  const lastId = colophons.at(-1)?.id ?? 0;

  const body = `
      ${header("a shared margin on one painting", false, true)}
      <main id="main">
        <section class="scroll-section" aria-labelledby="colophons-heading">
          <h2 id="colophons-heading" class="visually-hidden">Colophons</h2>
          <div class="handscroll">
            <div class="handscroll-roller handscroll-roller--start" aria-hidden="true"></div>
            <div class="scroll" role="region" aria-labelledby="colophons-heading" tabindex="0" data-scroll>
              <ol class="colophon-list" data-last-id="${lastId}">
                ${colophons.map((c) => colophonEntry(c, ownToken)).join("\n                ")}
              </ol>
              ${colophons.length === 0 ? `<p class="empty-note">No one has written in the margin yet.</p>` : ""}
            </div>
            <div class="handscroll-roller handscroll-roller--end" aria-hidden="true"></div>
          </div>
          <p class="section-note">Newest at the left; scroll right to read back in time. Nothing written here can be taken back. Tap a seal for its meaning.</p>
          ${legend(colophons)}
        </section>
        <figure class="tradition">
          <img src="/public/scroll.avif" alt="" />
          <figcaption>
            The tradition this margin borrows from: Wang Yi, <cite>Portrait of Yang Zhuxi</cite>, 1363, a
            handscroll of Yang standing under a pine, with Ni Zan's rocks and pine, flanked by six and a
            half centuries of collectors' colophons and seals. Palace Museum, Beijing.
          </figcaption>
        </figure>
      </main>
  `;

  return layout("Colophon", body, {
    after: dock(own, message, draft),
    bodyClass: "page-scroll",
    hanging: false,
    skip: `<a class="skip-link" href="#body">Skip to writing a line</a>`,
  });
}

// The writing dock: fixed to the bottom of the viewport by CSS alone, outside
// the scroll's flow, so it never needs a scroll to reach and still works with
// no script. The error paragraph stays the sibling just before the form,
// where app.js's showError() puts its own.
function dock(own: Seal, message: string | undefined, draft: Draft | undefined): string {
  const meaning = `${own.entry.glyph}, ${own.entry.pinyin}: ${own.entry.gloss}`;
  const how = own.chosen ? "the seal you chose" : "given to your browser at random";
  return `<section class="dock" aria-labelledby="write-heading">
      <h2 id="write-heading" class="visually-hidden">Add yours</h2>
      ${message ? `<p class="form-error" id="form-error" role="alert">${escapeHtml(message)}</p>` : ""}
      <form method="post" action="/colophons" class="write-form" data-own-seal="${own.entry.glyph}">
        <label for="body" class="visually-hidden">A line for the margin</label>
        <div class="inkwell">
          <textarea id="body" name="body" maxlength="${MAX_BODY_LENGTH}" rows="2" required
            placeholder="A line for the margin…"
            aria-describedby="body-count${message ? " form-error" : ""}">${draft?.body ? `\n${escapeHtml(draft.body)}` : ""}</textarea>
        </div>
        <p id="body-count" class="count">Up to ${MAX_BODY_LENGTH} characters.</p>
        <fieldset class="inks">
          <legend class="visually-hidden">Ink</legend>
          ${inkSwatches(draft?.ink)}
        </fieldset>
        <button type="submit">Write it in</button>
      </form>
      <p class="dock-seal">You sign with <span class="dock-glyph${own.chosen ? " dock-glyph--chosen" : ""}" lang="zh-Hant" title="${escapeHtml(meaning)}">${own.entry.glyph}</span> · <a href="/seal" aria-label="${escapeHtml(`Change your seal: you sign with ${meaning}, ${how}`)}">Change</a></p>
    </section>
    <div class="lantern-sky" aria-hidden="true"></div>
    <script src="/public/scroll.js" defer></script>
    <script src="/public/app.js" defer></script>`;
}

export interface SealPage {
  query: string;
  results: SealEntry[];
  suggestions: string[];
  claimed: Set<string>;
  token: string;
  error?: "taken" | "unknown";
  wanted?: string;
  justClaimed?: string;
  released?: boolean;
}

function sealResult(entry: SealEntry, page: SealPage, ownGlyph: string | undefined): string {
  const label = `<span class="result-glyph" lang="zh-Hant">${entry.glyph}</span> ${escapeHtml(entry.pinyin)}: ${escapeHtml(entry.gloss)}`;
  if (entry.glyph === ownGlyph) return `<li class="seal-result">${label} <em>— yours</em></li>`;
  if (page.claimed.has(entry.glyph)) return `<li class="seal-result seal-result--taken">${label} <em>— taken</em></li>`;
  return `<li class="seal-result">${label}
              <form method="post" action="/seal" class="claim-form">
                <input type="hidden" name="glyph" value="${entry.glyph}" />
                <input type="hidden" name="q" value="${escapeHtml(page.query)}" />
                <button type="submit" aria-label="Take ${entry.glyph}, ${escapeHtml(entry.pinyin)}: ${escapeHtml(entry.gloss)}">Take ${entry.glyph}</button>
              </form>
            </li>`;
}

export function renderSealChooser(page: SealPage): string {
  const own = currentSeal(page.token, claimOf(page.token));
  const ownGlyph = own.chosen ? own.entry.glyph : undefined;

  let notice = "";
  if (page.error === "taken" && page.wanted) {
    notice = `<p class="form-error" role="alert">Someone else already holds <span lang="zh-Hant">${escapeHtml(page.wanted)}</span>. Each seal belongs to one visitor at a time; here are others for the same word.</p>`;
  } else if (page.error === "unknown") {
    notice = `<p class="form-error" role="alert">That seal isn't in the dictionary.</p>`;
  } else if (page.justClaimed) {
    notice = `<p class="notice" role="status">From now on you sign with <span lang="zh-Hant">${escapeHtml(page.justClaimed)}</span>. Lines you've already written keep the seal they were written with.</p>`;
  } else if (page.released) {
    notice = `<p class="notice" role="status">Seal given up. You sign with your browser's random seal again.</p>`;
  }

  let results = "";
  if (page.query) {
    results =
      page.results.length > 0
        ? `<ul class="seal-results">${page.results.map((r) => sealResult(r, page, ownGlyph)).join("")}</ul>`
        : `<p>No seal for that word. Try ${page.suggestions
            .map((w) => `<a href="/seal?q=${encodeURIComponent(w)}">${escapeHtml(w)}</a>`)
            .join(", ")}.</p>`;
  }

  const body = `
      <div class="sheet sheet--colophons">
        ${header("choose a seal by meaning", true)}
        <main>
          <p>You sign with <strong><span lang="zh-Hant">${own.entry.glyph}</span></strong>
            (${escapeHtml(own.entry.pinyin)}: ${escapeHtml(own.entry.gloss)})${own.chosen ? ", the seal you chose." : ", given to your browser at random."}</p>
          <p class="section-note">Collectors carved a word they cared about onto their seals rather than
            always their names. Type an English word and choose from the characters that mean it. Each
            seal belongs to one visitor at a time, first come; your old lines keep the seal they were
            written with. It's remembered by this browser only: clear its cookies and the seal is gone.</p>
          ${notice}
          <form method="get" action="/seal" class="seal-search">
            <label for="q">A word in English</label>
            <input id="q" name="q" type="search" maxlength="40" value="${escapeHtml(page.query)}"
              autocomplete="off" spellcheck="true" />
            <button type="submit">Find a seal</button>
          </form>
          ${results}
          ${
            own.chosen
              ? `<form method="post" action="/seal" class="release-form">
            <input type="hidden" name="glyph" value="" />
            <button type="submit">Give up <span lang="zh-Hant">${own.entry.glyph}</span></button>
          </form>`
              : ""
          }
          <p><a href="/">Back to the scroll</a></p>
        </main>
      </div>
  `;
  return layout("Choose a seal — Colophon", body);
}

export function renderReadme(html: string, title = "About — Colophon", kicker = "what good means here"): string {
  const body = `
      <div class="sheet sheet--colophons">
        ${header(kicker, true)}
        <main class="prose">
          ${html}
        </main>
      </div>
  `;
  return layout(title, body);
}
