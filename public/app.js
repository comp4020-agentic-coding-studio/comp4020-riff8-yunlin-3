// Colophon's progressive enhancement. The page is complete without this
// file: the form posts, the server redirects, a reload shows everything.
// With it, confirmed colophons from anyone arrive live over server-sent
// events, a line inks itself in as it's typed, and an accepted line rises
// away on a lantern. Every entry's HTML is rendered and escaped by the
// server; this script only places it. Anything a visitor typed is only ever
// put into the page with textContent.
(() => {
  "use strict";

  const config = { handoffMs: 2400, ...(window.colophonConfig ?? {}) };
  const MAX_LANTERNS = 5;
  const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  // The fan veil is hidden by its own final keyframe; with script it's also
  // removed, so nothing stays layered over the page.
  for (const el of document.querySelectorAll(".fan-veil, .fan-ribs")) {
    el.addEventListener("animationend", () => el.remove());
  }

  const list = document.querySelector(".colophon-list");
  if (!list) return;
  const sky = document.querySelector(".lantern-sky");

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

  const canFly = () => sky && !reducedMotion() && sky.childElementCount < MAX_LANTERNS;

  // A paper lantern: static markup only. The line and the seal go in
  // afterwards, through textContent.
  const LANTERN_SVG = `<svg viewBox="0 0 72 100" focusable="false">
    <path d="M24 4h24v6H24z" fill="#8a6440"/>
    <path d="M18 10h36c10 14 12 50 4 74H14C6 60 8 24 18 10z" fill="#f6e6c4" stroke="#b9a06a" stroke-width="1.5"/>
    <path d="M28 10c-3 24-3 50 0 74M44 10c3 24 3 50 0 74" stroke="#e0c99a" stroke-width="1" fill="none"/>
    <path d="M14 84h44v6H14z" fill="#8a6440"/>
    <path d="M30 90h12l-2 6h-8z" fill="#f1c27a"/>
  </svg>`;

  function launchLantern(from, { line, ink, seal, faint }) {
    const lantern = document.createElement("div");
    lantern.className = faint ? "lantern lantern--faint" : `lantern ${ink}`;
    lantern.innerHTML = LANTERN_SVG;
    if (!faint) {
      const text = document.createElement("div");
      text.className = "lantern-text";
      text.textContent = line;
      // Scaled to fit; whatever still doesn't fit is clipped with a soft fade
      // by CSS. The stored and listed colophon is always the whole line.
      const size = line.length <= 40 ? 0.68 : line.length <= 110 ? 0.55 : 0.45;
      text.style.setProperty("--lantern-size", `${size}rem`);
      lantern.append(text);
      const stamp = document.createElement("span");
      stamp.className = "lantern-seal";
      stamp.textContent = seal;
      lantern.append(stamp);
    }
    sky.append(lantern);
    const w = lantern.offsetWidth || 72;
    const h = lantern.offsetHeight || 100;
    const x = Math.max(4, Math.min(window.innerWidth - w - 4, from.x - w / 2));
    const y = from.y - h;
    lantern.style.left = `${x}px`;
    lantern.style.top = `${y}px`;
    lantern.style.setProperty("--rise", `${Math.max(120, y + h)}px`);
    const room = Math.min(40, window.innerWidth - w - 4 - x, x - 4);
    lantern.style.setProperty("--drift", `${Math.round((Math.random() * 2 - 1) * Math.max(0, room))}px`);
    const remove = () => lantern.remove();
    lantern.addEventListener("animationend", remove);
    setTimeout(remove, faint ? 7500 : 4500);
    return lantern;
  }

  // Ids of this page's own accepted lines, held back from the live stream
  // until the lantern hands them over.
  const reserved = new Set();
  let inFlight = false;
  const queued = [];

  function onLive(data) {
    if (inFlight) {
      queued.push(data);
      return;
    }
    if (reserved.has(data.id)) return;
    const li = arrive(data);
    // Someone else's line landed: one small, faint lantern, carrying nothing.
    if (li && canFly()) {
      launchLantern({ x: window.innerWidth * (0.15 + Math.random() * 0.7), y: window.innerHeight + 40 }, { faint: true });
    }
  }

  window.colophon = { arrive, placeEntry, onLive };

  const form = document.querySelector(".write-form");
  if (form) enhanceForm(form);

  function enhanceForm(form) {
    const textarea = form.querySelector("textarea");
    const well = form.querySelector(".inkwell");
    const count = document.getElementById("body-count");
    const button = form.querySelector("button[type=submit]");
    const max = Number(textarea.maxLength) || 320;

    // Ink-in: a mirror behind a transparent textarea, one span per
    // character. New characters soak in; deleted ones blot out where they
    // stood. Nothing here is sent anywhere.
    const mirror = document.createElement("div");
    mirror.className = "inkwell-mirror";
    mirror.setAttribute("aria-hidden", "true");
    const tail = document.createTextNode("\u200b");
    mirror.append(tail);
    well.append(mirror);
    well.classList.add("inkwell--live");

    let chars = [];
    let spans = [];

    function blot(span) {
      if (reducedMotion() || !span.isConnected) return;
      const mark = document.createElement("span");
      mark.className = "ink-blot";
      mark.textContent = span.textContent;
      mark.style.left = `${span.offsetLeft}px`;
      mark.style.top = `${span.offsetTop}px`;
      mirror.append(mark);
      const remove = () => mark.remove();
      mark.addEventListener("animationend", remove);
      setTimeout(remove, 1000);
    }

    function renderInk() {
      const next = Array.from(textarea.value);
      let start = 0;
      while (start < chars.length && start < next.length && chars[start] === next[start]) start++;
      let end = 0;
      while (
        end < chars.length - start &&
        end < next.length - start &&
        chars[chars.length - 1 - end] === next[next.length - 1 - end]
      ) end++;

      const gone = spans.slice(start, chars.length - end);
      for (const span of gone) blot(span);
      for (const span of gone) span.remove();

      const anchor = spans[chars.length - end] ?? tail;
      const added = next.slice(start, next.length - end).map((ch) => {
        const span = document.createElement("span");
        span.textContent = ch;
        if (!reducedMotion()) span.className = "ink-ch";
        mirror.insertBefore(span, anchor);
        return span;
      });
      spans = [...spans.slice(0, start), ...added, ...spans.slice(chars.length - end)];
      chars = next;

      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight + 2}px`;
      mirror.scrollTop = textarea.scrollTop;
      if (count) {
        const left = max - textarea.value.length;
        count.textContent = `${left} of ${max} characters left.`;
      }
    }

    function clearInk() {
      for (const span of spans) span.remove();
      for (const mark of mirror.querySelectorAll(".ink-blot")) mark.remove();
      spans = [];
      chars = [];
      textarea.value = "";
      renderInk();
    }

    textarea.addEventListener("input", renderInk);
    textarea.addEventListener("scroll", () => (mirror.scrollTop = textarea.scrollTop));
    renderInk();

    function showError(message) {
      let error = form.parentElement.querySelector(".form-error");
      if (!error) {
        error = document.createElement("p");
        error.className = "form-error";
        error.setAttribute("role", "alert");
        form.before(error);
      }
      error.textContent = message;
    }

    function clearError() {
      form.parentElement.querySelector(".form-error")?.remove();
    }

    function accepted(data) {
      clearError();
      const line = textarea.value;
      const inkKey = form.querySelector("input[name=ink]:checked")?.value;
      const ink = `ink--${inkKey ?? "mo-lan"}`;
      const seal = form.dataset.ownSeal ?? "";

      if (canFly()) {
        // The line leaves the writing area for the lantern only now that
        // the server has it; the entry appears as the lantern goes.
        reserved.add(data.id);
        const rect = button.getBoundingClientRect();
        launchLantern({ x: rect.left + rect.width / 2, y: rect.top }, { line, ink, seal });
        clearInk();
        setTimeout(() => {
          reserved.delete(data.id);
          arrive(data);
        }, config.handoffMs);
      } else {
        clearInk();
        arrive(data);
      }
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (inFlight) return;
      inFlight = true;
      button.disabled = true;
      try {
        const res = await fetch(form.action, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(new FormData(form)).toString(),
          credentials: "same-origin",
        });
        if (res.status === 201) {
          accepted(await res.json());
        } else if (res.status === 422) {
          showError((await res.json()).message);
        } else if (res.status === 413) {
          showError(`Keep it to ${max} characters — the margin is not infinite.`);
        } else {
          showError("Something went wrong and nothing was written. Your line is still here; try again.");
        }
      } catch {
        showError("Couldn't reach the scroll, so nothing was written. Your line is still here; try again.");
      } finally {
        inFlight = false;
        button.disabled = false;
        for (const data of queued.splice(0)) onLive(data);
      }
    });
  }

  if (typeof window.EventSource !== "function") return;

  // ?after= is the newest entry the server rendered, so anything written
  // between that render and this connect is replayed; on a reconnect the
  // browser sends Last-Event-ID itself and the server replays what was missed.
  const after = Number(list.dataset.lastId) || 0;
  const source = new EventSource(`/events?after=${after}`);
  source.addEventListener("colophon", (event) => onLive(JSON.parse(event.data)));
  source.addEventListener("reload", () => window.location.reload());
})();
