import { Monogram } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/icons/Icon";
import { primaryNav, vendorCta } from "@/components/site/nav";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VendorCard } from "@/components/vendors/VendorCard";
import { areaLabel, languages, serviceLabels } from "@/data/taxonomy";
import type { Language } from "@/data/types";
import { getVendor, vendors } from "@/lib/static-vendors";
import { areaCounts, languageCounts, locationLabel, serviceCounts } from "@/lib/vendors";
import { ChipsDemo, DrawerDemo, FieldsDemo, GuestsDemo, NightFieldDemo } from "./Demos";
import { Section, Stage } from "./parts";

export function Buttons() {
  return (
    <Section id="buttons" title="Buttons and links">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Stage ground="soft" className="flex min-h-48 flex-wrap items-center gap-x-8 gap-y-5 p-[clamp(1.5rem,4vw,3rem)]" caption="Solid, outline, arrow link">
          <Button>Enquire</Button>
          <Button variant="outline">View all vendors</Button>
          <ArrowLink href="/vendors">Find vendors</ArrowLink>
        </Stage>
        <Stage ground="night" className="flex min-h-48 flex-wrap items-center gap-x-8 gap-y-5 p-[clamp(1.5rem,4vw,3rem)]" caption="Paper button and text link, on night">
          <Button variant="paper">List your business</Button>
          <span className="t-nav link-line text-paper/60 hover:text-paper">Vendor login</span>
        </Stage>
      </div>
    </Section>
  );
}

export function Header() {
  return (
    <Section id="header" title="Header">
      <Stage ground="paper" className="overflow-hidden">
        <div className="flex h-[var(--header-h)] items-center justify-between px-[clamp(1rem,3vw,2rem)]">
          <Monogram className="w-[4.5rem]" />
          <div className="hidden items-center gap-10 md:flex">
            {[...primaryNav, vendorCta].map((item, i) => (
              <span key={item.href} className="t-nav link-line" style={i === 0 ? { backgroundSize: "100% 1px" } : undefined}>
                {item.label}
              </span>
            ))}
          </div>
          <span className="flex flex-col items-end gap-[5px] md:hidden" aria-hidden>
            <span className="h-px w-[18px] bg-ink" />
            <span className="h-px w-[11px] bg-ink" />
          </span>
        </div>
      </Stage>
    </Section>
  );
}

export function Heading() {
  return (
    <Section id="heading" title="Section heading">
      <Stage ground="paper" className="border-0 [&>div]:mb-0 [&>div]:pt-6">
        <SectionHeading link={{ href: "/vendors", label: "View all" }}>Featured vendors</SectionHeading>
      </Stage>
    </Section>
  );
}

const cardSlugs = ["katrina-lai", "gabiera-film-photographer", "christine-civil-celebrant"];

export function Card() {
  return (
    <Section id="card" title="Vendor card">
      <div className="grid grid-cols-1 gap-x-[clamp(1rem,2vw,2rem)] gap-y-12 sm:grid-cols-3">
        {cardSlugs.map((slug) => {
          const v = getVendor(slug)!;
          return <VendorCard key={slug} data={{ vendor: v, location: locationLabel(v) }} sizes="(min-width: 640px) 30vw, 100vw" />;
        })}
      </div>
    </Section>
  );
}

export function Forms() {
  return (
    <Section id="forms" title="Forms">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Stage ground="paper" className="p-[clamp(1.5rem,4vw,3rem)]" caption="Enquiry">
          <FieldsDemo />
          <div className="mt-8">
            <GuestsDemo />
          </div>
          <Button type="button" className="mt-8 w-full">
            Send enquiry
          </Button>
        </Stage>
        <Stage ground="night" className="flex flex-col justify-end p-[clamp(1.5rem,4vw,3rem)]" caption="Newsletter, on night">
          <NightFieldDemo />
        </Stage>
      </div>
    </Section>
  );
}

export function Filters() {
  const chipLanguages = languageCounts(vendors)
    .map(([l]) => l)
    .filter((l): l is Language => l !== "Other")
    .slice(0, 7)
    .map((l: Language) => ({ value: l, label: `${languages[l].native}  ${l}`, lang: languages[l].lang }));
  const drawerOptions = { languages: languageCounts(vendors), areas: areaCounts(vendors), services: serviceCounts(vendors) };
  const facets = vendors.map((v) => ({ languages: v.languages ?? [], services: v.services, areas: v.serviceArea ?? [] }));
  return (
    <Section id="filters" title="Filters">
      <Stage ground="paper" className="space-y-8 p-[clamp(1.5rem,4vw,3rem)]" caption="Chips, and the drawer they live in">
        <ChipsDemo items={chipLanguages} />
        <DrawerDemo options={drawerOptions} facets={facets} />
      </Stage>
    </Section>
  );
}

function socialLinks(slug: string) {
  const { contact = {}, socials = {} } = getVendor(slug)!;
  return [
    contact.website && { href: contact.website, label: contact.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), icon: "globe" },
    socials.instagram && { href: socials.instagram, label: "Instagram", icon: "instagram" },
    socials.facebook && { href: socials.facebook, label: "Facebook", icon: "facebook" },
  ].filter(Boolean) as { href: string; label: string; icon: IconName }[];
}

export function Details() {
  const katrina = getVendor("katrina-lai")!;
  return (
    <Section id="details" title="Vendor details">
      <div className="max-w-md">
        <dl className="border-t hairline">
          {[
            ["Services", katrina.services.map((s) => serviceLabels[s]).join(", ")],
            ["Service area", areaLabel(katrina.serviceArea ?? [])],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[7.5rem_1fr] gap-4 border-b hairline py-3.5">
              <dt className="t-small">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <Button type="button" className="mt-6 w-full">
          Enquire
        </Button>
        <ul className="mt-5 flex flex-wrap gap-2">
          {socialLinks("katrina-lai").map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="t-small inline-flex h-10 items-center gap-2 border hairline px-3.5 text-ink transition-colors duration-300 hover:border-ink"
              >
                <Icon name={l.icon} className="size-4" />
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
