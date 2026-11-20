// SEO, structured-data and privacy checks against a running copy of the site
// (docs/specs/local-search-seo-geo-aeo.md, OPS-1).
//
//   npm run check:seo                                   # dev server on :3477
//   SITE_CHECK_URL=https://… npm run check:seo          # any deployed copy
//
import test from "node:test";
import assert from "node:assert/strict";

const BASE = (process.env.SITE_CHECK_URL ?? "http://localhost:3477").replace(/\/$/, "");

// No storefront and a private inbox: none of these may appear anywhere public.
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9-]+(\.[A-Z0-9-]+)*\.[A-Z]{2,}\b/gi;
const STREET = /Peyton/i;
const FORBIDDEN_KEYS = ["streetAddress", "postalCode", "geo"];

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (html) => decode(html.replace(/<[^>]+>/g, "").trim());
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

async function get(path) {
  const res = await fetch(BASE + path, { redirect: "manual" });
  return { status: res.status, type: res.headers.get("content-type") ?? "", body: await res.text() };
}

/** Page paths from the sitemap, which lists absolute URLs on the configured SITE_URL. */
async function sitemapPaths() {
  const { body } = await get("/sitemap.xml");
  return all(body, /<loc>([^<]+)<\/loc>/g).map((loc) => new URL(loc).pathname.replace(/\/$/, "") || "/");
}

/** Every JSON-LD node on the page, with @graph and arrays flattened. */
function jsonLd(html) {
  return all(html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g).flatMap((raw) => {
    const data = JSON.parse(raw);
    return [data].flat().flatMap((node) => node["@graph"] ?? [node]);
  });
}

function keysDeep(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => keysDeep(v, found));
  else if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      found.add(k);
      keysDeep(v, found);
    }
  return found;
}

/** Email-like strings, ignoring image density suffixes such as logo@2x.png. */
const emails = (s) => (s.match(EMAIL) ?? []).filter((m) => !/@\dx\./i.test(m));

const paths = await sitemapPaths();
const pages = new Map();
for (const path of paths) pages.set(path, await get(path));

test("the sitemap lists pages, and each one loads", () => {
  assert.ok(paths.length >= 19, `expected at least 19 pages, got ${paths.length}`);
  for (const [path, page] of pages) assert.equal(page.status, 200, path);
});

test("every page has a title and a description", () => {
  for (const [path, { body }] of pages) {
    assert.ok(/<title>[^<]{10,}<\/title>/.test(body), `${path}: title`);
    assert.ok(/<meta name="description" content="[^"]{30,}"/.test(body), `${path}: description`);
  }
});

test("every page has exactly one canonical tag", () => {
  for (const [path, { body }] of pages) {
    assert.equal(all(body, /<link rel="canonical" href="([^"]+)"/g).length, 1, path);
  }
});

test("every page has a large preview image, with its size and alt text", () => {
  for (const [path, { body }] of pages) {
    assert.ok(/<meta property="og:image" content="https?:\/\/[^"]+"/.test(body), `${path}: og:image`);
    assert.ok(/<meta property="og:image:width" content="1200"/.test(body), `${path}: og:image:width`);
    assert.ok(/<meta property="og:image:height" content="630"/.test(body), `${path}: og:image:height`);
    assert.ok(/<meta property="og:image:alt" content="[^"]{10,}"/.test(body), `${path}: og:image:alt`);
    assert.ok(/<meta name="twitter:card" content="summary_large_image"/.test(body), `${path}: twitter:card`);
  }
});

test("no page shows an email address or the street address", () => {
  for (const [path, { body }] of pages) {
    assert.deepEqual(emails(body), [], `${path}: email`);
    assert.ok(!STREET.test(body), `${path}: street address`);
  }
});

test("every page carries the business data, with no street address, map coordinates or email", () => {
  for (const [path, { body }] of pages) {
    const nodes = jsonLd(body);
    const business = nodes.find((n) => n["@type"] === "LocalBusiness");
    assert.ok(business, `${path}: LocalBusiness`);
    assert.equal(business.name, "Ink Abba", `${path}: name matches the Google listing`);
    assert.ok(business["@id"]?.endsWith("/#business"), `${path}: @id`);
    assert.ok(business.address?.addressLocality, `${path}: city`);
    const keys = keysDeep(nodes);
    for (const key of FORBIDDEN_KEYS) assert.ok(!keys.has(key), `${path}: ${key} must not be published`);
    assert.deepEqual(emails(JSON.stringify(nodes)), [], `${path}: email in structured data`);
  }
});

