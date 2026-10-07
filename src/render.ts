import { existsSync, readFileSync } from "node:fs";
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

// The watercolour is one hand-written SVG file: inlined here as the painting,
// and referenced from the stylesheet as the header wash, so there's one copy.
const PAINTING = existsSync("public/painting.svg") ? readFileSync("public/painting.svg", "utf8") : "";

// Small pieces cut from the painting's own vocabulary: a spruce and a
// boulder, for dividers and the corner of the writing form. Decorative only.
const SPRUCE = `<svg class="ornament ornament--spruce" viewBox="0 0 40 64" aria-hidden="true" focusable="false"><g fill="#3d5a3a" fill-opacity=".55"><path d="M20 2 27 16 23 15 30 27 25 26 34 40 26 39 37 54 3 54 14 39 6 40 15 26 10 27 17 15 13 16Z"/></g><path d="M20 50v12" stroke="#5b4630" stroke-opacity=".6" stroke-width="2"/></svg>`;
const BOULDER = `<svg class="ornament ornament--boulder" viewBox="0 0 64 36" aria-hidden="true" focusable="false"><path d="M4 34 9 18 20 8 36 5 50 11 60 24 61 34Z" fill="#8a8378" fill-opacity=".45" stroke="#3c2d1e" stroke-opacity=".18"/><path d="M14 16 30 7 44 9 50 13 36 12 22 17Z" fill="#7b9a5a" fill-opacity=".5"/><path d="M24 24l8-6m6 10 7-8" stroke="#3c2d1e" stroke-opacity=".2" fill="none"/></svg>`;

function divider(): string {
  return `<div class="divider" aria-hidden="true">${SPRUCE}${BOULDER}${SPRUCE}</div>`;
}

function layout(title: string, body: string): string {
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
    <script src="/public/fan.js"></script>
  </head>
  <body>
    <div class="fan-veil" aria-hidden="true"></div>
    <div class="fan-ribs" aria-hidden="true"></div>
    <div class="mount">
      <div class="roller roller--top" aria-hidden="true"></div>
      <div class="mount-silk">
        ${body}
      </div>
      <div class="roller roller--bottom" aria-hidden="true"></div>
    </div>
  </body>
</html>
`;
}

function header(kicker: string, linkHome: boolean): string {
  const title = linkHome ? `<a href="/">Colophon</a>` : "Colophon";
  return `<header class="site-header">
          <p class="title-accent" lang="zh-Hant" aria-hidden="true">題記</p>
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
        ${sealMark(entrySeal(c))}
        <p class="colophon-body">${escapeHtml(c.body)}</p>
        <p class="colophon-date">${dateFmt.format(new Date(c.created_at))}${mine ? " — yours" : ""}</p>
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
  return `<aside class="seal-legend" aria-labelledby="legend-heading">
          <h3 id="legend-heading">Seals on this scroll</h3>
          <ul>${[...seen.values()].map(legendItem).join("")}</ul>
        </aside>`;
}

const ERRORS: Record<string, string> = {
  empty: "A colophon needs at least a few words.",
  long: `Keep it to ${MAX_BODY_LENGTH} characters — the margin is not infinite.`,
  ink: "Choose one of the inks on the list.",
};

export function errorMessage(code: string | undefined): string | undefined {
  return code ? ERRORS[code] : undefined;
}

function inkSwatches(): string {
  return INKS.map(
    (ink) => `<label class="swatch ${inkClass(ink.key)}">
              <input type="radio" name="ink" value="${ink.key}"${ink.key === DEFAULT_INK ? " checked" : ""} />
              <span class="swatch-chip" aria-hidden="true"></span>
              <span><span lang="zh-Hant">${ink.hanzi}</span> ${escapeHtml(ink.name)}</span>
            </label>`,
  ).join("\n            ");
}

export function renderIndex(colophons: Colophon[], ownToken: string, error?: string): string {
  const message = errorMessage(error);
  const own = currentSeal(ownToken, claimOf(ownToken));
  const lastId = colophons.at(-1)?.id ?? 0;

  const body = `
      <div class="sheet sheet--painting">
        ${header("a shared margin on one painting", false)}
        <figure class="painting">
          <div class="painting-frame">${PAINTING}</div>
          <figcaption>Spruce, granite and a path, in watercolour: the painting this margin is mounted beside.</figcaption>
        </figure>
      </div>

      <div class="sheet sheet--colophons">
        <main>
          <figure class="scroll-frame">
            <div class="scroll-scroller" tabindex="0" role="img"
                 aria-label="A handscroll painting: Wang Yi's 1363 portrait of Yang Zhuxi standing under a pine, with Ni Zan's rocks and pine, flanked by six and a half centuries of collectors' colophons and seals.">
              <img src="/public/scroll.avif" alt="" />
            </div>
            <figcaption>
              The tradition this margin borrows from: Wang Yi, <cite>Portrait of Yang Zhuxi</cite>, 1363 —
              Ni Zan painted the pine and rock. Palace Museum, Beijing. Scroll sideways to see six and a
              half centuries of colophons already written into its margins.
            </figcaption>
          </figure>

          ${divider()}

          <section aria-labelledby="colophons-heading">
            <h2 id="colophons-heading">Colophons</h2>
            <p class="section-note">
              Oldest first, the way a scroll unrolls. New lines appear here as they're written,
              wherever they're written from. Yours is marked once it's here — nothing you write can be
              edited or taken back, the same as ink. Tap a seal to read its meaning.
            </p>
            <ol class="colophon-list" data-last-id="${lastId}">
              ${colophons.map((c) => colophonEntry(c, ownToken)).join("\n              ")}
            </ol>
            ${colophons.length === 0 ? `<p class="empty-note">No one has written in the margin yet.</p>` : ""}
            ${legend(colophons)}
          </section>

          ${divider()}

          <section aria-labelledby="write-heading" class="write">
            <h2 id="write-heading">Add yours</h2>
            ${message ? `<p class="form-error" role="alert">${escapeHtml(message)}</p>` : ""}
            <form method="post" action="/colophons" class="write-form" data-own-seal="${own.entry.glyph}">
              <label for="body">A line for the margin</label>
              <div class="inkwell">
                <textarea id="body" name="body" maxlength="${MAX_BODY_LENGTH}" rows="3" required
                  aria-describedby="body-count"></textarea>
              </div>
              <p id="body-count" class="count">Up to ${MAX_BODY_LENGTH} characters.</p>
              <fieldset class="inks">
                <legend>Ink</legend>
                ${inkSwatches()}
              </fieldset>
              <div class="write-actions">
                <button type="submit">Write it in</button>
                ${BOULDER}
              </div>
            </form>
          </section>
        </main>
        <footer>
          <p>You sign with <strong><span lang="zh-Hant">${own.entry.glyph}</span></strong>
            (${escapeHtml(own.entry.pinyin)}: ${escapeHtml(own.entry.gloss)})${
              own.chosen ? ", the seal you chose" : ", given to your browser at random"
            } — remembered by your browser, not by a name.
            <a href="/seal">${own.chosen ? "Change your seal" : "Choose a seal by meaning"}</a>.</p>
        </footer>
      </div>
      <div class="lantern-sky" aria-hidden="true"></div>
      <script src="/public/app.js" defer></script>
  `;

  return layout("Colophon", body);
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
