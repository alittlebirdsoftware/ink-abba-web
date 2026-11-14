import type { Metadata, Viewport } from "next";
import { Analytics } from "@/components/Analytics";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileCallBar } from "@/components/MobileCallBar";
import { facts, site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} | Business Ink, Toner & Printer Repair in ${site.base.city}, ${site.base.region}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  openGraph: { siteName: site.name, type: "website", locale: "en_US" },
};

export const viewport: Viewport = { themeColor: "#14213d" };

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
  email: site.email,
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
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
      </body>
    </html>
  );
}
