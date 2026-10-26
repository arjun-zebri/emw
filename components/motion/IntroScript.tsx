/*
 * Runs before first paint. Marks the document as JS-enabled (so reveal styles apply) and decides
 * whether the intro plays: on every full load of the landing page, and nowhere else.
 * data-intro="skip" means it never played on this load; MotionRuntime sets "seen" once
 * it has finished. Client-side navigations never replay it.
 */
const html = `(function(){var d=document.documentElement;d.classList.add("js");if(location.pathname!=="/")d.dataset.intro="skip"})()`;

export function IntroScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
