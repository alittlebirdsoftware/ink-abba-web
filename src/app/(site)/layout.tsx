import { Analytics } from "@/components/Analytics";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileCallBar } from "@/components/MobileCallBar";
import { facts, site } from "@/lib/site";

/**
 * LocalBusiness structured data. No street address is published: without a
 * staffed storefront the business is described by the area it serves.
 */
const localBusiness = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${site.url}/#business`,
  name: site.name,
  url: site.url,
  telephone: site.phone.e164,
  description: site.description,
  address: {
    "@type": "PostalAddress",
    addressLocality: site.base.city,
    addressRegion: site.base.region,
    addressCountry: "US",
  },
  ...(facts.serviceAreas.length > 0
    ? { areaServed: facts.serviceAreas.map((name) => ({ "@type": "City", name })) }
    : {}),
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: site.hours.days,
      opens: site.hours.opens,
      closes: site.hours.closes,
    },
  ],
};

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <MobileCallBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      <Analytics />
    </>
  );
}
