// The page opens like a folding fan once per browser session, not after
// every posted colophon. Loaded in <head>, before the body paints: if this
// session has already seen the fan, the veil is switched off. With no
// script at all the fan plays on every load, and is still only CSS.
try {
  if (sessionStorage.getItem("colophon-fan")) document.documentElement.classList.add("fan-seen");
  else sessionStorage.setItem("colophon-fan", "1");
} catch {
  // storage blocked: let it play
}
