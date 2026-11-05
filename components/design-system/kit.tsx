import clsx from "clsx";
import Link from "next/link";
import { Monogram } from "@/components/brand/Logo";
import { Icon, type IconName } from "@/components/icons/Icon";
import { primaryNav, vendorCta } from "@/components/site/nav";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VendorCard } from "@/components/vendors/VendorCard";
import { languages, serviceLabels, states } from "@/data/taxonomy";
import type { Language } from "@/data/types";
import { areaCounts, getVendor, languageCounts, locationLabel, serviceCounts, vendors } from "@/lib/vendors";
import { ChipsDemo, DrawerDemo, FieldsDemo, GuestsDemo, NightFieldDemo } from "./Demos";
import { Chapter, Part, Spec, Stage, Token } from "./parts";

// ── Components ──────────────────────────────────────────────────────────

const cardSlugs = ["katrina-lai", "gabiera-film-photographer", "christine-civil-celebrant"];

function socialLinks(slug: string) {
  const v = getVendor(slug)!;
  const { contact = {}, socials = {} } = v;
  return [
    contact.website && { href: contact.website, label: contact.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), icon: "globe" },
    socials.instagram && { href: socials.instagram, label: "Instagram", icon: "instagram" },
    socials.facebook && { href: socials.facebook, label: "Facebook", icon: "facebook" },
  ].filter(Boolean) as { href: string; label: string; icon: IconName }[];
}

