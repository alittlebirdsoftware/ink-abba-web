import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbs, faqPage, serviceData, toJsonLd } from "@/lib/structuredData";
import { PhoneLink } from "@/components/PhoneLink";
import { RequestForm } from "@/components/RequestForm";
import { PageHeader, container } from "@/components/ui";
import { requests } from "@/content/requests";
import { getService, services } from "@/content/services";
import { replyPromise, site } from "@/lib/site";

type Props = { params: Promise<{ service: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return services.map((service) => ({ service: service.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = getService((await params).service);
  if (!service) return {};
  return {
    title: service.metaTitle,
    description: service.metaDescription,
    alternates: { canonical: `/${service.slug}` },
  };
}

export default async function ServicePage({ params }: Props) {
  const service = getService((await params).service);
  if (!service) notFound();
  const faq = faqPage(service);

  return (
    <div className={`${container} py-10 lg:py-14`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: toJsonLd([
            serviceData(service),
            breadcrumbs([
              { name: "Home", path: "/" },
              { name: service.eyebrow, path: `/${service.slug}` },
            ]),
            ...(faq ? [faq] : []),
          ]),
        }}
      />
      <PageHeader eyebrow={service.eyebrow} title={service.title} intro={service.intro} />

      {/* Customers arrive needing it now, so the form is on the page: no extra click. */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <RequestForm def={requests[service.request]} />

        <aside className="h-fit space-y-5 rounded-2xl bg-mist p-6">
          <div>
            <h2 className="text-lg font-bold">Need it now? Call.</h2>
            <PhoneLink
              location={`service_${service.slug}`}
              className="mt-1 block text-2xl font-bold text-brand hover:underline"
            />
            <p className="text-sm text-muted">{site.hours.display}</p>
            {replyPromise ? <p className="mt-2 font-semibold">{replyPromise}</p> : null}
          </div>
          <div>
            <h2 className="text-lg font-bold">What helps us help you</h2>
            <ul className="mt-3 space-y-2">
              {service.send.map((item) => (
                <li key={item} className="flex gap-3 leading-snug">
                  <span aria-hidden className="font-bold text-brand">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted">Don&apos;t have all of it? Send what you have.</p>
          </div>
        </aside>
      </div>

      <div className="mt-14 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {service.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-bold">{section.heading}</h2>
            <p className="mt-2 leading-relaxed text-muted">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 text-muted">
        Not the right page?{" "}
        <Link href="/find-help" className="font-semibold text-brand hover:underline">
          Find the right help →
        </Link>
      </p>
    </div>
  );
}
