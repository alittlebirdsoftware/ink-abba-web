import type { Metadata } from "next";
import { PhoneLink } from "@/components/PhoneLink";
import { RequestForm } from "@/components/RequestForm";
import { PageHeader, container } from "@/components/ui";
import { requests } from "@/content/requests";
import { facts, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Call ${site.phone.display} or send a question. ${site.name} is based in ${site.base.city}, ${site.base.region}. ${site.hours.display}.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className={`${container} py-12 lg:py-16`}>
      <PageHeader
        eyebrow="Contact"
        title="Talk to a person."
        intro="Ask a question, check on an order, or tell us what you need."
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.6fr]">
        <aside className="h-fit space-y-5 rounded-2xl bg-mist p-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Call</h2>
            <PhoneLink location="contact" className="text-2xl font-bold text-brand hover:underline" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Email</h2>
            <a href={`mailto:${site.email}`} className="font-semibold hover:text-brand">
              {site.email}
            </a>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Hours</h2>
            <p>{site.hours.display}</p>
            <p className="text-sm text-muted">Closed Saturday and Sunday</p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Where we are</h2>
            <p>
              Based in {site.base.city}, {site.base.regionName}.
            </p>
            {facts.serviceAreas.length > 0 ? (
              <p className="text-sm text-muted">On-site repair in {facts.serviceAreas.join(", ")}.</p>
            ) : null}
            {facts.walkIn ? null : (
              <p className="mt-1 text-sm text-muted">
                We don&apos;t have a walk-in counter. Supplies ship to you, and repairs are arranged by request.
              </p>
            )}
          </div>
        </aside>
        <RequestForm def={requests.question} replyTime={facts.replyTime} />
      </div>
    </div>
  );
}
