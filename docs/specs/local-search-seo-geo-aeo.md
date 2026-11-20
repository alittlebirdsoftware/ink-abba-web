# Spec: Local search, SEO, GEO and AEO improvements

Status: Phase 1 built (2026-11-19); Phase 2 built except GEO-2 (2026-11-20); GEO-2 and Phase 3 onward wait on Brian · Written 2026-11-19 · Owner: development, with inputs from Brian (business owner)

## 1. Background

An audit on 2026-11-18 compared the new site with the current inkabba.com, which is a one-page GoDaddy site. The comparison is in `reports/inkabba-site-comparison.pdf`. Results for the new site:

| Measure | Now | Target after this spec |
|---|---|---|
| Google PageSpeed SEO score (mobile) | 100 | 100 (must not drop) |
| PageSpeed performance (mobile) | 100 | 95 or higher |
| SEO readiness (checklist) | about 80 | 90 or higher |
| GEO: being cited by AI tools (checklist) | about 45 | 70 or higher |
| AEO: answer boxes, voice search, "People also ask" (checklist) | about 35 | 65 or higher |

The gaps are almost all in structured data, question-and-answer content and sharing metadata. Speed and basic page structure are already strong.

## 2. Constraints (apply to every requirement)

- **No storefront.** InkAbba is a service-area business; customers never visit the Peyton Dr address. Never publish a street address or map coordinates anywhere: page text, structured data or `llms.txt`. The business location is described as the city plus the service area.
- **Keep the email private.** The business email lives only in `src/lib/server/business.ts`, which is server-only. It must not appear in public pages, structured data, `llms.txt` or browser JavaScript.
- **No invented facts.** Every business promise comes from `facts` in `src/lib/site.ts`. A `null` or empty fact is simply not rendered. That rule now also covers FAQ answers and structured data.
- **One source for content.** Structured data, `llms.txt` and FAQ markup are generated from `site`, `facts` and `src/content/services.ts`. Never duplicate the text by hand.
- **Same name and phone everywhere.** Use the name "Ink Abba", as on the Google listing, in machine-readable data, with "InkAbba" as an alternate name. Use one phone number across the site and the Google listing.
- **Out of scope:** the domain cutover itself (only the settings it needs are listed in §7), and Cloudflare Turnstile (§8).

## 3. Phase 1: structured data and machine-readable files (code only, can start now)

### SD-1. Business details in structured data
File: `src/app/(site)/layout.tsx`, in the `localBusiness` object.

| Property | Value | Notes |
|---|---|---|
| `name` | `site.legalName` ("Ink Abba") | Matches the Google listing |
| `alternateName` | `site.name` ("InkAbba") | |
| `logo`, `image` | absolute URLs of `/brand/inkabba-logo.png` and the preview image | |
| `hasMap` | `facts.googleProfileUrl` | Only when it is set |
| `sameAs` | `[facts.googleProfileUrl]`, plus any future Yelp or Bing listing URLs | Only the ones that are set |
| `address` | `addressLocality`, `addressRegion`, `addressCountry` only | Never `streetAddress`, `postalCode` or `geo` |
| `areaServed` | from `facts.serviceAreas` (already coded) | Shows up automatically once Brian supplies the cities (§5) |
| `priceRange` | leave out | Until Brian gives one |

- Keep `@id` as `${site.url}/#business`. Other structured data refers to the business by this ID.
- **Done when:** Google's Rich Results Test and validator.schema.org report no errors and no street address, and the output contains no email address.

### SD-2. Services in structured data
- **Change:** each service page (`src/app/(site)/[service]/page.tsx`) outputs a `Service` item:
  - `name`: `service.eyebrow`
  - `description`: `service.metaDescription`
  - `url`: the page's canonical URL
  - `serviceType`: `service.eyebrow`
  - `provider`: `{ "@id": "${site.url}/#business" }`
  - `areaServed`: same as SD-1, only when set
- The business data in SD-1 adds `hasOfferCatalog`: an `OfferCatalog` listing each service by name and URL, generated from `services`.
- **Done when:** all 6 service pages pass the validator, and the catalog lists exactly the 6 entries in `services`.

### SD-3. Breadcrumbs
- **Change:** add `BreadcrumbList` structured data to the service pages (Home › Service) and request pages (Home › Find help › Request type). A visible breadcrumb is optional.
- **Done when:** the validator passes, and the breadcrumb names match the page headings.

### GEO-1. `llms.txt`
- **Change:** add `src/app/llms.txt/route.ts`, which returns `text/plain` generated from `site`, `facts` and `services`:
  1. a one-paragraph description;
  2. each service with its canonical URL and summary;
  3. hours, the phone number, the city, and the service area when set;
  4. how to get a quote: the request page URLs;
  5. hand-picked review quotes, at most 3, with first names only.

  No email address, street address or prices that aren't in `facts`.
- Exclude it from the sitemap; it is found at its standard path, `/llms.txt`.
- **Done when:** `GET /llms.txt` returns 200 as `text/plain` and contains no email address. A test checks that it updates when `services` changes.

