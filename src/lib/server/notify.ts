import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { requests } from "@/content/requests";
import { formatDay, money, quoteLabel, quoteTotals, type Quote } from "@/lib/quote";
import { replyExpectation, site } from "@/lib/site";
import { clientOptions, config } from "./config";
import type { Lead } from "./leads";
import { readUpload } from "./uploads";

let client: SESv2Client | null = null;
const ses = () => (client ??= new SESv2Client(clientOptions));

type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  bcc?: string;
  attachment?: { filename: string; contentType: string; bytes: Uint8Array } | null;
};

/** Sends through SES. With no sender configured (local development) the email is printed instead. */
async function sendEmail(email: Email): Promise<void> {
  if (!config.sesFrom) {
    console.log(`[email not sent: SES_FROM unset]\nTo: ${email.to}\nSubject: ${email.subject}\n${email.text}`);
    return;
  }
  await ses().send(
    new SendEmailCommand({
      FromEmailAddress: config.sesFrom,
      Destination: { ToAddresses: [email.to], BccAddresses: email.bcc ? [email.bcc] : undefined },
      ReplyToAddresses: email.replyTo ? [email.replyTo] : undefined,
      Content: {
        Simple: {
          Subject: { Data: email.subject },
          Body: { Text: { Data: email.text }, Html: email.html ? { Data: email.html } : undefined },
          Attachments: email.attachment
            ? [
                {
                  FileName: email.attachment.filename,
                  ContentType: email.attachment.contentType,
                  RawContent: email.attachment.bytes,
                },
              ]
            : undefined,
        },
      },
    }),
  );
}

/** Where owner notices go. Locally, with no SES sender, they are printed, so a placeholder is fine. */
function ownerAddress(): string | null {
  return config.notifyTo ?? (config.sesFrom ? null : "owner (LEADS_NOTIFY_TO unset)");
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

/* ---------- New lead ---------- */

function ownerBody(lead: Lead, attachmentNote: string | null, adminUrl: string) {
  const def = requests[lead.type];
  const lines = [
    `New request: ${def.title}`,
    "",
    `Name:    ${lead.contact.name}`,
    lead.contact.company ? `Company: ${lead.contact.company}` : null,
    `Email:   ${lead.contact.email}`,
    lead.contact.phone ? `Phone:   ${lead.contact.phone}` : null,
    "",
    ...def.fields
      .filter((field) => lead.details[field.name])
      .map((field) => `${field.label.replace(/[?:]$/, "")}:\n${lead.details[field.name]}\n`),
    lead.contact.notes ? `Anything else:\n${lead.contact.notes}\n` : null,
    attachmentNote,
    "",
    `Write a quote: ${adminUrl}`,
    `Or reply to this email to answer ${lead.contact.name} directly.`,
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

/** Emails the owner about a new lead. Throws if it cannot be sent; the caller logs and carries on. */
export async function notifyOwner(lead: Lead, base: string): Promise<void> {
  const to = ownerAddress();
  if (!to) throw new Error("LEADS_NOTIFY_TO is not set; the owner was not emailed.");
  const def = requests[lead.type];

  let attachment: Awaited<ReturnType<typeof readUpload>> = null;
  let attachmentNote: string | null = null;
  if (lead.attachmentKey) {
    try {
      attachment = await readUpload(lead.attachmentKey);
    } catch (error) {
      console.error("Could not read attachment", lead.attachmentKey, error);
    }
    attachmentNote = attachment
      ? "The customer's file is attached."
      : `The customer attached a file that could not be included (${lead.attachmentKey}).`;
  }

  await sendEmail({
    to,
    subject: `${def.title}: ${lead.contact.name}${lead.contact.company ? ` (${lead.contact.company})` : ""}`,
    text: ownerBody(lead, attachmentNote, `${base}/admin/leads/${lead.id}`),
    replyTo: lead.contact.email,
    attachment,
  });
}

let smsClient: SNSClient | null = null;
const sns = () => (smsClient ??= new SNSClient(clientOptions));

async function textOwnerMessage(message: string): Promise<void> {
  if (!config.notifySms) return;
  await sns().send(
    new PublishCommand({
      PhoneNumber: config.notifySms,
      Message: message.slice(0, 300),
      MessageAttributes: { "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: "Transactional" } },
    }),
  );
}

/**
 * Texts the owner so a new lead is seen within minutes, not at the next
 * inbox check. Kept short: who, what, and how to call them back.
 */
export async function textOwner(lead: Lead): Promise<void> {
  const who = lead.contact.company ? `${lead.contact.name} (${lead.contact.company})` : lead.contact.name;
  const reach = lead.contact.phone || lead.contact.email;
  await textOwnerMessage(`${site.name}: ${requests[lead.type].title} from ${who}. ${reach}. Details in your email.`);
}

/**
 * Short acknowledgment to the customer. It deliberately repeats nothing the
 * visitor typed, so the form cannot be used to send someone else's message.
 */
export async function acknowledgeCustomer(lead: Lead): Promise<void> {
  if (!config.sendAck || !config.sesFrom) return;
  await sendEmail({
    to: lead.contact.email,
    subject: `We received your request | ${site.name}`,
    replyTo: config.notifyTo ?? undefined,
    text: [
      `Hi ${lead.contact.name.split(" ")[0]},`,
      "",
      `We received your request (${requests[lead.type].title}).`,
      replyExpectation(),
      "",
      `If it's urgent, call us at ${site.phone.display} (${site.hours.display}).`,
      "",
      site.name,
    ].join("\n"),
  });
}

/* ---------- Owner sign-in ---------- */

export async function sendLoginLink(email: string, url: string, minutes: number): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Sign in to ${site.name}`,
    text: [
      `Open this link to sign in to the ${site.name} owner area:`,
      "",
      url,
      "",
      `It works once and expires in ${minutes} minutes. If you didn't ask for it, ignore this email.`,
    ].join("\n"),
  });
}

