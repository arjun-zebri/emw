"use client";

import { NotYet, PageHeader } from "../ui";

/** Couples can sign up once the new site is live; until then this says what will be here. */
export function Couples() {
  return (
    <>
      <PageHeader title="Couples" description="Who's planning a wedding with East Meets Wed." />
      <NotYet
        title="No couples yet"
        items={[
          { icon: "people", title: "Who they are", detail: "Names, the cultures they're bringing together, and where they live." },
          { icon: "calendar", title: "When they marry", detail: "Wedding dates and guest numbers, from their enquiries." },
          { icon: "heart", title: "Who they like", detail: "The vendors they save and the ones they write to." },
          { icon: "download", title: "A list to download", detail: "Everything here as a spreadsheet, for newsletters and events." },
        ]}
      >
        Couples appear here once they can sign up and send enquiries on the new site.
      </NotYet>
    </>
  );
}
