import clsx from "clsx";
import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

/** Small uppercase link with an arrow that nudges forward on hover. */
export function ArrowLink({
  href,
  children,
  className,
  transitionTypes,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  transitionTypes?: string[];
}) {
  return (
    <Link href={href} transitionTypes={transitionTypes} className={clsx("group t-nav inline-flex items-center gap-3", className)}>
      <span className="link-line">{children}</span>
      <Icon name="arrow" className="size-3.5 transition-transform duration-500 ease-out-expo group-hover:translate-x-1" />
    </Link>
  );
}
