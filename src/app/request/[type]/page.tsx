import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhoneLink } from "@/components/PhoneLink";
import { RequestForm } from "@/components/RequestForm";
import { PageHeader, container } from "@/components/ui";
import { REQUEST_TYPES, isRequestType, requests } from "@/content/requests";
import { facts, site } from "@/lib/site";

type Props = { params: Promise<{ type: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return REQUEST_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  if (!isRequestType(type)) return {};
  return {
    title: requests[type].title,
    description: requests[type].lead,
    alternates: { canonical: `/request/${type}` },
  };
}

export default async function RequestPage({ params }: Props) {
  const { type } = await params;
  if (!isRequestType(type)) notFound();
  const def = requests[type];

  return (
    <div className={`${container} py-10 lg:py-14`}>
      <PageHeader eyebrow="Request" title={def.title} intro={def.lead} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <RequestForm def={def} replyTime={facts.replyTime} />
        <aside className="h-fit space-y-4 rounded-2xl bg-mist p-6">
          <h2 className="text-lg font-bold">What happens next</h2>
          <p className="leading-relaxed text-muted">{def.note}</p>
          {facts.replyTime ? <p className="font-semibold">We reply {facts.replyTime}.</p> : null}
          <p>
            Prefer to talk?
            <br />
            <PhoneLink location={`request_${type}`} className="text-lg font-bold text-brand hover:underline" />
            <br />
            <span className="text-sm text-muted">{site.hours.display}</span>
          </p>
          <p className="text-sm">
            <Link href="/find-help" className="font-semibold text-brand hover:underline">
              Not the right form? →
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
