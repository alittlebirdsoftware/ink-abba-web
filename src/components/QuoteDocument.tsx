import { formatDay, formatStamp, money, quoteLabel, quoteTotals, type Quote } from "@/lib/quote";
import { site } from "@/lib/site";

/** The quote as the customer sees it. Used on their page and in the owner's view of it. */
export function QuoteDocument({ quote }: { quote: Quote }) {
  const totals = quoteTotals(quote);
  return (
    <article className="rounded-2xl border border-line bg-white p-6 sm:p-8 print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-extrabold tracking-tight">
            Ink<span className="text-brand">Abba</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {site.phone.display} · {site.email}
          </p>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold">Quote {quoteLabel(quote.number)}</h1>
          <p className="text-sm text-muted">
            {formatStamp(quote.sentAt ?? quote.createdAt)}
            <br />
            Valid until {formatDay(quote.validUntil)}
          </p>
        </div>
      </header>

      <section className="mt-6" aria-label="Prepared for">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted">Prepared for</h2>
        <p className="mt-1 font-semibold">{quote.customer.name}</p>
        {quote.customer.company ? <p>{quote.customer.company}</p> : null}
        <p className="text-sm text-muted">
          {quote.customer.email}
          {quote.customer.phone ? ` · ${quote.customer.phone}` : null}
        </p>
      </section>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-ink text-sm">
              <th scope="col" className="py-2 font-bold">
                Item
              </th>
              <th scope="col" className="py-2 pl-4 text-right font-bold">
                Qty
              </th>
              <th scope="col" className="py-2 pl-4 text-right font-bold">
                Price
              </th>
              <th scope="col" className="py-2 pl-4 text-right font-bold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, index) => (
              <tr key={index} className="border-b border-line align-top">
                <td className="py-3">{item.description}</td>
                <td className="py-3 pl-4 text-right tabular-nums">{item.qty}</td>
                <td className="py-3 pl-4 text-right tabular-nums">{money(item.unitCents)}</td>
                <td className="py-3 pl-4 text-right tabular-nums">{money(totals.lines[index])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto mt-4 grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 tabular-nums">
        <dt className="text-muted">Subtotal</dt>
        <dd className="text-right">{money(totals.subtotal)}</dd>
        {totals.tax > 0 ? (
          <>
            <dt className="text-muted">Tax ({quote.taxRate}%)</dt>
            <dd className="text-right">{money(totals.tax)}</dd>
          </>
        ) : null}
        {totals.shipping > 0 ? (
          <>
            <dt className="text-muted">Delivery</dt>
            <dd className="text-right">{money(totals.shipping)}</dd>
          </>
        ) : null}
        <dt className="mt-2 border-t border-ink pt-2 text-lg font-bold">Total</dt>
        <dd className="mt-2 border-t border-ink pt-2 text-right text-lg font-bold">{money(totals.total)}</dd>
      </dl>

      {quote.notes ? <p className="mt-6 whitespace-pre-wrap leading-relaxed text-muted">{quote.notes}</p> : null}
    </article>
  );
}
