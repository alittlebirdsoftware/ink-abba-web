import { Analytics } from "@/components/Analytics";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileCallBar } from "@/components/MobileCallBar";
import { localBusiness, toJsonLd } from "@/lib/structuredData";

// Business structured data on every public page. See lib/structuredData.ts.
const businessJsonLd = toJsonLd(localBusiness());

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: businessJsonLd }} />
      <Analytics />
    </>
  );
}
