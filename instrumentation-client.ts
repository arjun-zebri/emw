import { reportClient } from "@/lib/observe/client";

// Errors nothing else caught, in any page of the site, the admin or the portal (lib/observe/client.ts).
// Errors a page's error boundary catches are reported from the boundary (app/**/error.tsx).
window.addEventListener("error", (event) => {
  // Only errors from our own scripts: a failed image or a script from another site has no error object.
  if (event.error) reportClient(event.error);
});
window.addEventListener("unhandledrejection", (event) => reportClient(event.reason));
