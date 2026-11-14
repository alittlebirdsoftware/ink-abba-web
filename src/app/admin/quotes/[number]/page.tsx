import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/admin/bits";
import { QuoteActions } from "@/components/admin/QuoteActions";
import { QuoteDocument } from "@/components/QuoteDocument";
import { buttonStyles } from "@/components/ui";
import { formatWhen } from "@/lib/format";
import { isExpired, quoteLabel, quotePath } from "@/lib/quote";
import { requireOwner } from "@/lib/server/auth";
import { config } from "@/lib/server/config";
import { getQuote } from "@/lib/server/quotes";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Quote" };

export default async function QuotePage({ params }: { params: Promise<{ number: string }> }) {
  await requireOwner();
  const quote = await getQuote(Number((await params).number));
  if (!quote) notFound();

  const requestHeaders = await headers();
  const base = config.isProduction ? site.url : `http://${requestHeaders.get("host")}`;
  const expired = quote.status === "sent" && isExpired(quote);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm print:hidden">
        <Link href="/admin/quotes" className="font-semibold text-brand hover:underline">
          ← All quotes
        </Link>
        {quote.leadId ? (
          <>
            {" · "}
            <Link href={`/admin/leads/${quote.leadId}`} className="font-semibold text-brand hover:underline">
              The request it answers
            </Link>
          </>
        ) : null}
      </p>

      <div className="mb-5 mt-3 flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="text-2xl font-bold">{quoteLabel(quote.number)}</h1>
        <Badge status={quote.status} label={quote.status === "accepted" ? "approved" : undefined} />
        {expired ? <Badge status="lost" label="expired" /> : null}
        <p className="text-sm text-muted">
          {quote.status === "draft"
            ? "Not sent yet."
            : `Sent ${formatWhen(quote.sentAt ?? quote.createdAt)}.${quote.acceptedAt ? ` Approved ${formatWhen(quote.acceptedAt)}.` : ""}`}
        </p>
      </div>

      <QuoteDocument quote={quote} />

      <div className="mt-6 space-y-4 print:hidden">
        {quote.status === "draft" ? (
          <Link href={`/admin/quotes/${quote.number}/edit`} className={buttonStyles.primary}>
            Edit and Send
          </Link>
        ) : (
          <QuoteActions number={quote.number} customerEmail={quote.customer.email} link={`${base}${quotePath(quote)}`} />
        )}
        <p>
          <Link href={`/admin/quotes/new?from=${quote.number}`} className="font-semibold text-brand hover:underline">
            Copy to a new quote
          </Link>
          <span className="text-muted"> to revise pricing or quote the same items again.</span>
        </p>
      </div>
    </div>
  );
}
