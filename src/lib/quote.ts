/**
 * Quote shapes and arithmetic, shared by the owner's quote builder, the
 * server and the customer's quote page so all three always agree on totals.
 * Money is held in whole cents to avoid rounding drift.
 */

export const QUOTE_STATUSES = ["draft", "sent", "accepted"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export type QuoteItem = { description: string; qty: number; unitCents: number };

export type QuoteCustomer = { name: string; company: string; email: string; phone: string };

/** What the owner fills in. */
export type QuoteDraft = {
  customer: QuoteCustomer;
  items: QuoteItem[];
  shippingCents: number;
  /** Sales tax as a percentage of the items subtotal, e.g. 7.75. */
  taxRate: number;
  notes: string;
  /** YYYY-MM-DD. */
  validUntil: string;
};

export type Quote = QuoteDraft & {
  number: number;
  /** Secret part of the customer's link. */
  token: string;
  leadId: string | null;
  status: QuoteStatus;
  createdAt: string;
  sentAt: string | null;
  acceptedAt: string | null;
};

export const QUOTE_VALID_DAYS = 30;
export const FIRST_QUOTE_NUMBER = 1001;

export function quoteTotals(quote: Pick<QuoteDraft, "items" | "shippingCents" | "taxRate">) {
  const lines = quote.items.map((item) => Math.round(item.qty * item.unitCents));
  const subtotal = lines.reduce((sum, line) => sum + line, 0);
  const tax = Math.round((subtotal * quote.taxRate) / 100);
  return { lines, subtotal, tax, shipping: quote.shippingCents, total: subtotal + tax + quote.shippingCents };
}

export const money = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export const quoteLabel = (number: number) => `Q-${number}`;

/** The path of the customer's private quote page. */
export const quotePath = (quote: Pick<Quote, "number" | "token">) => `/quote/${quote.number}-${quote.token}`;

/** Today's date where the business is, as YYYY-MM-DD. */
const businessDay = (now: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);

export function defaultValidUntil(now = new Date()) {
  const [year, month, date] = businessDay(now).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + QUOTE_VALID_DAYS)).toISOString().slice(0, 10);
}

/** A quote lapses at the end of its valid-until day, Pacific time. */
export function isExpired(quote: Pick<QuoteDraft, "validUntil">, now = new Date()) {
  if (!quote.validUntil) return false;
  return businessDay(now) > quote.validUntil;
}

/** The calendar day a timestamp fell on where the business is, e.g. "November 13, 2026". */
export const formatStamp = (iso: string) => formatDay(businessDay(new Date(iso)));

export function formatDay(day: string) {
  const [year, month, date] = day.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
