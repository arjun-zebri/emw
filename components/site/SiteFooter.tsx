import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/config";
import { getListings } from "@/lib/listings";
import { listedCrafts } from "@/lib/vendors";
import { Newsletter } from "./Newsletter";
import { primaryNav, vendorCta } from "./nav";

export async function SiteFooter() {
  const vendors = await getListings();
  const columns = [
    { title: "Vendors", links: listedCrafts(vendors).map((c) => ({ href: `/vendors?craft=${c.id}`, label: c.short })) },
    {
      title: "East Meets Wed",
      links: [...primaryNav.filter((n) => n.href !== "/vendors"), vendorCta],
    },
  ];

  return (
    <footer className="bg-night text-paper">
      {/* One grid: the brand and the vendor invitation, then the link columns and the newsletter. */}
      <div className="shell grid gap-14 pt-[clamp(4.5rem,8vw,7rem)] pb-14 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <Logo title="East Meets Wed" className="w-32" />
          <div className="mt-[clamp(2.5rem,5vw,4rem)]">
            <h2 className="t-title text-[1.75rem]">Join the directory</h2>
            <p className="mt-3 max-w-[40ch] leading-[1.65] text-paper/60">
              Show couples your work, the languages you speak and the care you bring to their culture. You don&rsquo;t have
              to be Asian or know every tradition. You do have to care enough to learn.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4">
              <Button href="/list-your-business" variant="paper">
                List your business
              </Button>
              <Link href="/login?as=vendor" className="t-nav link-line text-paper/60 hover:text-paper">
                Vendor login
              </Link>
            </div>
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title} className="md:col-span-2">
            <p className="t-small mb-5 text-paper/45">{col.title}</p>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-line text-paper/85 hover:text-paper">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="md:col-span-3">
          <p className="t-small mb-5 text-paper/45">Newsletter</p>
          <Newsletter />
        </div>
      </div>
      <div className="shell t-small flex flex-col gap-4 border-t border-paper/10 py-8 text-paper/40 md:flex-row md:justify-between">
        <p className="flex items-center gap-1.5">
          Made with <Icon name="heart" title="love" className="size-3.5 text-paper/70" /> in Australia
        </p>
        <p className="flex gap-6">
          <span>© 2026 {SITE.name}</span>
          <Link href="/privacy-policy" className="link-line">
            Privacy
          </Link>
          <Link href="/terms-and-conditions" className="link-line">
            Terms
          </Link>
        </p>
      </div>
    </footer>
  );
}
