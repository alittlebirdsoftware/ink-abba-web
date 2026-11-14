import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { QuoteBuilder } from "@/components/admin/QuoteBuilder";
import { quoteLabel } from "@/lib/quote";
import { formFromQuote } from "@/lib/quoteForm";
import { requireOwner } from "@/lib/server/auth";
import { getQuote } from "@/lib/server/quotes";

export const metadata: Metadata = { title: "Edit quote" };

/** Edits a draft. Once a quote has been sent it is fixed, so this sends the owner to the read-only view. */
export default async function EditQuotePage({ params }: { params: Promise<{ number: string }> }) {
  await requireOwner();
  const quote = await getQuote(Number((await params).number));
  if (!quote) notFound();
  if (quote.status !== "draft") redirect(`/admin/quotes/${quote.number}`);

  return (
    <>
      <h1 className="text-2xl font-bold">Draft {quoteLabel(quote.number)}</h1>
      <div className="mt-6">
        <QuoteBuilder number={quote.number} leadId={quote.leadId} initial={formFromQuote(quote)} />
      </div>
    </>
  );
}
