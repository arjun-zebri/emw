"use client";

import { NotYet, PageHeader } from "../ui";

/** Traffic arrives with the analytics provider at launch; until then this says what it will show. */
export function Traffic() {
  return (
    <>
      <PageHeader title="Traffic" description="Who visits, where they come from and what they look for." />
      <NotYet
        title="Traffic starts at launch"
        items={[
          { icon: "overview", title: "Visits and visitors", detail: "Day by day, week by week, compared with the period before." },
          { icon: "globe", title: "Where couples come from", detail: "Google, Instagram, Pinterest and the sites that link to you." },
          { icon: "search", title: "What they search for", detail: "Including searches that found no one, so you know who to sign up." },
          { icon: "pin", title: "Where they are", detail: "Cities and states, for planning events and outreach." },
        ]}
      >
        The figures come from the site&rsquo;s analytics, which start counting when the new site goes live.
      </NotYet>
    </>
  );
}
