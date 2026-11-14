import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { requests } from "@/content/requests";
import { facts, site } from "@/lib/site";
import { clientOptions, config } from "./config";
import type { Lead } from "./leads";
import { readUpload } from "./uploads";

let client: SESv2Client | null = null;
const ses = () => (client ??= new SESv2Client(clientOptions));

function ownerBody(lead: Lead, attachmentNote: string | null) {
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
    `Reply to this email to answer ${lead.contact.name} directly.`,
    `Lead ${lead.id} · ${lead.createdAt}${lead.page ? ` · from ${lead.page}` : ""}`,
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

/** Emails the owner. Throws if SES rejects the message; the caller logs and carries on. */
export async function notifyOwner(lead: Lead): Promise<void> {
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

  const subject = `${def.title}: ${lead.contact.name}${lead.contact.company ? ` (${lead.contact.company})` : ""}`;
  const text = ownerBody(lead, attachmentNote);

  if (!config.sesFrom || !config.notifyTo) {
    console.log(`[lead email not sent: SES_FROM / LEADS_NOTIFY_TO unset]\nSubject: ${subject}\n${text}`);
    return;
  }

  await ses().send(
    new SendEmailCommand({
      FromEmailAddress: config.sesFrom,
      Destination: { ToAddresses: [config.notifyTo] },
      ReplyToAddresses: [lead.contact.email],
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: { Text: { Data: text } },
          Attachments: attachment
            ? [{ FileName: attachment.filename, ContentType: attachment.contentType, RawContent: attachment.bytes }]
            : undefined,
        },
      },
    }),
  );
}

/**
 * Short acknowledgment to the customer. It deliberately repeats nothing the
 * visitor typed, so the form cannot be used to send someone else's message.
 */
export async function acknowledgeCustomer(lead: Lead): Promise<void> {
  if (!config.sendAck || !config.sesFrom || !config.notifyTo) return;
  const text = [
    `Hi ${lead.contact.name.split(" ")[0]},`,
    "",
    `We received your request (${requests[lead.type].title}).`,
    facts.replyTime ? `We reply ${facts.replyTime}.` : "We'll be in touch soon.",
    "",
    `If it's urgent, call us at ${site.phone.display} (${site.hours.display}).`,
    "",
    site.name,
  ].join("\n");

  await ses().send(
    new SendEmailCommand({
      FromEmailAddress: config.sesFrom,
      Destination: { ToAddresses: [lead.contact.email] },
      ReplyToAddresses: [config.notifyTo],
      Content: {
        Simple: { Subject: { Data: `We received your request | ${site.name}` }, Body: { Text: { Data: text } } },
      },
    }),
  );
}
