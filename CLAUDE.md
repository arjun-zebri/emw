# East Meets Wed: demo rebuild

@AGENTS.md

A three-page, no-backend Next.js demo to win the rebuild of https://eastmeetswed.com/ (currently WordPress +
Directorist). It's a $20k pitch, so **design quality is the product**: every decision is judged first on how it looks
and feels, then on code quality.

## The brief (verbatim from the client)

> Warm, editorial and elevated, like a luxury wedding magazine, not a generic directory. Culturally rich without
> clichés (no red-and-gold dragons). It should feel like it's for diaspora couples blending cultures, open to all
> cultures, not just the tea ceremony.

Scope: **landing (`/`), directory (`/vendors`), vendor page (`/vendors/[slug]`)**, plus a 404. Journal, About and
"List your business" are sections of the landing page, so the demo never shows a dead page.

## Stack

- **Next.js 16.4** App Router with `cacheComponents` + `partialPrefetching`. This is newer than most training
  data, so read `node_modules/next/dist/docs/` before using an unfamiliar API. Gotchas already hit:
  - Reading `params` outside `<Suspense>` fails the instant-navigation check. The vendor page keeps a sync shell and
    awaits params in `VendorFeature` inside Suspense. All 34 slugs are still prerendered via `generateStaticParams`.
  - `useSearchParams` needs a Suspense boundary (see `app/vendors/page.tsx`).
  - Pages are kept alive with `<Activity>` across navigations, so state persists unless reset deliberately.
  - `PageProps<"/route">` is a generated global; run `npx next typegen` if tsc can't find it.
- **React 19.3** `<ViewTransition>` for page transitions and the card → hero image morph (`vendor-<slug>`).
- **Tailwind v4** with tokens in `app/globals.css` (`@theme`) and custom `@utility` type classes. No UI kit.
- `motion` for interactive animation, `lenis` for smooth scroll, `clsx`. Nothing else.
- Don't run `npm run build` while `npm run dev` is running: both write to `.next` and the dev server stops picking up
  changes. If styles or markup look stale, stop the server, `rm -rf .next`, and restart.
- The intro plays on every full load of `/` (never on client-side navigation).
- Fonts are self-hosted from Fontshare (ITF Free Font License, commercial use OK): **Boska** (display serif,
  variable 200–900 + italic) and **Switzer** (UI/body). For production, consider licensing Canela or GT Alpina.
  Do **not** use the current site's fonts (Italiana, Nanum Gothic, Montserrat); the user finds them not premium.

```bash
npm run dev     # http://localhost:3000
npm run build   # must be green before any commit
npm run lint
npx tsc --noEmit
```

## Layout

```
app/
  layout.tsx              fonts, IntroScript, skip link (html/body only)
  (site)/layout.tsx       header/footer, MotionRuntime; the public pages live in (site)
  admin/, account/        owner admin and vendor portal (AdminShell); login/ is the simulated sign-in
  page.tsx                Hero → About → Featured → Categories → Journal → ForVendors
  vendors/page.tsx        "Vendors" + <VendorDirectory> (client; filters in the URL)
  vendors/[slug]/page.tsx photos left, vendor details right (sticky), similar vendors
  globals.css             tokens, type utilities, reveals, intro, view transitions
components/
  brand/      Logo + Monogram (the client's EMW logo), logo-paths.ts (traced SVG)
  icons/      Icon: small custom UI set
  media/      Media: next/image or a grey placeholder captioned with its brief
  motion/     IntroScript, Intro, MotionRuntime, PageTransition
  site/       SiteHeader, SiteFooter, Newsletter, nav
  home/       landing sections
  vendors/    VendorCard, VendorDirectory, FilterDrawer
  vendor/     Gallery (shared lightbox) + GalleryImage, StickyColumn, Enquire (slide-over form + docked bar)
  ui/         Button, ArrowLink
data/         vendors.ts (34 real vendors), taxonomy.ts, images.ts (every image slot + brief),
              photos.ts (cover/gallery picks), photo-ratios.ts (width ÷ height of each photo, regenerate when photos change)
lib/          vendors.ts (filter/sort/related), config.ts, lenis.ts; admin/ (simulated data, store, session)
```

## Design system

**Read this before adding anything.** The first version was rejected as "very Claude generated", with a "cheap" loader
and "so much text everywhere". The rules below exist to stop that coming back.

- **Photography leads.** Pages are mostly images and whitespace. A vendor is an image, a name and one line
  ("Discipline, Location"). The home page has about 40 words.
- **Two type styles, sentence case.** Boska (`t-display`, `t-heading`, `t-title`) for names and the few headlines;
  Switzer (`t-body`, `t-small`) for everything else. `t-nav` (small uppercase) is for navigation and buttons only.
- **Banned:** eyebrow labels above headings, an italic word in every headline, 01/02/03 numbering, "Issue Nº" or
  other magazine gimmicks, stats rows, marquees, custom cursors, pull quotes, drop caps, paper grain, cute or clever
  copy, and decorative stroke-draw animations. If a real high-end studio site wouldn't have it, don't add it.
- **Palette:** paper `#faf8f5`, ink `#161412`, mute `#8a847d`, hairlines at 12% ink, night footer. The client's
  olive-gold `#ad9e5d` is available as `accent` but unused so far. Colour comes from the photography.
