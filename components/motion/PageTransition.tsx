import { ViewTransition } from "react";

/** Every page fades and rises in; see the ::view-transition rules in globals.css. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      {children}
    </ViewTransition>
  );
}
