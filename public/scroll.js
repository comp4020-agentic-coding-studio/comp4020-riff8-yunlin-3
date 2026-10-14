// The handscroll's motion, as an enhancement on a native overflow-x
// scroller (public/scroll.css). Without this file the scroll still opens at
// the newest line and scrolls by touch, trackpad, scrollbar and arrow keys.
//
// Direction: the list is newest first, so scrollLeft 0 is the newest end and
// scrollLeft grows toward the oldest. A vertical wheel reads on: wheel down
// moves to older lines (scrollLeft up), wheel up back toward the newest, the
// way scrolling down a page moves later into it. Arrow keys are spatial
// (Right shows what is to the right, which is older); PageDown matches the
// wheel. Home is the newest end, End the oldest.
//
// Touch is never handled here: it keeps native momentum. Horizontal trackpad
// gestures pass straight through. Every listener but wheel and keydown is
// passive; all motion is written in requestAnimationFrame. Under
// prefers-reduced-motion every move is instant.
//
// app.js calls beforeArrive() before inserting a live line and
// afterArrive(state, li) after, so a reader elsewhere stays exactly where
// they were and a reader at the newest end sees the new line glide in.
(() => {
  const scroller = document.querySelector("[data-scroll]");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => motion.matches;

  const noop = { atNewest: () => true, beforeArrive: () => null, afterArrive() {}, toNewest() {}, toEntry() {} };
  if (!scroller) {
    window.colophonScroll = noop;
    return;
  }

  const maxLeft = () => scroller.scrollWidth - scroller.clientWidth;
  const clamp = (x) => Math.max(0, Math.min(maxLeft(), x));
  // Each sheet's own left and right edge in scroll coordinates, newest
  // first (visual order, left to right). Sheets differ in width
  // (short, mid, long), so nothing assumes one sheet width. Read once per
  // layout change by layout() below, never per scroll frame.
  let starts = new Float64Array(0);
  let ends = new Float64Array(0);
  let mids = new Float64Array(0);
  // First index whose value is > x (values ascending).
  const above = (arr, x) => {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] > x) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };
  // The next sheet edge beyond x in either direction, for arrow keys.
  const nextEdge = (x, dir) => {
    if (!starts.length) return x + dir * 288;
    // Edges within the list's own padding of x count as "here".
    const slack = (starts[0] ?? 0) + 2;
    if (dir > 0) {
      const i = above(starts, x + slack);
      return i < starts.length ? starts[i] : maxLeft();
    }
    const i = above(starts, x - slack) - 1;
    return i > 0 ? starts[i] : 0;
  };

  // One animator for wheel, keys and jumps: an exponential glide toward a
  // target that further input can keep moving. pos is kept as a float so
  // small eased steps don't stall on scrollLeft's rounding.
  let target = 0;
  let pos = 0;
  let written = -1;
  let frame = 0;
  let last = 0;
  const TAU = 110; // ms; larger is silkier and slower to settle

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const step = (now) => {
    // Someone else moved the scroll (touch, scrollbar, trackpad): yield.
    if (written >= 0 && Math.abs(scroller.scrollLeft - written) > 2) {
      stop();
      return;
    }
    const dt = Math.min(64, now - (last || now - 16));
    last = now;
    pos += (target - pos) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(target - pos) < 0.5) pos = target;
    scroller.scrollLeft = pos;
    written = scroller.scrollLeft;
    frame = pos === target ? 0 : requestAnimationFrame(step);
  };

  const moveTo = (x, { instant = false } = {}) => {
    target = clamp(x);
    if (instant || reduced()) {
      stop();
      scroller.scrollLeft = target;
      return;
    }
    if (!frame) {
      pos = scroller.scrollLeft;
      written = pos;
      last = 0;
      frame = requestAnimationFrame(step);
    }
  };

  const moveBy = (dx) => moveTo((frame ? target : scroller.scrollLeft) + dx);

  // Wheel: map a mostly-vertical wheel onto the scroll's length, only when
  // the scroll can actually move that way, so the page keeps the gesture at
  // either end. Small pixel deltas are trackpad fingers that already carry
  // their own smoothing; they apply directly instead of being eased twice.
  scroller.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const body = event.target.closest?.(".colophon-body");
      if (body && body.scrollHeight > body.clientHeight + 1) {
        const down = event.deltaY > 0;
        const room = down ? body.scrollTop + body.clientHeight < body.scrollHeight - 1 : body.scrollTop > 0;
        if (room) return; // let a long line scroll inside its own sheet first
      }
      const unit = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? scroller.clientWidth : 1;
      const dx = event.deltaY * unit;
      const from = frame ? target : scroller.scrollLeft;
      if ((dx > 0 && from >= maxLeft() - 1) || (dx < 0 && from <= 0)) return;
      event.preventDefault();
      if (event.deltaMode === 0 && Math.abs(dx) < 40) {
        stop();
        scroller.scrollLeft = clamp(scroller.scrollLeft + dx);
        return;
      }
      moveBy(dx);
    },
    { passive: false },
  );

  scroller.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // Form controls keep their keys. Links and seal summaries inside the
    // scroll keep Enter and Space (never handled here); arrows, pages,
    // Home and End still move the scroll from them.
    if (event.target.closest?.("input, textarea, select, button, [contenteditable]")) return;
    const page = scroller.clientWidth * 0.85;
    const moves = {
      ArrowRight: () => moveTo(nextEdge(frame ? target : scroller.scrollLeft, 1)),
      ArrowLeft: () => moveTo(nextEdge(frame ? target : scroller.scrollLeft, -1)),
      PageDown: () => moveBy(page),
      PageUp: () => moveBy(-page),
      Home: () => moveTo(0),
      End: () => moveTo(maxLeft()),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  });

  // At the newest end: the newest sheet still at least partly in view.
  const atNewest = () => scroller.scrollLeft <= (ends.length ? ends[0] : 288);

  const beforeArrive = () => ({
    atNewest: atNewest(),
    scrollLeft: scroller.scrollLeft,
    scrollWidth: scroller.scrollWidth,
  });

  const afterArrive = (state, li) => {
    if (!state) return;
    const grew = scroller.scrollWidth - state.scrollWidth;
    if (!state.atNewest) {
      // Reading elsewhere: a sheet inserted before the view's start pushed
      // what's in view right by its width; push the view the same distance,
      // in the same frame. A sheet landing to the right of the view (an own
      // line held back while newer ones arrived) moves nothing in view.
      const before = !li || li.offsetLeft < state.scrollLeft;
      if (before) {
        const moving = frame !== 0;
        scroller.scrollLeft = state.scrollLeft + grew;
        if (moving) {
          pos += grew;
          target += grew;
          written = scroller.scrollLeft;
        }
      }
      // Your own line: you asked for it, so go and watch it land.
      if (li?.classList.contains("colophon--mine") && li.dataset.id) toEntry(li.dataset.id);
      return;
    }
    if (reduced()) {
      stop();
      scroller.scrollLeft = 0;
      return;
    }
    // At the newest end: hold the old view for a frame, then glide left to
    // bring the new line in.
    stop();
    scroller.scrollLeft = state.scrollLeft + grew;
    moveTo(0);
  };

  const toNewest = () => moveTo(0);

  const toEntry = (id) => {
    const li = document.getElementById(`c-${id}`);
    if (!li || !scroller.contains(li)) return;
    const s = scroller.getBoundingClientRect();
    const r = li.getBoundingClientRect();
    moveTo(scroller.scrollLeft + (r.left - s.left) - (s.width - r.width) / 2);
    li.classList.remove("colophon--target");
    void li.offsetWidth;
    li.classList.add("colophon--target");
    setTimeout(() => li.classList.remove("colophon--target"), reduced() ? 4000 : 2600);
  };

  // Band height: the room between the top of the scroll and the dock, so the
  // scroll fills the first screen (scroll.css caps it at the tallest sheet).
  const band = scroller.closest(".handscroll");
  const dock = document.querySelector(".dock");
  let measuring = 0;
  const measure = () => {
    measuring = 0;
    if (!band) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const top = band.getBoundingClientRect().top + window.scrollY;
    const chrome = band.offsetHeight - scroller.offsetHeight;
    const avail = window.innerHeight - top - (dock?.offsetHeight ?? 0) - chrome - 2 * rem;
    band.style.setProperty("--band-avail", `${Math.round(avail)}px`);
  };
  const remeasure = () => {
    if (!measuring) measuring = requestAnimationFrame(measure);
  };
  measure();
  window.addEventListener("resize", remeasure, { passive: true });
  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(remeasure);
    if (dock) ro.observe(dock);
    const header = document.querySelector(".site-header");
    if (header) ro.observe(header);
  }

  // The overview strip (contract O): a map of the whole scroll under it,
  // left edge = newest end, with a window showing what's in view and a
  // --seal tick for each of the visitor's own lines. Pointer only: the strip
  // is aria-hidden, and the cue line under it says the same in words.
  //
  // Numbering runs oldest = 1, the order the lines were written in, so a
  // line's number never changes when new ones arrive at the newest end.
  //
  // Geometry is read from the DOM only on a layout change (load, resize, an
  // arrival); a scroll frame does arithmetic on those numbers and writes one
  // transform and, when it changes, one text node.
  const strip = document.querySelector(".scroll-overview");
  const win = strip?.querySelector(".scroll-overview-window");
  const cue = document.querySelector(".scroll-cue");
  const list = scroller.querySelector(".colophon-list");
  const fmt = new Intl.NumberFormat("en-AU");
  const geo = { mine: 0, count: 0, scrollWidth: 1, clientWidth: 1, stripWidth: 0, winWidth: 0 };
  let cueText = "";
  let painting = 0;

  const paint = () => {
    painting = 0;
    const left = scroller.scrollLeft;
    if (win && geo.stripWidth) {
      const x = (left / geo.scrollWidth) * geo.stripWidth;
      win.style.transform = `translateX(${Math.min(x, geo.stripWidth - geo.winWidth).toFixed(1)}px)`;
    }
    if (cue && geo.count) {
      // k counts sheets from the newest end; a sheet counts once its middle
      // is in view. Two binary searches over the cached midpoints.
      const n = mids.length;
      const first = Math.min(n - 1, above(mids, left - 0.5));
      const last = Math.max(first, Math.min(n - 1, above(mids, left + geo.clientWidth) - 1));
      const hi = geo.count - first;
      const lo = geo.count - last;
      const range = hi === lo ? `Line ${fmt.format(hi)}` : `Lines ${fmt.format(lo)}–${fmt.format(hi)}`;
      const text = `${range} of ${fmt.format(geo.count)} · newest at the left${geo.mine ? " · yours in red" : ""}`;
      if (text !== cueText) {
        cue.textContent = text;
        cueText = text;
      }
    }
  };
  const repaint = () => {
    if (!painting) painting = requestAnimationFrame(paint);
  };

  const layout = () => {
    const items = list ? list.children : [];
    geo.count = items.length;
    starts = new Float64Array(items.length);
    ends = new Float64Array(items.length);
    mids = new Float64Array(items.length);
    // Visual order regardless of DOM order: newest-first DOM (D10) reads
    // straight through; an oldest-first list would read backwards.
    const n = items.length;
    const backwards = n > 1 && items[0].offsetLeft > items[n - 1].offsetLeft;
    for (let i = 0; i < n; i++) {
      const li = items[backwards ? n - 1 - i : i];
      starts[i] = li.offsetLeft;
      ends[i] = li.offsetLeft + li.offsetWidth;
      mids[i] = (starts[i] + ends[i]) / 2;
    }
    geo.scrollWidth = scroller.scrollWidth || 1;
    geo.clientWidth = scroller.clientWidth;
    if (strip && win) {
      geo.stripWidth = strip.clientWidth;
      win.style.width = `${((geo.clientWidth / geo.scrollWidth) * 100).toFixed(3)}%`;
      geo.winWidth = win.offsetWidth;
      // Own lines as ticks. Lines closer than MERGE_PX on the strip share
      // one tick spanning them, so a run of lines reads as a run, not a blur.
      const MERGE_PX = 4;
      const xs = [];
      for (const li of scroller.querySelectorAll(".colophon--mine")) {
        xs.push(((li.offsetLeft + li.offsetWidth / 2) / geo.scrollWidth) * geo.stripWidth);
      }
      geo.mine = xs.length;
      xs.sort((a, b) => a - b);
      const runs = [];
      for (const x of xs) {
        const run = runs[runs.length - 1];
        if (run && x - run[1] < MERGE_PX) {
          run[1] = x;
          run[2]++;
        } else runs.push([x, x, 1]);
      }
      // A run is 2px for one line, a pixel wider per extra line up to 8px,
      // centred on its lines and kept inside the strip's gilt edge.
      const ticks = runs.map(([a, b, n]) => {
        const w = Math.max(b - a + 2, Math.min(2 + (n - 1), 8));
        const left = Math.max(1, Math.min(geo.stripWidth - w - 1, (a + b) / 2 - w / 2));
        const tick = document.createElement("span");
        tick.className = "scroll-overview-tick";
        tick.style.left = `${left.toFixed(1)}px`;
        tick.style.width = `${w.toFixed(1)}px`;
        return tick;
      });
      for (const old of strip.querySelectorAll(".scroll-overview-tick")) old.remove();
      strip.append(...ticks);
    }
    // Rendered hidden on an empty scroll; shown from the first line on.
    if (strip) strip.hidden = !geo.count;
    if (cue) cue.hidden = !geo.count;
    if (cue && !geo.count) cueText = "";
    paint();
  };
  let laying = 0;
  const relayout = () => {
    if (!laying)
      laying = requestAnimationFrame(() => {
        laying = 0;
        layout();
      });
  };

  scroller.addEventListener("scroll", repaint, { passive: true });
  window.addEventListener("resize", relayout, { passive: true });
  if ("ResizeObserver" in window) {
    // The list grows on every arrival; the scroller and strip change with
    // the viewport and the band height.
    const ro = new ResizeObserver(relayout);
    ro.observe(scroller);
    if (list) ro.observe(list);
    if (strip) ro.observe(strip);
  }
  // An arrival doesn't always resize anything (a short list fills the paper
  // at min-width: 100%), so watch the list itself for new lines too.
  if (list && "MutationObserver" in window) new MutationObserver(relayout).observe(list, { childList: true });
  layout();

  if (strip) {
    strip.title = "Jump along the scroll";
    // Click or drag: centre the view on the pointer. Primary button only;
    // the gesture belongs to one pointer and ends however that pointer ends.
    let dragging = null;
    const jump = (event) => {
      const r = strip.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (event.clientX - r.left) / r.width));
      moveTo(f * scroller.scrollWidth - scroller.clientWidth / 2);
    };
    strip.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || dragging !== null) return;
      dragging = event.pointerId;
      strip.setPointerCapture?.(event.pointerId);
      jump(event);
    });
    strip.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerId === dragging) jump(event);
      },
      { passive: true },
    );
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      strip.addEventListener(
        type,
        (event) => {
          if (event.pointerId === dragging) dragging = null;
        },
        { passive: true },
      );
    }
  }

  const fromHash = () => {
    const m = /^#c-(\d+)$/.exec(location.hash);
    if (m) toEntry(m[1]);
    return Boolean(m && document.getElementById(`c-${m[1]}`));
  };
  // The browser's own fragment jump scrolls the page so the sheet's top is
  // at the window's top, cutting off the band and the header above it. The
  // scroll is the first thing on the page, so undo that jump: once on a
  // permalinked load, and on each hash navigation to a line. A reader's
  // own page scrolling is never touched.
  const unjump = () => {
    const top = band?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollTo(0, 0);
  };
  window.addEventListener(
    "hashchange",
    () => {
      if (fromHash()) unjump();
    },
    { passive: true },
  );
  // Back or Forward to an entry without a line hash (the page before a date
  // link was followed): return to where the reader was then. A #c- hash is
  // handled by hashchange above.
  window.addEventListener("popstate", (event) => {
    if (/^#c-\d+$/.test(location.hash)) return;
    const left = event.state?.scrollLeft;
    if (typeof left === "number") moveTo(left);
  });
  // A link to a line already on the page (a sheet's date, a permalink in
  // the dock's status) glides along the scroll instead of letting the
  // browser jump the page and the scroller in one step. Modified clicks
  // (new tab, new window) and links elsewhere are left to the browser.
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const a = event.target.closest?.("a[href]");
    if (!a || a.target) return;
    const url = new URL(a.href, location.href);
    const m = /^#c-(\d+)$/.exec(url.hash);
    if (!m || url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
    if (!document.getElementById(`c-${m[1]}`)) return;
    event.preventDefault();
    if (location.hash !== url.hash) {
      history.replaceState({ ...history.state, scrollLeft: scroller.scrollLeft }, "");
      history.pushState({ scrollLeft: null }, "", url.hash);
    }
    toEntry(m[1]);
  });
  // After layout settles (fonts, band height), so the centring is right.
  // On a permalinked load the browser has already jumped the page down to
  // the fragment; the scroll is the first thing on the page, so put the
  // page back at the top once, and let the glide do the rest.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (fromHash()) unjump();
    }),
  );

  window.colophonScroll = { atNewest, beforeArrive, afterArrive, toNewest, toEntry };
})();
