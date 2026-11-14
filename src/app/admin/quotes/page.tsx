import type { Metadata } from "next";
import Link from "next/link";
import { Badge, FilterBar, matches } from "@/components/admin/bits";
import { buttonStyles } from "@/components/ui";
import { formatWhen } from "@/lib/format";
import { QUOTE_STATUSES, money, quoteLabel, quoteTotals } from "@/lib/quote";
import { requireOwner } from "@/lib/server/auth";
import { listQuotes } from "@/lib/server/quotes";

export const metadata: Metadata = { title: "Quotes" };

/** Every quote, searchable: this is where the owner finds one when a customer calls. */
export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireOwner();
  const { q = "", status = "" } = await searchParams;
  const all = await listQuotes();
  const quotes = all.filter(
    (quote) =>
      (!status || quote.status === status) &&
      matches(
        q,
        quoteLabel(quote.number),
        quote.number,
        quote.customer.name,
        quote.customer.company,
        quote.customer.email,
        quote.customer.phone,
        ...quote.items.map((item) => item.description),
      ),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <Link href="/admin/quotes/new" className={buttonStyles.primary}>
          New Quote
        </Link>
      </div>
      <div className="mt-6">
        <FilterBar q={q} status={status} statuses={QUOTE_STATUSES} placeholder="Search number, customer, company, item…" />
      </div>
      {quotes.length === 0 ? (
        <p className="mt-10 text-muted">{all.length === 0 ? "No quotes yet." : "No quotes match that search."}</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {quotes.map((quote) => (
            <li key={quote.number}>
              <Link
                href={`/admin/quotes/${quote.number}`}
                className="grid gap-1 py-3 hover:bg-mist sm:grid-cols-[5rem_1fr_7rem_8rem_auto] sm:items-center sm:gap-4 sm:px-2"
              >
                <span className="font-semibold">{quoteLabel(quote.number)}</span>
                <span>
                  <span className="font-semibold">{quote.customer.name}</span>
                  {quote.customer.company ? <span className="text-muted"> · {quote.customer.company}</span> : null}
                </span>
                <span className="tabular-nums sm:text-right">{money(quoteTotals(quote).total)}</span>
                <span className="text-sm text-muted">{formatWhen(quote.sentAt ?? quote.createdAt)}</span>
                <Badge status={quote.status} label={quote.status === "accepted" ? "approved" : undefined} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
