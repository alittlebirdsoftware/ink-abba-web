import type { Quote, QuoteDraft } from "@/lib/quote";

/** What the owner is typing in the quote builder: amounts stay as text until the quote is saved. */
export type QuoteForm = {
  customer: QuoteDraft["customer"];
  items: { description: string; qty: string; price: string }[];
  shipping: string;
  taxRate: string;
  notes: string;
  validUntil: string;
};

const dollars = (cents: number) => (cents ? (cents / 100).toFixed(2) : "");

/** Turns a stored quote back into editable text, for editing a draft or copying a quote. */
export function formFromQuote(quote: Quote, validUntil = quote.validUntil): QuoteForm {
  return {
    customer: quote.customer,
    items: quote.items.map((item) => ({
      description: item.description,
      qty: String(item.qty),
      price: (item.unitCents / 100).toFixed(2),
    })),
    shipping: dollars(quote.shippingCents),
    taxRate: quote.taxRate ? String(quote.taxRate) : "",
    notes: quote.notes,
    validUntil,
  };
}
