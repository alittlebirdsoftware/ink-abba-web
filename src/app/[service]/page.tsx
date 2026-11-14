import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhoneLink } from "@/components/PhoneLink";
import { ButtonLink, FaqJsonLd, FaqList, PageHeader, container } from "@/components/ui";
import { requests } from "@/content/requests";
import { getService, services } from "@/content/services";
import { facts } from "@/lib/site";

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
  const request = requests[service.request];

  return (
    <div className={`${container} py-12 lg:py-16`}>
      <PageHeader eyebrow={service.eyebrow} title={service.title} intro={service.intro} />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ButtonLink href={`/request/${service.request}`}>{request.title}</ButtonLink>
        <p className="text-sm text-muted">
          or call <PhoneLink location={`service_${service.slug}`} className="font-semibold text-ink underline" />
          {facts.replyTime ? ` · we reply ${facts.replyTime}` : null}
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          {service.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-bold">{section.heading}</h2>
              <p className="mt-2 leading-relaxed text-muted">{section.body}</p>
            </section>
          ))}
        </div>

        <aside className="h-fit rounded-2xl bg-mist p-6">
          <h2 className="text-lg font-bold">What to send us</h2>
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
          <p className="mt-4 text-sm text-muted">Don&apos;t have all of it? Send what you have.</p>
        </aside>
      </div>

      <FaqList faqs={service.faqs} />
      <FaqJsonLd faqs={service.faqs} />

      <p className="mt-12 text-muted">
        Not the right page?{" "}
        <Link href="/find-help" className="font-semibold text-brand hover:underline">
          Find the right help →
        </Link>
      </p>
    </div>
  );
}
