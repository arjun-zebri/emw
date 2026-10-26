import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ArrowLink } from "@/components/ui/ArrowLink";

export default function NotFound() {
  // Renders in the root layout, outside the (site) group, so it brings the header and footer itself.
  return (
    <>
      <SiteHeader />
      <main id="main" className="shell flex min-h-[80svh] flex-col items-start justify-end gap-8 pt-[var(--header-h)] pb-[clamp(4rem,10vw,8rem)]">
        <h1 className="t-display">Page not found</h1>
        <ArrowLink href="/vendors">Browse vendors</ArrowLink>
      </main>
      <SiteFooter />
    </>
  );
}