/* ---------- Quotes ---------- */

function quoteText(quote: Quote, url: string) {
  const totals = quoteTotals(quote);
  return [
    `Hi ${quote.customer.name.split(" ")[0]},`,
    "",
    `Here is your quote ${quoteLabel(quote.number)} from ${site.name}.`,
    "",
    ...quote.items.map(
      (item, index) => `${item.qty} x ${item.description} @ ${money(item.unitCents)} = ${money(totals.lines[index])}`,
    ),
    "",
    `Subtotal: ${money(totals.subtotal)}`,
    totals.tax ? `Tax (${quote.taxRate}%): ${money(totals.tax)}` : null,
    totals.shipping ? `Delivery: ${money(totals.shipping)}` : null,
    `Total: ${money(totals.total)}`,
    "",
    quote.notes ? `${quote.notes}\n` : null,
    `Valid until ${formatDay(quote.validUntil)}.`,
    "",
    `View and approve your quote: ${url}`,
    "",
    `Questions? Reply to this email or call ${site.phone.display}.`,
    "",
    site.name,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function quoteHtml(quote: Quote, url: string) {
  const totals = quoteTotals(quote);
  const head = "padding-bottom:6px;border-bottom:2px solid #14213d";
  const cell = 'style="padding:8px 0;border-bottom:1px solid #d7dfeb;vertical-align:top"';
  const right =
    'style="padding:8px 0 8px 16px;border-bottom:1px solid #d7dfeb;text-align:right;white-space:nowrap;vertical-align:top"';
  const totalRow = (label: string, amount: string, bold = false) =>
    `<tr><td colspan="3" style="padding:6px 0;text-align:right;${bold ? "font-weight:bold" : "color:#4b5a70"}">${label}</td>` +
    `<td style="padding:6px 0 6px 16px;text-align:right;white-space:nowrap;${bold ? "font-weight:bold" : ""}">${amount}</td></tr>`;
  const company = quote.customer.company ? `, ${escapeHtml(quote.customer.company)}` : "";
  return `<!doctype html><html><body style="margin:0;background:#eef4fb;font-family:Arial,Helvetica,sans-serif;color:#14213d">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">
<div style="background:#ffffff;border-radius:12px;padding:28px">
<p style="margin:0;font-size:22px;font-weight:bold">Ink<span style="color:#1d4ed8">Abba</span></p>
<h1 style="font-size:20px;margin:20px 0 4px">Quote ${quoteLabel(quote.number)}</h1>
<p style="margin:0 0 20px;color:#4b5a70">For ${escapeHtml(quote.customer.name)}${company} · valid until ${formatDay(quote.validUntil)}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:14px">
<tr><th align="left" style="${head}">Item</th><th style="${head};text-align:right">Qty</th><th style="${head};text-align:right;padding-left:16px">Price</th><th style="${head};text-align:right;padding-left:16px">Amount</th></tr>
${quote.items
  .map(
    (item, index) =>
      `<tr><td ${cell}>${escapeHtml(item.description)}</td><td ${right}>${item.qty}</td><td ${right}>${money(item.unitCents)}</td><td ${right}>${money(totals.lines[index])}</td></tr>`,
  )
  .join("\n")}
${totalRow("Subtotal", money(totals.subtotal))}
${totals.tax ? totalRow(`Tax (${quote.taxRate}%)`, money(totals.tax)) : ""}
${totals.shipping ? totalRow("Delivery", money(totals.shipping)) : ""}
${totalRow("Total", money(totals.total), true)}
</table>
${quote.notes ? `<p style="margin:20px 0 0;white-space:pre-wrap;color:#4b5a70">${escapeHtml(quote.notes)}</p>` : ""}
<p style="margin:28px 0 0"><a href="${url}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:8px">View and approve your quote</a></p>
<p style="margin:24px 0 0;color:#4b5a70;font-size:14px">Questions? Reply to this email or call ${site.phone.display} (${site.hours.display}).</p>
</div></div></body></html>`;
}

/** Emails the quote to the customer, with a copy to the owner's inbox. */
export async function sendQuoteEmail(quote: Quote, url: string): Promise<void> {
  await sendEmail({
    to: quote.customer.email,
    bcc: config.notifyTo ?? undefined,
    replyTo: config.notifyTo ?? undefined,
    subject: `Your quote ${quoteLabel(quote.number)} from ${site.name}`,
    text: quoteText(quote, url),
    html: quoteHtml(quote, url),
  });
}

/** Tells the owner a customer approved a quote, by email and by text when that is set up. */
export async function notifyQuoteAccepted(quote: Quote, base: string): Promise<void> {
  const total = money(quoteTotals(quote).total);
  const who = quote.customer.company ? `${quote.customer.name} (${quote.customer.company})` : quote.customer.name;
  const summary = `${who} approved quote ${quoteLabel(quote.number)} for ${total}.`;
  const to = ownerAddress();
  const results = await Promise.allSettled([
    to
      ? sendEmail({
          to,
          subject: `Approved: ${quoteLabel(quote.number)} · ${who} · ${total}`,
          replyTo: quote.customer.email,
          text: [
            summary,
            "",
            `Email: ${quote.customer.email}`,
            quote.customer.phone ? `Phone: ${quote.customer.phone}` : null,
            "",
            `Open the quote: ${base}/admin/quotes/${quote.number}`,
          ]
            .filter((line): line is string => line !== null)
            .join("\n"),
        })
      : Promise.reject(new Error("LEADS_NOTIFY_TO is not set")),
    textOwnerMessage(`${site.name}: ${summary}`),
  ]);
  for (const result of results) {
    if (result.status === "rejected") console.error("QUOTE_ACCEPT_NOTIFY_FAILED", quote.number, result.reason);
  }
}
