import type { Metadata } from "next";
import Link from "next/link";
import { QuoteBuilder } from "@/components/admin/QuoteBuilder";
import { requests } from "@/content/requests";
import { defaultValidUntil, quoteLabel } from "@/lib/quote";
import { formFromQuote, type QuoteForm } from "@/lib/quoteForm";
import { requireOwner } from "@/lib/server/auth";
import { getLead } from "@/lib/server/leads";
import { getQuote } from "@/lib/server/quotes";

export const metadata: Metadata = { title: "New quote" };

/** A new quote: blank, started from a lead (?lead=), or copied from an earlier quote (?from=). */
export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ lead?: string; from?: string }> }) {
  await requireOwner();
  const { lead: leadId, from } = await searchParams;
  const lead = leadId ? await getLead(leadId) : null;
  const source = from ? await getQuote(Number(from)) : null;

  const initial: QuoteForm = source
    ? formFromQuote(source, defaultValidUntil())
    : {
        customer: {
          name: lead?.contact.name ?? "",
          company: lead?.contact.company ?? "",
          email: lead?.contact.email ?? "",
          phone: lead?.contact.phone ?? "",
        },
        items: [{ description: "", qty: "1", price: "" }],
        shipping: "",
        taxRate: "",
        notes: "",
        validUntil: defaultValidUntil(),
      };

  return (
    <>
      <h1 className="text-2xl font-bold">New quote</h1>
      {lead ? (
        <p className="mt-1 text-muted">
          For{" "}
          <Link href={`/admin/leads/${lead.id}`} className="font-semibold text-brand hover:underline">
            {lead.contact.name}&apos;s request
          </Link>{" "}
          ({requests[lead.type].title}).
        </p>
      ) : source ? (
        <p className="mt-1 text-muted">Copied from {quoteLabel(source.number)}. It gets a new number.</p>
      ) : (
        <p className="mt-1 text-muted">For a customer who called or emailed.</p>
      )}
      <div className="mt-6">
        <QuoteBuilder leadId={lead?.id ?? source?.leadId ?? null} initial={initial} />
      </div>
    </>
  );
}
