import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/admin/bits";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { buttonStyles } from "@/components/ui";
import { requests } from "@/content/requests";
import { formatWhen } from "@/lib/format";
import { money, quoteLabel, quoteTotals } from "@/lib/quote";
import { requireOwner } from "@/lib/server/auth";
import { getLead } from "@/lib/server/leads";
import { listQuotes } from "@/lib/server/quotes";
import { uploadViewUrl } from "@/lib/server/uploads";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const lead = await getLead((await params).id);
  if (!lead) notFound();

  const def = requests[lead.type];
  const quotes = (await listQuotes()).filter((quote) => quote.leadId === lead.id);
  const fileUrl = lead.attachmentKey ? await uploadViewUrl(lead.attachmentKey).catch(() => null) : null;

  return (
    <>
      <p className="text-sm">
        <Link href="/admin" className="font-semibold text-brand hover:underline">
          ← All leads
        </Link>
      </p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {lead.contact.name}
            {lead.contact.company ? <span className="font-normal text-muted"> · {lead.contact.company}</span> : null}
          </h1>
          <p className="text-muted">
            {def.title} · {formatWhen(lead.createdAt)}
          </p>
        </div>
        <Link href={`/admin/quotes/new?lead=${lead.id}`} className={buttonStyles.primary}>
          Write a Quote
        </Link>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section aria-labelledby="request-heading" className="rounded-2xl border border-line p-6">
          <h2 id="request-heading" className="text-lg font-bold">
            What they asked for
          </h2>
          <dl className="mt-3 divide-y divide-line">
            {def.fields
              .filter((field) => lead.details[field.name])
              .map((field) => (
                <div key={field.name} className="py-3">
                  <dt className="text-sm font-semibold text-muted">{field.label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words">{lead.details[field.name]}</dd>
                </div>
              ))}
            {lead.contact.notes ? (
              <div className="py-3">
                <dt className="text-sm font-semibold text-muted">Anything else</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words">{lead.contact.notes}</dd>
              </div>
            ) : null}
            {lead.attachmentKey ? (
              <div className="py-3">
                <dt className="text-sm font-semibold text-muted">Attachment</dt>
                <dd className="mt-0.5">
                  {fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener" className="font-semibold text-brand hover:underline">
                      Open the customer&apos;s file
                    </a>
                  ) : (
                    "A file was attached; it was also sent with the lead email."
                  )}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="contact-heading" className="rounded-2xl bg-mist p-6">
            <h2 id="contact-heading" className="text-lg font-bold">
              Reach them
            </h2>
            <p className="mt-2">
              <a href={`mailto:${lead.contact.email}`} className="font-semibold text-brand hover:underline">
                {lead.contact.email}
              </a>
              {lead.contact.phone ? (
                <>
                  <br />
                  <a href={`tel:${lead.contact.phone.replace(/[^\d+]/g, "")}`} className="font-semibold text-brand hover:underline">
                    {lead.contact.phone}
                  </a>
                </>
              ) : null}
            </p>
            <div className="mt-4">
              <StatusSelect leadId={lead.id} status={lead.status} />
            </div>
          </section>

          <section aria-labelledby="quotes-heading" className="rounded-2xl border border-line p-6">
            <h2 id="quotes-heading" className="text-lg font-bold">
              Quotes
            </h2>
            {quotes.length === 0 ? (
              <p className="mt-2 text-muted">None yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {quotes.map((quote) => (
                  <li key={quote.number}>
                    <Link href={`/admin/quotes/${quote.number}`} className="flex items-center justify-between gap-3 py-2 hover:text-brand">
                      <span className="font-semibold">{quoteLabel(quote.number)}</span>
                      <span className="tabular-nums">{money(quoteTotals(quote).total)}</span>
                      <Badge status={quote.status} label={quote.status === "accepted" ? "approved" : undefined} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
