import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { REQUEST_TYPES, requests } from "@/content/requests";
import { saveLead, markNotified, type Lead } from "@/lib/server/leads";
import { acknowledgeCustomer, notifyOwner } from "@/lib/server/notify";
import { UPLOAD_KEY } from "@/lib/server/uploads";
import { validateContact, validateDetails } from "@/lib/validate";

const envelope = z.object({
  type: z.enum(REQUEST_TYPES),
  details: z.record(z.string(), z.unknown()),
  contact: z.record(z.string(), z.unknown()),
  attachmentKey: z.string().regex(UPLOAD_KEY).nullish(),
  page: z.string().max(300).nullish(),
  /** Honeypot: hidden from people, so only bots fill it in. */
  website: z.string().nullish(),
});

const MAX_BODY_BYTES = 50_000;

export async function POST(request: Request) {
  // Browsers label cross-site requests; other sites have no reason to post here.
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = envelope.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }
  const body = parsed.data;

  // Pretend success so a bot gets no signal, but store and send nothing.
  if (body.website) return NextResponse.json({ ok: true });

  const details = validateDetails(requests[body.type], body.details);
  const contact = validateContact(body.contact);
  const errors = { ...details.errors, ...contact.errors };
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, error: "validation", errors }, { status: 422 });
  }

  const lead: Lead = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    type: body.type,
    status: "new",
    contact: contact.values,
    details: details.values,
    attachmentKey: body.attachmentKey ?? null,
    page: body.page ?? null,
    notified: false,
  };

  // Store first. If this fails the visitor is told to call instead.
  try {
    await saveLead(lead);
  } catch (error) {
    console.error("LEAD_SAVE_FAILED", error);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  // Notify second. A failure here is logged for the alarm; the lead is already safe.
  try {
    await notifyOwner(lead);
    await markNotified(lead);
  } catch (error) {
    console.error("LEAD_NOTIFY_FAILED", lead.id, error);
  }
  try {
    await acknowledgeCustomer(lead);
  } catch (error) {
    console.error("LEAD_ACK_FAILED", lead.id, error);
  }

  return NextResponse.json({ ok: true, id: lead.id });
}
