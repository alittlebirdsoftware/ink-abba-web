import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { FIRST_QUOTE_NUMBER, type Quote, type QuoteDraft } from "@/lib/quote";
import { fields, store, type Item } from "./store";

const PK = "QUOTE";
/** Zero-padded so quotes sort by number. */
const sk = (number: number) => String(number).padStart(8, "0");

const toItem = (quote: Quote): Item => ({ pk: PK, sk: sk(quote.number), ...quote });
const fromItem = (item: Item) => fields<Quote>(item);

/** Validates what the owner typed. Amounts arrive already converted to cents. */
export const quoteDraftSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(1, "Customer name is required.").max(120),
    company: z.string().trim().max(160).default(""),
    email: z.email("Enter a valid customer email.").max(254),
    phone: z.string().trim().max(40).default(""),
  }),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Each line needs a description.").max(300),
        qty: z.number().positive("Quantity must be more than zero.").max(100_000),
        unitCents: z.number().int().min(0).max(100_000_000),
      }),
    )
    .min(1, "Add at least one line.")
    .max(50),
  shippingCents: z.number().int().min(0).max(100_000_000),
  taxRate: z.number().min(0).max(25),
  notes: z.string().trim().max(4000).default(""),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid-until date."),
}) satisfies z.ZodType<QuoteDraft>;

export async function createQuote(draft: QuoteDraft, leadId: string | null): Promise<Quote> {
  const quote: Quote = {
    ...draft,
    number: await store().next("COUNTER", "quote", FIRST_QUOTE_NUMBER),
    token: randomBytes(16).toString("hex"),
    leadId,
    status: "draft",
    createdAt: new Date().toISOString(),
    sentAt: null,
    acceptedAt: null,
  };
  await store().put(toItem(quote));
  return quote;
}

export async function saveQuote(quote: Quote): Promise<void> {
  await store().put(toItem(quote));
}

export async function getQuote(number: number): Promise<Quote | null> {
  if (!Number.isSafeInteger(number) || number < 1) return null;
  const item = await store().get(PK, sk(number));
  return item ? fromItem(item) : null;
}

export async function listQuotes(): Promise<Quote[]> {
  return (await store().list(PK, { newestFirst: true })).map(fromItem);
}

/**
 * Looks up a quote from the reference in a customer's link ("1001-<token>").
 * Returns null unless the secret token matches, so quote numbers alone open nothing.
 */
export async function getQuoteByRef(ref: string): Promise<Quote | null> {
  const match = /^(\d{1,8})-([0-9a-f]{32})$/.exec(ref);
  if (!match) return null;
  const quote = await getQuote(Number(match[1]));
  if (!quote || quote.status === "draft") return null;
  const given = Buffer.from(match[2]);
  const expected = Buffer.from(quote.token);
  return given.length === expected.length && timingSafeEqual(given, expected) ? quote : null;
}
