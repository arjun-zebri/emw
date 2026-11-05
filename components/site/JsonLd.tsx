import { ldJson } from "@/lib/seo";

/** Structured data for search engines. Rendered in the page body, which Google reads the same as the head. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />;
}