test("the business lists every service in its catalog", () => {
  const business = jsonLd(pages.get("/").body).find((n) => n["@type"] === "LocalBusiness");
  const offered = business.hasOfferCatalog.itemListElement.map((o) => new URL(o.itemOffered.url).pathname);
  const servicePaths = paths.filter((p) => pages.get(p).body.includes('"@type":"Service","@id"'));
  assert.equal(offered.length, 6);
  assert.deepEqual([...offered].sort(), [...servicePaths].sort());
});

test("service pages describe the service and link back to the business", () => {
  const servicePages = [...pages].filter(([, { body }]) => jsonLd(body).some((n) => n["@type"] === "Service"));
  assert.equal(servicePages.length, 6);
  for (const [path, { body }] of servicePages) {
    const nodes = jsonLd(body);
    const service = nodes.find((n) => n["@type"] === "Service");
    assert.ok(service.provider?.["@id"]?.endsWith("/#business"), `${path}: provider`);
    assert.equal(new URL(service.url).pathname, path, `${path}: url`);
    const crumbs = nodes.find((n) => n["@type"] === "BreadcrumbList");
    assert.ok(crumbs, `${path}: breadcrumbs`);
    assert.equal(crumbs.itemListElement.length, 2, `${path}: Home › Service`);
  }
});

test("request pages have breadcrumbs that match the page heading", () => {
  for (const [path, { body }] of pages) {
    if (!path.startsWith("/request/")) continue;
    const crumbs = jsonLd(body).find((n) => n["@type"] === "BreadcrumbList");
    assert.ok(crumbs, `${path}: breadcrumbs`);
    const names = crumbs.itemListElement.map((i) => i.name);
    assert.deepEqual(names.slice(0, 2), ["Home", "Find help"], path);
    assert.equal(names[2], text(all(body, /<h1[^>]*>([\s\S]*?)<\/h1>/g)[0] ?? ""), `${path}: last crumb = h1`);
  }
});

test("FAQ markup matches the questions and answers shown on the page", () => {
  for (const [path, { body }] of pages) {
    const faq = jsonLd(body).find((n) => n["@type"] === "FAQPage");
    if (!faq) continue;
    const shown = all(body, /<h[23][^>]*>([\s\S]*?)<\/h[23]>/g).map(text).filter((h) => h.endsWith("?"));
    const marked = faq.mainEntity.map((q) => q.name);
    assert.deepEqual(marked, shown.filter((q) => marked.includes(q)), `${path}: order`);
    // Page text without the structured data, which repeats the answers.
    const visible = text(body.replace(/<script[\s\S]*?<\/script>/g, ""));
    for (const q of faq.mainEntity) {
      assert.ok(shown.includes(q.name), `${path}: "${q.name}" is marked up but not shown`);
      assert.ok(visible.includes(q.acceptedAnswer.text), `${path}: the answer to "${q.name}" is not shown`);
    }
  }
});

test("every service page asks at least two questions, each answered in its first sentence", () => {
  const servicePages = [...pages].filter(([, { body }]) => jsonLd(body).some((n) => n["@type"] === "Service"));
  for (const [path, { body }] of servicePages) {
    const faq = jsonLd(body).find((n) => n["@type"] === "FAQPage");
    assert.ok(faq?.mainEntity.length >= 2, `${path}: at least 2 questions`);
    for (const q of faq.mainEntity) {
      const first = q.acceptedAnswer.text.split(/(?<=[.!?])\s/)[0];
      assert.ok(first.split(/\s+/).length <= 30, `${path}: "${q.name}" opens with ${first.split(/\s+/).length} words`);
    }
  }
});

test("llms.txt is plain text, lists every service, and has no email or street address", async () => {
  const { status, type, body } = await get("/llms.txt");
  assert.equal(status, 200);
  assert.match(type, /^text\/plain/);
  assert.deepEqual(emails(body), []);
  assert.ok(!STREET.test(body));
  const servicePaths = paths.filter((p) => jsonLd(pages.get(p).body).some((n) => n["@type"] === "Service"));
  for (const p of servicePaths) assert.ok(body.includes(`${p})`), `llms.txt lists ${p}`);
});
