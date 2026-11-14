import { NextResponse } from "next/server";
import { isExpired } from "@/lib/quote";
import { linkBase } from "@/lib/server/auth";
import { getLead, updateLead } from "@/lib/server/leads";
import { notifyQuoteAccepted } from "@/lib/server/notify";
import { getQuoteByRef, saveQuote } from "@/lib/server/quotes";

/** The customer approves their quote. The secret in the link is the only credential. */
export async function POST(request: Request, { params }: { params: Promise<{ ref: string }> }) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const quote = await getQuoteByRef((await params).ref);
  if (!quote) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (quote.status === "accepted") return NextResponse.json({ ok: true });
  if (isExpired(quote)) return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });

  const accepted = { ...quote, status: "accepted" as const, acceptedAt: new Date().toISOString() };
  await saveQuote(accepted);
  if (accepted.leadId && (await getLead(accepted.leadId))) {
    await updateLead(accepted.leadId, { status: "won" });
  }
  await notifyQuoteAccepted(accepted, linkBase(request));
  return NextResponse.json({ ok: true });
}
