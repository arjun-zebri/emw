"use client";

import clsx from "clsx";
import { useParams, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/icons/Icon";
import { Media } from "@/components/media/Media";
import { areaLabel, languages as languageNames, serviceLabels } from "@/data/taxonomy";
import { tiers } from "@/lib/admin/billing";
import { addVendor, removeVendor, useAdmin } from "@/lib/admin/store";
import { toast } from "@/lib/admin/toast";
import { findAdminVendor, isListed, statusLabels, type AdminVendor } from "@/lib/admin/vendors";
import { Badge, Btn, Empty, NotYet, PageHeader, Panel } from "../ui";

export function VendorDetail() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const state = useAdmin();
  const vendor = findAdminVendor(state, slug);

  if (!vendor) {
    return (
      <>
        <PageHeader title="Vendor not found" back={{ href: "/admin/vendors", label: "Vendors" }} />
        <Panel>
          <Empty title="This vendor isn't listed" action={<Btn href="/admin/vendors">All vendors</Btn>}>
            They may have been removed.
          </Empty>
        </Panel>
      </>
    );
  }

  const status = statusLabels[vendor.status];
  const remove = () => {
    const original = state.addedVendors.find((v) => v.slug === vendor.slug);
    removeVendor(vendor.slug);
    router.push("/admin/vendors");
    toast(`${vendor.name} removed`, original && { label: "Undo", run: () => addVendor(original) });
  };

  return (
    <>
      <div className="mb-8 md:mb-10">
        <PageHeader
          back={{ href: "/admin/vendors", label: "Vendors" }}
          title={
            <span className="flex items-center gap-5">
              <span className="relative block size-16 shrink-0 overflow-hidden bg-paper-soft md:size-[4.5rem]">
                {vendor.cover && <Cover src={vendor.cover} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate">{vendor.name}</span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[0.875rem] tracking-normal text-ink-mute">
                  <span>
                    {vendor.discipline} · {vendor.location}
                  </span>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </span>
              </span>
            </span>
          }
          actions={
            <>
              {vendor.email && (
                <Btn icon="mail" href={`mailto:${vendor.email}`} external>
                  Email
                </Btn>
              )}
              {isListed(vendor.slug) && (
                <Btn icon="arrow-up-right" href={`/vendors/${vendor.slug}`} external>
                  View listing
                </Btn>
              )}
              {vendor.isNew && (
                <Btn variant="danger" icon="trash" onClick={remove}>
                  Remove
                </Btn>
              )}
            </>
          }
        />
      </div>

      <ListingTab vendor={vendor} />
      <NotYet
        className="mt-4"
        title="Views, enquiries and billing start at launch"
        items={[
          { icon: "overview", title: "Performance", detail: "Profile views, clicks to their website and socials, and enquiries." },
          { icon: "card", title: "Billing", detail: vendor.tier ? `${tiers[vendor.tier].name} plan, with payments once they're taken through Stripe.` : "Their plan and payments, once they're taken through Stripe." },
        ]}
      />
    </>
  );
}

function Cover({ src }: { src: string }) {
  if (src.startsWith("data:")) {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded in the demo as a data URL
    return <img src={src} alt="" className="size-full object-cover" />;
  }
  return <Media src={src} alt="" brief="" sizes="160px" className="size-full" />;
}

function ListingTab({ vendor }: { vendor: AdminVendor }) {
  const links: { icon: IconName; label: string; href: string }[] = [
    vendor.website && { icon: "globe" as const, label: vendor.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), href: vendor.website },
    vendor.instagram && { icon: "instagram" as const, label: "Instagram", href: vendor.instagram },
    vendor.facebook && { icon: "facebook" as const, label: "Facebook", href: vendor.facebook },
    vendor.email && { icon: "mail" as const, label: vendor.email, href: `mailto:${vendor.email}` },
    vendor.phone && { icon: "phone" as const, label: vendor.phone, href: `tel:${vendor.phone.replace(/\s/g, "")}` },
  ].filter(Boolean) as { icon: IconName; label: string; href: string }[];

  const rows: [string, React.ReactNode][] = [
    ["Contact person", vendor.person ?? "–"],
    ["Services", vendor.services.map((s) => serviceLabels[s]).join(", ") || "–"],
    ["Based in", vendor.based ?? "–"],
    ["Travels to", areaLabel(vendor.serviceArea, "–")],
    [
      "Languages",
      vendor.languages.length ? (
        <span className="flex flex-wrap gap-x-3 gap-y-1">
          {vendor.languages.map((l) => (
            <span key={l} lang={languageNames[l]?.lang}>
              {languageNames[l]?.native ?? l}
              {languageNames[l] && languageNames[l].native !== l && <span className="ml-1.5 text-ink-mute">{l}</span>}
            </span>
          ))}
        </span>
      ) : (
        "–"
      ),
    ],
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Panel title="Photos" meta={`${vendor.photos.length} on the listing`} className="xl:col-span-2">
        {vendor.photos.length === 0 ? (
          <Empty title="No photos yet">The listing shows a placeholder until photos are added.</Empty>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {vendor.photos.map((src, i) => (
              <li key={src.slice(-40) + i} className={clsx("relative overflow-hidden bg-paper-soft", i === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-auto" : "aspect-square")}>
                <span className="absolute inset-0">
                  <Cover src={src} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="space-y-4">
        <Panel title="Introduction">
          <p className="text-[0.875rem] leading-relaxed text-ink-soft">{vendor.lede || "–"}</p>
        </Panel>
        <Panel title="Details" flush>
          <dl>
            {rows.map(([k, val]) => (
              <div key={k} className="grid grid-cols-[7.5rem_1fr] gap-3 border-t border-ink/[0.06] px-5 py-3 text-[0.8125rem] sm:px-6">
                <dt className="text-ink-mute">{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        {links.length > 0 && (
          <Panel title="Links" flush>
            <ul>
              {links.map((l) => (
                <li key={l.href} className="border-t border-ink/[0.06]">
                  <a href={l.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-5 py-3 text-[0.8125rem] transition-colors hover:bg-paper/70 sm:px-6">
                    <Icon name={l.icon} className="size-4 text-ink-mute" strokeWidth={1.4} />
                    <span className="min-w-0 flex-1 truncate">{l.label}</span>
                    <Icon name="arrow-up-right" className="size-3.5 text-ink-mute" strokeWidth={1.5} />
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </div>
  );
}
