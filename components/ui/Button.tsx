import clsx from "clsx";
import Link from "next/link";

type Variant = "solid" | "outline" | "paper";

const variants: Record<Variant, string> = {
  solid: "bg-ink text-paper hover:bg-ink/85",
  outline: "border border-ink/25 text-ink hover:border-ink",
  paper: "bg-paper text-ink hover:bg-paper/85",
};

const base = "t-nav inline-flex h-12 items-center justify-center px-7 transition-colors duration-300 disabled:opacity-50";

export function Button({
  href,
  variant = "solid",
  className,
  children,
  ref,
  ...props
}: { href?: string; variant?: Variant; className?: string; children: React.ReactNode; ref?: React.Ref<HTMLButtonElement> } & Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "children"
>) {
  const cls = clsx(base, variants[variant], className);
  if (href) {
    return href.startsWith("http") ? (
      <a href={href} className={cls}>
        {children}
      </a>
    ) : (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} {...props}>
      {children}
    </button>
  );
}
