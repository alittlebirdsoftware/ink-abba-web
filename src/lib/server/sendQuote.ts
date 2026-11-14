import "server-only";
import { quotePath, type Quote } from "@/lib/quote";
import { getLead, updateLead } from "./leads";
import { sendQuoteEmail } from "./notify";
import { saveQuote } from "./quotes";

/**
 * Emails a quote to the customer and records that it was sent. The quote is
 * only marked sent after the email is accepted for delivery, so a failed send
 * leaves a draft the owner can retry. An approved quote stays approved.
 */
export async function sendQuote(quote: Quote, base: string): Promise<Quote> {
  await sendQuoteEmail(quote, `${base}${quotePath(quote)}`);
  const sent: Quote = {
    ...quote,
    status: quote.status === "accepted" ? "accepted" : "sent",
    sentAt: new Date().toISOString(),
  };
  await saveQuote(sent);

  if (sent.leadId) {
    const lead = await getLead(sent.leadId);
    if (lead && (lead.status === "new" || lead.status === "contacted")) {
      await updateLead(lead.id, { status: "quoted" });
    }
  }
  return sent;
}