### OPS-1. Tests and checks
The app has no test runner yet. The existing tests (`scripts/sheet.test.mjs`) use `node:test` with no extra dependencies, so follow that pattern.
- Add `scripts/check-seo.test.mjs`, which takes a base URL from `SITE_CHECK_URL` (default `http://localhost:3477`). It reads `/sitemap.xml`, fetches every page plus `/llms.txt`, and fails when:
  - a page lacks a title, a description, exactly one canonical tag, or `og:image`;
  - any page HTML, structured data block or `llms.txt` contains an email address, `streetAddress`, `postalCode` or `"geo"`;
  - a page's FAQ markup doesn't match its visible question headings.
- Add `"check:seo": "node --test scripts/check-seo.test.mjs"` to `package.json`. Run it against the dev server before each release, and against the live site after.
- Phase 2 added checks for the preview image's size, alt text and large-card setting, for FAQ answers appearing on the page, and for at least 2 questions per service page, each answered in 30 words or fewer.
- Re-run PageSpeed Insights (mobile) on the home page and one service page after each release, and record the scores in `reports/`.

## 4. Phase 2: page content and sharing

What visitors and link previews see. SEO-1, SEO-2, AEO-1 and AEO-2 were built on 2026-11-20 (the per-service preview images were skipped). GEO-2 is not started: it needs details from Brian (§5).

### SEO-1. Official-address tag on the home page
- **Problem:** `src/app/(site)/page.tsx` exports no metadata, so the home page is the only page without `<link rel="canonical">`.
- **Change:** export `metadata` with `alternates: { canonical: "/" }`.
- **Done when:** the home page HTML contains `<link rel="canonical" href="{SITE_URL}">`, and all 19 sitemap pages have exactly one canonical tag.

### SEO-2. Preview image for shared links
- **Problem:** no page has `og:image`, so links shared on Facebook, LinkedIn or by text show no image.
- **Change:**
  - Add `src/app/opengraph-image.png` at 1200×630: the logo from `public/brand/` and the line "Printer repair, toner and labels for your business" on the brand background. Add a matching `opengraph-image.alt.txt`.
  - In `src/app/layout.tsx`, set `twitter: { card: "summary_large_image" }`.
  - Optional: a `[service]/opengraph-image.png` for each service, using that service's photo from `public/images/services/`.
- **Done when:**
  - every page has an absolute `og:image` URL, with width and height;
  - Facebook's Sharing Debugger and LinkedIn's Post Inspector show the image;
  - PageSpeed performance stays at 95 or higher.

### AEO-1. Section headings as questions, with the answer first
- **Change:** in `src/content/services.ts`, reword the section headings below as the questions people actually search. Each body must open with a direct answer of 30 words or fewer. Then the heading, the answer and the FAQ markup (AEO-2) all come from one source.

| Page | Current heading | New heading | Body change |
|---|---|---|---|
| ink-toner | OEM, remanufactured or generic | What's the difference between OEM, remanufactured and generic toner? | None; it already answers first |
| ink-toner | Brands we supply | Which toner brands do you supply? | Start with "We supply …" |
| ink-toner | Warranty *(only when the fact is set)* | Is there a warranty on your cartridges? | None |
| printer-repair | Where we service | Which areas do you service? | None; it comes from `facts.serviceAreas` |
| printer-repair | Repair or replace? | Should I repair or replace my printer? | Start with "It depends on …" and give the rule of thumb |
| printer-repair | Before any work starts | Will I know the cost before any work starts? | Start with "Yes." |
| printer-repair | Repair warranty *(when set)* | Do you guarantee your repairs? | None |
| labels-ribbons | Direct thermal or thermal transfer | Do I need direct thermal or thermal transfer labels? | None |
| labels-ribbons | Choosing a ribbon | Which thermal ribbon do I need: wax, wax-resin or resin? | None |
| recycling | Recycling and buyback are separate | What's the difference between toner recycling and buyback? | None |
| recycling | Fees and credit *(when set)* | Do you pay for used or unused toner? | None |
| recycling | Please don't ship first | Can I ship my cartridges to you right away? | Start with "Please don't ship until we've confirmed …" |
| business-accounts | More than a source of supplies | Do you also service the printers? | Start with "Yes." Changed while building, so this page has 2 questions before payment terms are set |
| business-accounts | Repeat orders | How do repeat orders work? | None |
| business-accounts | Payment terms *(when set)* | What payment terms do you offer? | None |
| equipment | Brands we offer | Which printer and copier brands do you sell? | Write it as a sentence: "We offer …" |
| equipment | Not sure whether to replace? | Should I replace my printer or repair it? | None |

- Headings that aren't questions stay as they are, for example "Our technicians".
- **Done when:** at least 2 question headings on every service page, and every question body's first sentence works as a stand-alone answer.

### AEO-2. FAQ markup generated from the question headings
- **Change:** on each service page, output `FAQPage` structured data built from the sections whose heading ends in "?". The question is the heading and the answer is the body. Sections whose fact is unset are already left out, so they never appear in the markup.
- **Note:** since 2023 Google shows FAQ results in search only for government and health sites. This markup is for AI tools and answer engines, so don't expect visible FAQ results in Google.
- **Done when:** the markup on each page matches the visible questions exactly (Google requires this), and the validator passes.

