import clsx from "clsx";
import { Icon } from "@/components/icons/Icon";

export function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={clsx("flex gap-0.5", className)} role="img" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" className={clsx("size-3.5", i <= rating ? "fill-ink text-ink" : "text-ink/20")} strokeWidth={1.25} />
      ))}
    </span>
  );
}
