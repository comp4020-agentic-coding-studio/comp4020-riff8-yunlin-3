// Colophon's progressive enhancement. The page is complete without this
// file: the form posts, the server redirects, a reload shows everything.
// With it, confirmed colophons from anyone arrive live over server-sent
// events. Every entry's HTML is rendered and escaped by the server; this
// script only places it.
(() => {
  "use strict";

  const list = document.querySelector(".colophon-list");
  if (!list) return;

  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  function fragment(html) {
    const template = document.createElement("template");
    template.innerHTML = html; // server-rendered, body already escaped
    return template.content.firstElementChild;
  }

  // Entries keep the server's order (by id) wherever they arrive from, and an
  // id already on the page is never inserted twice.
  function placeEntry(id, html) {
    if (list.querySelector(`[data-id="${id}"]`)) return null;
    const li = fragment(html);
    if (!li) return null;
    const later = [...list.children].find((el) => Number(el.dataset.id) > id);
    list.insertBefore(li, later ?? null);
    document.querySelector(".empty-note")?.remove();
    if (!reducedMotion()) li.classList.add("colophon--arriving");
    return li;
  }

  function placeLegend(html) {
    const ul = document.querySelector(".seal-legend ul");
    const item = html && fragment(html);
    if (!ul || !item || ul.querySelector(`[data-glyph="${item.dataset.glyph}"]`)) return;
    ul.append(item);
  }

  function arrive(data) {
    const li = placeEntry(data.id, data.html);
    if (li) placeLegend(data.legend);
    return li;
  }

  window.colophon = { arrive, placeEntry, placeLegend, reducedMotion, fragment };

  if (typeof window.EventSource !== "function") return;

  // ?after= is the newest entry the server rendered, so anything written
  // between that render and this connect is replayed; on a reconnect the
  // browser sends Last-Event-ID itself and the server replays what was missed.
  const after = Number(list.dataset.lastId) || 0;
  const source = new EventSource(`/events?after=${after}`);
  source.addEventListener("colophon", (event) => {
    const data = JSON.parse(event.data);
    if (window.colophon.onLive) window.colophon.onLive(data);
    else arrive(data);
  });
  source.addEventListener("reload", () => window.location.reload());
})();
