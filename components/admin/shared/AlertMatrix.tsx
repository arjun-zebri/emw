"use client";

import clsx from "clsx";
import { Icon } from "@/components/icons/Icon";
import { channelLabels, type AlertDef, type Channel } from "@/lib/admin/alerts";

/** A custom checkbox, square like the rest of the site: a hairline box when off, ink with a fine tick when on. */
export function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "group/check relative flex size-[18px] items-center justify-center transition-all duration-300 ease-out-expo active:scale-90 disabled:cursor-not-allowed disabled:opacity-30",
        checked
          ? "bg-ink shadow-[0_1px_2px_rgb(22_20_18/0.25)]"
          : "bg-surface shadow-[inset_0_0_0_1px_rgb(22_20_18/0.16)] hover:shadow-[inset_0_0_0_1px_rgb(22_20_18/0.45)]",
      )}
    >
      <svg viewBox="0 0 16 16" className={clsx("size-3 text-paper transition-all duration-300 ease-out-expo", checked ? "scale-100 opacity-100" : "scale-50 opacity-0")} aria-hidden>
        <path d="M3.5 8.4 6.6 11.4 12.5 4.8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export type MatrixGroup = { title: string; alerts: AlertDef[] };

/**
 * Personal alert settings as one table to scan: what happened down the side, how you hear about it
 * across the top. A column that's switched off above (no phone number, SMS paused) is dimmed.
 */
export function AlertMatrix({
  groups,
  channels,
  isOn,
  set,
  channelOff,
  onPreview,
}: {
  groups: MatrixGroup[];
  channels: Channel[];
  isOn: (a: AlertDef, c: Channel) => boolean;
  set: (a: AlertDef, c: Channel, on: boolean) => void;
  channelOff?: (c: Channel) => boolean;
  onPreview?: (a: AlertDef) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr>
            <th className="px-6 pb-3 text-[0.8125rem] font-normal text-ink-mute">Tell me when</th>
            {channels.map((c) => (
              <th key={c} className={clsx("w-24 pb-3 text-center text-[0.8125rem] font-normal text-ink-mute transition-opacity", channelOff?.(c) && "opacity-40")}>
                {channelLabels[c] === "In the portal" ? "In-app" : channelLabels[c]}
              </th>
            ))}
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.title}>
            <tr>
              <th colSpan={channels.length + 1} className="border-t border-ink/[0.06] bg-paper/60 px-6 py-2.5 text-[0.75rem] font-medium text-ink-soft">
                {g.title}
              </th>
            </tr>
            {g.alerts.map((a) => (
              <tr key={a.id} className="group border-t border-ink/[0.06]">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.9375rem] text-ink">{a.title}</span>
                    {onPreview && a.channels.includes("email") && (
                      <button
                        type="button"
                        onClick={() => onPreview(a)}
                        className="flex items-center gap-1 text-[0.75rem] text-ink-mute opacity-0 transition-opacity group-hover:opacity-100 hover:text-ink focus:opacity-100"
                      >
                        <Icon name="eye" className="size-3.5" strokeWidth={1.4} />
                        Preview
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 text-[0.8125rem] text-ink-mute">{a.when}</p>
                </td>
                {channels.map((c) => (
                  <td key={c} className="text-center">
                    {a.channels.includes(c) ? (
                      <span className="inline-flex">
                        <Check checked={isOn(a, c)} disabled={channelOff?.(c)} onChange={(v) => set(a, c, v)} label={`${a.title}: ${channelLabels[c]}`} />
                      </span>
                    ) : (
                      <span className="text-[0.8125rem] text-ink-mute/35" aria-label="Not available">
                        –
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