export function Components() {
  const katrina = getVendor("katrina-lai")!;
  const chipLanguages = languageCounts()
    .map(([l]) => l)
    .filter((l) => l !== "English")
    .slice(0, 7)
    .map((l: Language) => ({ value: l, label: `${languages[l].native}  ${l}`, lang: languages[l].lang }));
  const drawerOptions = { languages: languageCounts(), areas: areaCounts(), services: serviceCounts() };
  const facets = vendors.map((v) => ({ languages: v.languages ?? [], services: v.services, areas: v.serviceArea ?? [] }));

  return (
    <Chapter id="components" title="Components" intro="The parts every page is made from. Each one below is the live component, so it always matches the site.">
      <Part title="Buttons and links" note="One solid button per view, for the action that matters. Everything else is an arrow link or a text link.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Stage ground="soft" className="flex min-h-56 flex-wrap items-center gap-x-8 gap-y-5 p-[clamp(1.5rem,4vw,3rem)]" caption="Solid, outline, arrow link.">
            <Button>Enquire</Button>
            <Button variant="outline">View all vendors</Button>
            <ArrowLink href="/vendors">Find vendors</ArrowLink>
          </Stage>
          <Stage ground="night" className="flex min-h-56 flex-wrap items-center gap-x-8 gap-y-5 p-[clamp(1.5rem,4vw,3rem)]" caption="Paper button and a quiet link, on night.">
            <Button variant="paper">List your business</Button>
            <span className="t-nav link-line text-paper/60 hover:text-paper">Vendor login</span>
          </Stage>
        </div>
        <Spec
          className="mt-6"
          items={[
            ["Size", "48px tall, 28px either side; 40px in the docked enquiry bar"],
            ["Type", <><Token>t-nav</Token>: 12px, medium, spaced capitals</>],
            ["Shape", "Square corners, no shadows, no icons inside unless the label needs one"],
            ["Hover", "Solid eases to 85% ink; outline’s border darkens from 25% to full ink"],
          ]}
        />
      </Part>

      <Part title="Header" note="Fixed, 72px. Transparent over the landing hero, paper with a blur once you scroll. It slides away as you read and returns when you scroll back.">
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
      </Part>

      <Part title="Section opener" note="A hairline, the title in Boska, and an optional link on its baseline. Every titled section of the landing page opens this way.">
        <Stage ground="paper" className="border-0 [&>div]:mb-0 [&>div]:pt-10">
          <SectionHeading link={{ href: "/vendors", label: "View all" }}>Featured vendors</SectionHeading>
        </Stage>
      </Part>

      <Part title="Vendor card" note="An image, a name and one line: the discipline, then the languages in their own scripts. Click one: the photo carries through into the vendor’s page.">
        <div className="grid grid-cols-1 gap-x-[clamp(1rem,2vw,2rem)] gap-y-12 sm:grid-cols-3">
          {cardSlugs.map((slug) => {
            const v = getVendor(slug)!;
            return (
              <div key={slug}>
                <VendorCard data={{ vendor: v, location: locationLabel(v) }} sizes="(min-width: 640px) 30vw, 100vw" />
                {!v.cover && <p className="t-small mt-3 text-ink-soft">No photos yet: the slot waits with its brief, and the card sorts to the end of the directory.</p>}
              </div>
            );
          })}
        </div>
      </Part>

      <Part title="Forms" note="Underlined fields, no boxes. The placeholder names the field, a hidden label reads it out, and the line darkens to ink on focus.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Stage ground="paper" className="p-[clamp(1.5rem,4vw,3rem)]" caption="The enquiry form.">
            <FieldsDemo />
            <div className="mt-8">
              <GuestsDemo />
            </div>
            <Button type="button" className="mt-8 w-full">
              Send enquiry
            </Button>
          </Stage>
          <Stage ground="night" className="flex flex-col justify-end p-[clamp(1.5rem,4vw,3rem)]" caption="The newsletter field, on night.">
            <p className="t-small mb-5 text-paper/45">Newsletter</p>
            <NightFieldDemo />
          </Stage>
        </div>
      </Part>

      <Part title="Filters" note="Toggles for choosing many, the native script first. In the directory they live in a drawer that slides in from the right.">
        <Stage ground="paper" className="space-y-8 p-[clamp(1.5rem,4vw,3rem)]">
          <ChipsDemo items={chipLanguages} />
          <DrawerDemo options={drawerOptions} facets={facets} />
        </Stage>
        <Spec
          className="mt-6"
          items={[
            ["Drawer", "Up to 448px wide, from the right, 700ms; the page dims to 30% night behind it"],
            ["Closing", "Escape, the cross, or a tap outside. Focus moves into the drawer and returns after"],
            ["Footer", <>A text link to clear, and a button that says the count: <span className="text-ink-mute">Show 12 vendors</span></>],
          ]}
        />
      </Part>

      <Part title="Vendor details" note="The facts at the foot of a vendor’s column, then their own links. Social icons are wanted here.">
        <div className="grid grid-cols-1 gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 md:grid-cols-2 md:items-start">
        <Stage ground="paper" className="border-0">
          <dl className="border-t hairline">
            {[
              ["Services", katrina.services.map((s) => serviceLabels[s]).join(", ")],
              ["Service area", (katrina.serviceArea ?? []).map((s) => states[s]).join(", ") || "On request"],
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
        </Stage>
        <Spec
          items={[
            ["Order", "Facts, then the one Enquire button, then the vendor’s own links"],
            ["Facts", "Only what the vendor has published. A missing fact is left out, never filled"],
            ["Links", "Website, Instagram and Facebook, each with its icon, opening in a new tab"],
            ["On a phone", "Enquire docks to the foot of the screen once this button scrolls away"],
          ]}
        />
        </div>
      </Part>
    </Chapter>
  );
}

// ── Patterns ────────────────────────────────────────────────────────────

/** Wireframe pieces: a photo block and lines of text. */
function Block({ className }: { className?: string }) {
  return <span className={clsx("block bg-[#e4dfd7]", className)} />;
}
function Lines({ widths, className }: { widths: string[]; className?: string }) {
  return (
    <span className={clsx("block space-y-1.5", className)}>
      {widths.map((w, i) => (
        <span key={i} className={clsx("block h-1.5 bg-ink/25 first:h-2 first:bg-ink/70", w)} />
      ))}
    </span>
  );
}

export function Patterns() {
  // One wide tile in the first five, as `wideTiles` places them; the last tile waits on photos.
  const tiles = ["", "wide", "", "", "", "", "placeholder"];
  return (
    <Chapter id="patterns" title="Patterns" intro="How the parts come together on the two pages couples use most.">
      <Part title="Directory" note="Three cards a row from 1024px, four from 1280px. A landscape cover takes two columns, one tile in five at most. Vendors waiting on photos sort to the end.">
        <Stage ground="paper" className="p-[clamp(1rem,3vw,2rem)]">
          <div className="mx-auto max-w-4xl">
          <div className="mb-5 flex items-center justify-between">
            <span className="block h-4 w-28 bg-ink/80" />
            <span className="flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={clsx("block h-1.5 w-8", i === 0 ? "bg-ink/70" : "bg-ink/20")} />
              ))}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4">
            {tiles.map((t, i) => (
              <div key={i} className={clsx(t === "wide" && "col-span-2")}>
                <Block className={clsx(t === "wide" ? "aspect-[8/5]" : "aspect-[4/5]", t === "placeholder" && "bg-[#d3d2cf]")} />
                <Lines widths={["w-2/3", "w-1/2"]} className="mt-2.5" />
              </div>
            ))}
          </div>
          </div>
        </Stage>
      </Part>

      <Part title="Vendor page" note="Photos on the left, the vendor on the right. With several photos the right column stays in view as they scroll past. With only the cover, the column runs the cover’s height with the details at its foot.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
          <Stage ground="paper" className="p-[clamp(1rem,3vw,2rem)]" caption="Several photos: cover, then justified rows. The column is sticky.">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-7 space-y-2">
                <Block className="aspect-[4/5]" />
                <div className="flex gap-2">
                  <Block className="aspect-[3/4] flex-[0.75]" />
                  <Block className="aspect-[3/2] flex-[1.5]" />
                </div>
              </div>
              <div className="col-span-5">
                <div className="sticky top-0 space-y-3 border-t-2 border-accent/60 pt-2">
                  <Lines widths={["w-full", "w-3/4"]} />
                  <Lines widths={["w-1/2", "w-full", "w-full", "w-5/6", "w-full", "w-2/3"]} />
                  <span className="block border-t hairline pt-2">
                    <Lines widths={["w-full", "w-full"]} className="[&>span:first-child]:h-1.5 [&>span:first-child]:bg-ink/25" />
                  </span>
                  <span className="block h-5 bg-ink" />
                  <span className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="block h-4 w-6 border hairline" />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </Stage>
          <Stage ground="paper" className="p-[clamp(1rem,3vw,2rem)]" caption="Only the cover: the story at the top, the details at the foot, so the spread is full.">
            <div className="grid grid-cols-12 gap-3">
              <Block className="col-span-7 aspect-[4/5]" />
              <div className="col-span-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <Lines widths={["w-full", "w-3/4"]} />
                  <Lines widths={["w-1/2", "w-full", "w-full", "w-5/6"]} />
                </div>
                <div className="space-y-3">
                  <span className="block border-t hairline pt-2">
                    <Lines widths={["w-full", "w-full"]} className="[&>span:first-child]:h-1.5 [&>span:first-child]:bg-ink/25" />
                  </span>
                  <span className="block h-5 bg-ink" />
                </div>
              </div>
            </div>
          </Stage>
        </div>
      </Part>

      <Part title="On a phone" note="Everything becomes one column: the cover, then the vendor, then the rest of the photos. The enquiry button docks to the foot of the screen once it has scrolled away.">
        <Stage ground="soft" className="flex flex-wrap justify-center gap-[clamp(1.5rem,5vw,4rem)] px-6 py-[clamp(2rem,5vw,3.5rem)]">
          {["Directory", "Vendor"].map((name) => (
            <figure key={name} className="w-[min(13rem,40vw)]">
              <div className="relative aspect-[9/19] overflow-hidden border hairline bg-paper p-2.5">
                <span className="mb-2.5 flex items-center justify-between">
                  <Monogram className="w-6" />
                  <span className="block h-px w-3 bg-ink" />
                </span>
                {name === "Directory" ? (
                  <div className="space-y-3">
                    <span className="block h-3 w-16 bg-ink/80" />
                    {[0, 1].map((i) => (
                      <div key={i}>
                        <Block className="aspect-[4/5]" />
                        <Lines widths={["w-2/3", "w-1/2"]} className="mt-1.5" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Block className="aspect-[4/5]" />
                    <Lines widths={["w-full", "w-2/3"]} />
                    <Lines widths={["w-1/2", "w-full", "w-full", "w-5/6"]} />
                  </div>
                )}
                {name === "Vendor" && (
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t hairline bg-paper px-2.5 py-2">
                    <span className="block h-1.5 w-14 bg-ink/70" />
                    <span className="block h-4 w-10 bg-ink" />
                  </span>
                )}
              </div>
              <figcaption className="t-small mt-3 text-center">{name}</figcaption>
            </figure>
          ))}
        </Stage>
      </Part>

      <p className="t-small">
        Both pages are live: <Link href="/vendors" className="link-line text-ink">the directory</Link> and{" "}
        <Link href="/vendors/katrina-lai" className="link-line text-ink">a vendor</Link>.
      </p>
    </Chapter>
  );
}
