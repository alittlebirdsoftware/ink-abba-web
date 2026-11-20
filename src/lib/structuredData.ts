/**
 * Schema.org structured data, built only from `site`, `facts` and `services`
 * so it never says more than the pages do.
 *
 * InkAbba has no storefront: the business is placed by city and service area
 * only. Never add streetAddress, postalCode or geo here, and never the email.
 * (docs/specs/local-search-seo-geo-aeo.md, SD-1 to SD-3 and AEO-2)
 */
import { services, type Service } from "@/content/services";
import { facts, site } from "@/lib/site";

type Json = Record<string, unknown>;

export const businessId = `${site.url}/#business`;

const absolute = (path: string) => (path === "/" ? site.url : `${site.url}${path}`);

/** Cities served, or nothing until the owner confirms them. */
function areaServed(): Json {
  return facts.serviceAreas.length > 0
    ? { areaServed: facts.serviceAreas.map((name) => ({ "@type": "City", name })) }
    : {};
}

/** The business, on every public page. */
export function localBusiness(): Json {
  const profiles = [facts.googleProfileUrl].filter((url): url is string => Boolean(url));
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": businessId,
    // The Google listing's spelling, so search engines match the two.
    name: site.legalName,
    alternateName: site.name,
    url: site.url,
    logo: absolute("/brand/inkabba-logo.png"),
    image: absolute("/brand/inkabba-logo.png"),
    telephone: site.phone.e164,
    description: site.description,
    address: {
      "@type": "PostalAddress",
      addressLocality: site.base.city,
      addressRegion: site.base.region,
      addressCountry: "US",
    },
    ...areaServed(),
    ...(facts.googleProfileUrl ? { hasMap: facts.googleProfileUrl } : {}),
    ...(profiles.length > 0 ? { sameAs: profiles } : {}),
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: site.hours.days,
        opens: site.hours.opens,
        closes: site.hours.closes,
      },
    ],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: service.eyebrow, url: absolute(`/${service.slug}`) },
      })),
    },
  };
}

/** One service, on its own page. */
export function serviceData(service: Service): Json {
  const url = absolute(`/${service.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: service.eyebrow,
    serviceType: service.eyebrow,
    description: service.metaDescription,
    url,
    provider: { "@id": businessId },
    ...areaServed(),
  };
}

/** The sections whose heading is a question. They are shown on the page, so they can be marked up. */
function questions(service: Service): { heading: string; body: string }[] {
  return service.sections.filter((section) => section.heading.endsWith("?"));
}

/**
 * FAQ markup for a service page, built from the same sections the page shows,
 * so the two can never differ. Null when the page asks no questions.
 */
export function faqPage(service: Service): Json | null {
  const asked = questions(service);
  if (asked.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${absolute(`/${service.slug}`)}#faq`,
    mainEntity: asked.map((section) => ({
      "@type": "Question",
      name: section.heading,
      acceptedAnswer: { "@type": "Answer", text: section.body },
    })),
  };
}

/** Home › … › current page. Each crumb is a name and a site path. */
export function breadcrumbs(crumbs: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

/** Serialises for a <script type="application/ld+json">, so "<" in text can never close the tag. */
export function toJsonLd(data: Json | Json[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
