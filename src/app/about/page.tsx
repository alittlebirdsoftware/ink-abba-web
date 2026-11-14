import type { Metadata } from "next";
import { ButtonLink, PageHeader, container } from "@/components/ui";
import { facts, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.name} is a family-owned ${site.base.city} business that has supplied toner and repaired printers and copiers for ${site.yearsInBusiness}.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className={`${container} py-12 lg:py-16`}>
      <PageHeader
        eyebrow="About InkAbba"
        title="A family business that keeps offices printing."
        intro={`${site.name} is a family-owned company in ${site.base.city}, ${site.base.regionName}. We've offered copier repair, toner and printer components for ${site.yearsInBusiness}.`}
      />

      <div className="mt-10 grid max-w-4xl gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold">People before the money</h2>
          <p className="mt-2 leading-relaxed text-muted">
            Our commitment is to put people first and to offer a good product at a fair price. We know how much your
            business depends on its printers, so we go the extra mile to get them working again.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold">More than a source of supplies</h2>
          <p className="mt-2 leading-relaxed text-muted">
            A supplier should be a partner, not a checkout page. We help you identify the right cartridge, quote OEM,
            remanufactured and generic options, and tell you plainly when a machine is worth repairing.
          </p>
        </section>
        {facts.certifications.length > 0 ? (
          <section>
            <h2 className="text-xl font-bold">Our technicians</h2>
            <p className="mt-2 leading-relaxed text-muted">Credentials: {facts.certifications.join(", ")}.</p>
          </section>
        ) : null}
        {facts.serviceAreas.length > 0 ? (
          <section>
            <h2 className="text-xl font-bold">Where we work</h2>
            <p className="mt-2 leading-relaxed text-muted">
              On-site repair in {facts.serviceAreas.join(", ")}. Supplies ship to businesses anywhere.
            </p>
          </section>
        ) : null}
      </div>

      {/* TODO(owner): add real photos of the team, a repair in progress and the equipment you service. */}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/find-help">Tell Us What You Need</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Contact Us
        </ButtonLink>
      </div>
    </div>
  );
}