### GEO-2. Specific detail on the service pages
- **Change:** add one concrete, checkable section to each service page where the facts allow it. For example: common error messages handled (repair), cartridge-number examples (ink-toner), label sizes and applications (labels). Write it only from details Brian confirms.
- **Done when:** each service page has at least 400 words of its own content (not counting the header, footer and forms).

## 5. Phase 3: needs answers from Brian

Each answer is a value in `facts` (`src/lib/site.ts`). Filling it in turns on content that is already built: page text, FAQ answers and structured data.

| Fact | Unlocks | Ask Brian |
|---|---|---|
| `serviceAreas` | `areaServed` on all pages, the "Which areas do you service?" answer, the Google listing's service areas | Which cities or ZIP codes do you actually serve, up to 20? |
| `diagnosticFee` | the "Will I know the cost…" answer | Is there a diagnostic or trip fee? Is it credited toward the repair? |
| `repairWarranty` | the "Do you guarantee your repairs?" FAQ | What warranty comes with a repair? |
| `recyclingTerms` | the "Do you pay for used or unused toner?" FAQ | What do you accept, and is there a fee or a credit? |
| `paymentTerms` | the "What payment terms…" FAQ | Net 30 for approved accounts, or something else? |
| `returnsPolicy` | the ordering page and the FAQ | Can unopened supplies be returned? Within how long? |
| `certifications` | the "Our technicians" section | Any named credentials, such as HP or Lexmark? |
| `googleWriteReviewUrl` | the "Leave us a review" button | His Google Business Profile "Ask for reviews" link |
| new: `deliveryTime` | a "How fast can you deliver toner?" FAQ on ink-toner | Typical delivery time for in-stock toner |

The new `deliveryTime` fact follows the existing pattern: `string | null`, not rendered while it's null.

## 6. Phase 4: Google Business Profile (Brian does these; no code)

1. **Hide the street address.** Edit profile → Business location → turn off "Show business address to customers". This is required for a business without a storefront; otherwise the listing risks suspension.
2. **Add service areas:** the same list as `facts.serviceAreas`, all within about 2 hours' drive.
3. **Main category:** the service that matters most, for example "Printer repair service" or "Toner cartridge supplier". Add the others as secondary categories.
4. **Services section:** toner, repair, labels and ribbons, recycling, equipment. Use the same names as the site's service pages.
5. **Hours:** Monday to Friday, 8:30 am to 3:30 pm, with the weekend closed. Make sure the weekend isn't set to open 24 hours.
6. **Website link:** inkabba.com. Once the domain moves, no change is needed.
7. **Reviews:** keep asking, and reply to each one. Send the "Ask for reviews" link for `facts.googleWriteReviewUrl`.
8. **Photos and posts:** add work photos regularly.
9. **Other directories** (Bing Places, Apple Business Connect, Yelp): same name, phone and hidden address. Add each listing's URL to `sameAs` (SD-1).

## 7. When inkabba.com moves to the new site

- Set `SITE_URL=https://inkabba.com` in Amplify, then rebuild. Canonical tags, the sitemap, structured data IDs, `llms.txt` and preview-image URLs all follow from it.
- Make the amplifyapp.com address stop competing in search: redirect it to inkabba.com, or send `X-Robots-Tag: noindex` on any host other than inkabba.com.
- Verify inkabba.com in Google Search Console and Bing Webmaster Tools, submit `/sitemap.xml`, and run the Rich Results Test on the home page and one service page.
- No page redirects are needed. The old site has only `/`.

## 8. Decided against, or deferred

| Item | Decision | Reason |
|---|---|---|
| Cloudflare Turnstile on forms | Deferred (user decision, 2026-11-18) | Revisit if fake requests show up in the leads sheet. Keep `SEND_ACK=false` until then. |
| `AggregateRating` or review stars in structured data | Won't do | Google doesn't show stars for reviews a business publishes about itself. It adds risk and no benefit. |
| One page per city ("Printer repair in Pomona") | Won't do | Google treats near-identical city pages as spam. The single service-area list in SD-1 and AEO-1 covers it. |
| Street address or map coordinates in structured data | Won't do | No storefront (§2). |

## 9. Order of work

1. **Phase 1 release:** SD-1, SD-2, SD-3, GEO-1, OPS-1. These change only the machine-readable output; the visible pages stay the same. OPS-1's FAQ check has nothing to compare until AEO-2 ships, so it passes trivially until then.
2. **Phase 2 release:** SEO-1, SEO-2, AEO-1, AEO-2. GEO-2 follows once Brian supplies the details it needs.
3. **When Brian answers (Phase 3):** fill in `facts` (§5). No code changes are needed beyond adding the `deliveryTime` field. Then finish GEO-2.
4. **Phase 4:** Brian updates his Google listing (§6). This can happen at any time, in parallel with the phases above.
5. **At the domain move:** §7.
6. **After each release:** re-run the checklist and PageSpeed, and update `reports/inkabba-site-comparison`.
