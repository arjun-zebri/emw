# Game plan: East Meets Wed demo

Goal: a deployed three-page demo that makes the client say yes to the rebuild. Read `CLAUDE.md` first.

## What the current site tells us

| Current (WordPress + Directorist) | Demo |
|---|---|
| Directory is called "The Team"; headline is literally "Search 34 Items Found" | "The Directory", with a magazine headline and an editorial grid |
| Uniform card wall, every card shows "0.0 (0)" | Clean image grid: photo, name, one line. No empty ratings |
| Filters: 23 services, 8 states, 22 languages in a sidebar | Category tabs plus a filter drawer for language, service and area. Everything lives in the URL |
| Languages listed as English words | Languages shown in their own script first (廣東話, Tiếng Việt, 한국어…) |
| Vendor page: slider, description, a contact form, an empty review form | Photo mosaic with lightbox (the card image morphs into it), their story, details, an Enquire slide-over, similar vendors |
| Tagline: "celebrating Asian weddings" | "Weddings that belong to two worlds", open to every culture |

## Decisions

1. **Real vendors.** All 34 listings, scraped October 2026, in their own words.
2. **Grey image placeholders.** Every slot carries a brief; photography drops in via `src` (see CLAUDE.md, Images).
3. **Premium fonts, self-hosted.** Boska + Switzer (Fontshare). Not the client's current Italiana / Nanum Gothic.
4. **The client's EMW logo**, traced to SVG.
5. **Image-led and restrained** (revised 26 Oct after "feels Claude generated / too much text"): near-white and ink,
   minimal copy, no editorial gimmicks. The intro is a photo flick-through that opens into the hero.
6. **No backend.** Enquiry and newsletter forms end in a confirmation state.

## Phases

- [x] **0. Scaffold.** Next 16.4, Tailwind v4 tokens, fonts, motion/lenis
- [x] **1. Design system.** Tokens, type utilities, traced EMW logo, icon set, Media placeholder, Button/ArrowLink, motion runtime, intro
- [x] **2. Data.** 34 real vendors, taxonomy (crafts, services, native-script languages, states), image slots
- [x] **3. Landing.** Full-bleed hero, one-line intro, featured vendors, categories, journal, vendor band (reworked 26 Oct)
- [x] **4. Directory.** Category tabs, filter drawer, chips, sort, animated re-flow, deep links
- [x] **5. Vendor page.** Photo mosaic + lightbox + morph, story, details, enquiry slide-over, similar vendors
- [x] **6. QA.** Lint/types/build green; no console errors; no overflow at 390/768/1440; interactions scripted and passing
- [ ] **7. Photography.** Fill `cover`/`gallery` for featured vendors first (the 5 on the home page), then the cover and editorial slots
- [ ] **8. Ship.** Push to GitHub, deploy to Vercel, OG images per route, Lighthouse pass (target ≥ 90 perf, 100 a11y)
- [ ] **9. Pitch notes.** `docs/PITCH.md`: what's real, what's staged, and what the full build adds

## What the full build adds (for the pitch)

Vendor accounts and self-serve listings, CMS-backed journal and real weddings, enquiries delivered to vendors (with
the date, guest count and traditions captured here), search, reviews once there are some to show, image management, and
301 redirects from the 34 `/directory/<slug>/` URLs (note the `mr` → `patrick-nguyen-kieu` slug change).

## Risks

- **Photography is now the biggest lever.** Placeholders look intentional, but real images are what sells it. Prioritise
  the cover and the eight featured vendors.
- **View transitions** are Chromium/Safari-first; Firefox falls back to instant navigation (acceptable).
- **Real vendor copy is uneven.** Thin listings (one line) skip the pull quote automatically. Don't pad them with
  invented detail.

Demo URL: _not yet deployed_
