import { NextResponse } from "next/server";
import { linkBase, ownerRequest } from "@/lib/server/auth";
import { getQuote } from "@/lib/server/quotes";
import { sendQuote } from "@/lib/server/sendQuote";

/** Sends, or sends again, an existing quote. */
export async function POST(request: Request, { params }: { params: Promise<{ number: string }> }) {
  if (!(await ownerRequest(request))) return NextResponse.json({ ok: false, error: "Sign in again." }, { status: 401 });
  const quote = await getQuote(Number((await params).number));
  if (!quote) return NextResponse.json({ ok: false, error: "Quote not found." }, { status: 404 });
  try {
    await sendQuote(quote, linkBase(request));
  } catch (error) {
    console.error("QUOTE_SEND_FAILED", quote.number, error);
    return NextResponse.json({ ok: false, error: "The email could not be sent." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
