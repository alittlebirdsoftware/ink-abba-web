import "server-only";
import { randomBytes } from "node:crypto";
import type { RequestType } from "@/content/requests";
import type { Contact } from "@/lib/validate";
import { fields, store, type Item } from "./store";

export const LEAD_STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  /** Starts with the time it was created, so ids sort oldest to newest. */
  id: string;
  createdAt: string;
  type: RequestType;
  status: LeadStatus;
  contact: Contact;
  details: Record<string, string>;
  attachmentKey: string | null;
  /** Page the visitor was on when they opened the form. */
  page: string | null;
  notified: boolean;
};

const PK = "LEAD";

export function newLeadId(now = Date.now()) {
  return `${now.toString(36).padStart(9, "0")}${randomBytes(5).toString("hex")}`;
}

export const isLeadId = (value: string) => /^[0-9a-z]{19}$/.test(value);

const toItem = (lead: Lead): Item => ({ pk: PK, sk: lead.id, ...lead });
const fromItem = (item: Item) => fields<Lead>(item);

/**
 * Stores the lead. The request API calls this before any email is sent: if
 * the notification fails, the lead still exists and can be followed up.
 */
export async function saveLead(lead: Lead): Promise<void> {
  await store().put(toItem(lead));
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!isLeadId(id)) return null;
  const item = await store().get(PK, id);
  return item ? fromItem(item) : null;
}

export async function listLeads(): Promise<Lead[]> {
  return (await store().list(PK, { newestFirst: true })).map(fromItem);
}

export async function updateLead(id: string, changes: Partial<Pick<Lead, "status" | "notified">>): Promise<Lead | null> {
  const lead = await getLead(id);
  if (!lead) return null;
  const updated = { ...lead, ...changes };
  await saveLead(updated);
  return updated;
}
