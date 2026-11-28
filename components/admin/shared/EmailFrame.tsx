"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

/** From, To and Subject above an email, as a mail client shows them. */
export function EmailHeader({ from, to, subject }: { from: string; to: string; subject: string }) {
  return (
    <dl className="mb-5 space-y-1 px-1 text-[0.8125rem]">
      <Field label="From">{from}</Field>
      <Field label="To">{to}</Field>
      <Field label="Subject" strong>
        {subject}
      </Field>
    </dl>
  );
}

function Field({ label, strong, children }: { label: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-ink-soft">{label}</dt>
      <dd className={clsx("min-w-0 truncate", strong ? "font-medium text-ink" : "text-ink-soft")}>{children}</dd>
    </div>
  );
}

/**
 * The email's own HTML, in a sandboxed frame so its styles stay its own. No scripts run in it;
 * links open in a new tab. The frame grows to the email's height as its images load.
 */
export function EmailFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(640);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | undefined;
    const fit = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      setHeight(doc.documentElement.scrollHeight);
      observer?.disconnect();
      observer = new ResizeObserver(() => setHeight(doc.documentElement.scrollHeight));
      observer.observe(doc.body);
    };
    frame.addEventListener("load", fit);
    fit();
    return () => {
      frame.removeEventListener("load", fit);
      observer?.disconnect();
    };
  }, [html]);

  return (
    <iframe
      ref={ref}
      title={title}
      srcDoc={html.replace(/<head>/i, '<head><base target="_blank">')}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="block w-full bg-paper shadow-[0_1px_2px_rgb(22_20_18/0.04),0_24px_48px_-28px_rgb(22_20_18/0.25)]"
      style={{ height }}
    />
  );
}
