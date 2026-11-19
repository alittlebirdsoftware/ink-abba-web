import { REQUEST_TYPES, requests } from "@/content/requests";
import { services } from "@/content/services";
import { facts, replyPromise, site } from "@/lib/site";

/**
 * /llms.txt: a plain-text summary of the business for AI assistants
 * (docs/specs/local-search-seo-geo-aeo.md, GEO-1). Built from the same data
 * as the pages, so it never says more than they do. No street address (there
 * is no storefront) and no email address (kept away from scrapers).
 */
export const dynamic = "force-static";

const url = (path: string) => `${site.url}${path}`;

function buildLlmsTxt(): string {
  const lines: string[] = [
    `# ${site.legalName} (${site.name})`,
    "",
    `> ${site.description}`,
    "",
    `${site.legalName} is a family-owned business based in ${site.base.city}, ${site.base.regionName}, serving businesses for ${site.yearsInBusiness}. ` +
      "There is no storefront or walk-in counter: supplies are delivered and repairs are arranged by request.",
    "",
    "## Services",
    "",
    ...services.map((service) => `- [${service.eyebrow}](${url(`/${service.slug}`)}): ${service.summary}`),
    "",
    "## Contact",
    "",
    `- Phone: ${site.phone.display}`,
    `- Hours: ${site.hours.display}`,
    `- Based in: ${site.base.city}, ${site.base.region}`,
    ...(facts.serviceAreas.length > 0 ? [`- Service area: ${facts.serviceAreas.join(", ")}`] : []),
    ...(replyPromise ? [`- ${replyPromise}`] : []),
    `- Brands supplied: ${site.supplyBrands.join(", ")}`,
    "",
    "## Ask for a quote",
    "",
    ...REQUEST_TYPES.map((type) => `- [${requests[type].title}](${url(`/request/${type}`)}): ${requests[type].lead}`),
  ];

  const reviews = facts.reviews.slice(0, 3);
  if (reviews.length > 0) {
    lines.push(
      "",
      "## What customers say",
      "",
      // First names only: the full names stay on the site, not in a file built for collection.
      ...reviews.map((review) => `- "${review.quote}" (${review.name.split(" ")[0]}, Google review)`),
    );
  }

  lines.push("", "## More", "", `- [About](${url("/about")})`, `- [How ordering works](${url("/ordering")})`, `- [Contact](${url("/contact")})`, "");
  return lines.join("\n");
}

export function GET() {
  return new Response(buildLlmsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