- **No dead whitespace.** Most vendors have one to three photos, so layouts must hold up with one. Staggered offsets
  and empty grid cells were rejected ("so much white space everywhere").
- **Directory:** a dense grid (3 columns at lg, 4 at xl). A vendor with a landscape cover takes a double-width tile, at
  most one in five (`wideTiles`). Vendors without photos sort last. Language filters live in the drawer.
- **Vendor page:** photos on the left (cover, then justified rows from `rows()`, never cropped), the vendor on the
  right: name, discipline, languages, lede, story, details, Enquire, and website/Instagram/Facebook links with their
  icons (wanted). With more photos the right column is sticky (`StickyColumn`); with only the cover it runs the cover's
  height with the details at its foot.
- **Logo:** the client's EMW monogram, traced from `docs/brand/emw-logo-source.png` into `logo-paths.ts` (E / M / W and
  twelve tagline letters). Always render it with `fill-rule="evenodd"`, or the heart in the W and the counters of A
  and D fill in.
- **Intro** (every full load of the landing page, pure CSS, ~5s; `<Intro />` is rendered by `Hero`): the monogram
  window, centred on a cream screen that is the same cream as the page. The EMW monogram is cut out of the sheet with
  the hero photo behind it; E and W slide in, the tagline settles and fades, then the monogram leans in and dissolves
  (it fades out of the mask, so the sheet is plain cream again). The hero photo is then unveiled in its column with a
  curtain rising from the bottom (`.hero-curtain`), and the headline and header fade in. The photo never goes full
  screen. Scrolling is locked until it has played. Keep `--intro` (4.4s), the `.intro` timings and the 6200ms in
  `MotionRuntime` in step. Animating `visibility` to hide the overlay didn't work; it is hidden with opacity.
- **Motion:** `data-reveal` (fade/rise) and `data-reveal-media` (images settle from a slight zoom) are observed by
  `MotionRuntime`, which marks them `data-in` (an attribute, not a class, because streamed content can be revealed
  before React hydrates it; such elements also need `suppressHydrationWarning`). The directory card image morphs into
  the vendor page's cover via `<ViewTransition name="vendor-<slug>">`; cards use `prefetch` so the page is ready when
  clicked (without it the morph lands on an empty Suspense fallback).
  Easing is out-expo; nothing bounces. `prefers-reduced-motion` turns it all off.

## Content rules

- **Vendors are the client's real 34 listings.** `story`, contact details and socials are their own copy (typos fixed,
  long paragraphs split). `discipline`, `lede` and `quote` are an editorial layer drawn only from that copy. **Never
  invent facts about a real business**: no prices, reviews, years or awards they haven't published.
- Patrick Nguyen Kieu's real slug is `mr`; the demo uses `patrick-nguyen-kieu` and records `legacySlug` for redirects.
- Copy: as little as possible. Plain, warm, Australian spelling, no exclamation marks, no wordplay.
- Culture shows up through the photography, the real vendors and the languages (always in native script first), never
  through motifs. No dragons, lanterns, red-and-gold, mandala clip-art or "oriental" type.

## Images

Every image is a slot with an art-direction brief. Until `src` is set, `Media` renders a grey placeholder with the brief
in small type (`tone="dark"` for slots with text over them, like the hero).
- Demo photography is the vendors' own listing photos from eastmeetswed.com (141 images, resized to 2000px in
  `public/images/vendors/<slug>/NN.jpg`). `data/photos.ts` curates each vendor's cover and gallery, leaving out flyers,
  logos and headshots where possible, and picks the site-level images (hero, statement, categories, journal,
  vendor band). Keep that mix broad: not all red, not all tea ceremony.
- Christine Civil Celebrant and Daniella Bui have no photos on the live site, so they show grey briefed placeholders.
- Files go in `/public/images/...`. Remote images need `images.remotePatterns` in `next.config.ts`.
- `SHOW_IMAGE_BRIEFS` in `lib/config.ts` hides the briefs for a cleaner walkthrough.

## Admin portal

`/admin` (owner) and `/account` (vendor), behind a simulated sign-in at `/login`: a cookie, checked in `proxy.ts`, no
password. The team can open `/account` too; it shows Katrina Lai (`DEMO_VENDOR`).
- **No backend.** Figures come from `lib/admin/analytics.ts`, `billing.ts` and `people.ts`: seeded random on a fixed clock
  (`TODAY` in `time.ts`), so the server and client agree. Couples, applicants and reviews are fictional; the tiers and
  prices in `billing.ts` are placeholders. This simulated data must never appear on the public site.
- Anything you can change (posts, approvals, added vendors, replies, alert settings, team) is in `lib/admin/store.ts`
  (localStorage, synced across tabs). The landing page's Journal reads published posts from it.
- UI kit: `components/admin/ui.tsx` (Panel, Stat, Btn, fields, Tabs, Badge, `table` classes) and `charts.tsx`
  (hand-drawn SVG, no chart library). Boska for titles and names only, Switzer 14px, white panels on paper, square
  corners. Status colours (`good`/`warn`/`bad`) only mean state; the tier ramp is `tier-1..3`.
- `AdminShell` reads the pathname inside Suspense; dynamic admin routes read their params on the client.

## Before committing

`npm run lint && npx tsc --noEmit && npm run build` all green. Check 390px and 1440px for horizontal overflow; grid
containers need explicit `grid-cols-1` on mobile, or a truncated child can widen the page.
