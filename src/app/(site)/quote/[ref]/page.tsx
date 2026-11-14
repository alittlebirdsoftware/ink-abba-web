import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcceptQuote } from "@/components/AcceptQuote";
import { PhoneLink } from "@/components/PhoneLink";
import { QuoteDocument } from "@/components/QuoteDocument";
import { container } from "@/components/ui";
import { formatDay, formatStamp, isExpired, quoteLabel } from "@/lib/quote";
import { getQuoteByRef } from "@/lib/server/quotes";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Quote", robots: { index: false, follow: false } };

/** A customer's private quote page, reached from the link in their email. */
export default async function QuotePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const quote = await getQuoteByRef(ref);
  if (!quote) notFound();

  const accepted = quote.status === "accepted";
  const expired = !accepted && isExpired(quote);

  return (
    <div className={`${container} py-10`}>
      <div className="mx-auto max-w-3xl">
      {accepted ? (
        <p role="status" className="mb-6 rounded-xl bg-green-50 p-4 font-semibold text-green-900 print:hidden">
          You approved this quote{quote.acceptedAt ? ` on ${formatStamp(quote.acceptedAt)}` : ""}. We&apos;ll be in touch
          to arrange the next step.
        </p>
      ) : expired ? (
        <p role="status" className="mb-6 rounded-xl bg-amber-50 p-4 font-semibold text-amber-900 print:hidden">
          This quote expired on {formatDay(quote.validUntil)}. Call or email us for current pricing.
        </p>
      ) : null}

      <QuoteDocument quote={quote} />

      <div className="mt-6">
        <AcceptQuote quoteRef={ref} canAccept={!accepted && !expired} />
        <p className="mt-4 text-muted print:hidden">
          Questions about {quoteLabel(quote.number)}? Call{" "}
          <PhoneLink location="quote" className="font-semibold text-ink underline" /> ({site.hours.display}) or reply to
          the email we sent.
        </p>
      </div>
      </div>
    </div>
  );
}
