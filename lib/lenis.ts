import type Lenis from "lenis";

let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

/** Pause smooth scrolling while a drawer, menu or lightbox owns the viewport. */
export function lockScroll(locked: boolean) {
  if (locked) instance?.stop();
  else instance?.start();
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

/** Scroll to an element, smoothly where Lenis is running. The offset clears the fixed header. */
export function scrollToElement(el: HTMLElement, offset = 0) {
  if (instance) instance.scrollTo(el, { offset: -offset });
  else el.scrollIntoView({ block: "start" });
}
