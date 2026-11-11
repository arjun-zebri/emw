import clsx from "clsx";

/** Fields that look like the text they become: no box, no line, a caret. */
export const bare = "block w-full border-0 bg-transparent p-0 text-ink focus:outline-none";
export const rowInput = clsx(bare, "text-[0.9375rem] placeholder:text-ink-mute/45");

/**
 * A line of the vendor page's details table (a label, then the value), used to edit in place. Put
 * them in a `<dl className="border-t hairline">`. The rule darkens while you're in the row.
 */
export function DetailRow({ label, htmlFor, aside, plain, children }: { label: string; htmlFor?: string; aside?: React.ReactNode; plain?: boolean; children: React.ReactNode }) {
  return (
    // `plain`: no rule under the row, for a list whose sections are split by one rule instead.
    <div className={clsx("grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4", plain ? "py-2.5" : "border-b hairline py-3.5 transition-colors duration-300 focus-within:border-ink")}>
      <dt className="t-small pt-px">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : label}
        {aside && <span className="mt-0.5 block text-[0.75rem]">{aside}</span>}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
