import { NextResponse } from "next/server";
import { z } from "zod";
import { linkBase, ownerRequest } from "@/lib/server/auth";
import { getLead } from "@/lib/server/leads";
import { createQuote, getQuote, quoteDraftSchema, saveQuote } from "@/lib/server/quotes";
import { sendQuote } from "@/lib/server/sendQuote";

const body = z.object({
  /** Present when saving changes to an existing draft. */
  number: z.number().int().positive().nullish(),
  leadId: z.string().max(40).nullish(),
  draft: quoteDraftSchema,
  send: z.boolean(),
});

/** Creates a quote or updates a draft, and optionally emails it to the customer. */
export async function POST(request: Request) {
  if (!(await ownerRequest(request))) return NextResponse.json({ ok: false, error: "Sign in again." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const error = parsed.error.issues[0]?.message ?? "Check the quote and try again.";
    return NextResponse.json({ ok: false, error }, { status: 422 });
  }
  const { number, leadId, draft, send } = parsed.data;

  let quote;
  if (number) {
    const existing = await getQuote(number);
    if (!existing) return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });
    if (existing.status !== "draft") {
      return NextResponse.json({ ok: false, error: "A sent quote can't be changed. Copy it to a new quote." }, { status: 409 });
    }
    quote = { ...existing, ...draft };
    await saveQuote(quote);
  } else {
    const lead = leadId ? await getLead(leadId) : null;
    quote = await createQuote(draft, lead?.id ?? null);
  }

  if (send) {
    try {
      quote = await sendQuote(quote, linkBase(request));
    } catch (error) {
      console.error("QUOTE_SEND_FAILED", quote.number, error);
      return NextResponse.json(
        { ok: false, number: quote.number, error: "The quote was saved as a draft, but the email could not be sent." },
        { status: 502 },
      );
    }
  }
  return NextResponse.json({ ok: true, number: quote.number, status: quote.status });
}
