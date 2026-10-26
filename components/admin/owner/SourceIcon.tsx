import { Icon, type IconName } from "@/components/icons/Icon";

const icons: Record<string, IconName> = {
  Google: "search",
  Instagram: "instagram",
  Direct: "arrow-up-right",
  Pinterest: "pin",
  TikTok: "youtube",
  Facebook: "facebook",
  "Other sites": "globe",
};

/** A small glyph beside a traffic source. */
export function SourceIcon({ label }: { label: string }) {
  return <Icon name={icons[label] ?? "globe"} className="size-3.5 text-ink-mute" strokeWidth={1.5} />;
}
