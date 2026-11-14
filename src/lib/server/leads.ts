import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { RequestType } from "@/content/requests";
import type { Contact } from "@/lib/validate";
import { clientOptions, config } from "./config";

export type Lead = {
  id: string;
  createdAt: string;
  type: RequestType;
  /** new → contacted → qualified → won / lost. Updated by whoever works the lead. */
  status: "new";
  contact: Contact;
  details: Record<string, string>;
  attachmentKey: string | null;
  /** Page the visitor was on when they opened the form. */
  page: string | null;
  notified: boolean;
};

let client: DynamoDBDocumentClient | null = null;
function db() {
  client ??= DynamoDBDocumentClient.from(new DynamoDBClient(clientOptions), {
    marshallOptions: { removeUndefinedValues: true },
  });
  return client;
}

/** One partition, sorted by time, so listing leads newest-first is a single query. */
const key = (lead: Pick<Lead, "id" | "createdAt">) => ({ pk: "LEAD", sk: `${lead.createdAt}#${lead.id}` });

/**
 * Stores the lead. This runs before any email is sent: if the notification
 * fails, the lead still exists and can be followed up.
 */
export async function saveLead(lead: Lead): Promise<void> {
  if (config.leadsTable) {
    await db().send(new PutCommand({ TableName: config.leadsTable, Item: { ...key(lead), ...lead } }));
    return;
  }
  if (config.isProduction && process.env.LEADS_ALLOW_LOCAL !== "1") {
    throw new Error("LEADS_TABLE is not set; refusing to drop a lead in production.");
  }
  const dir = path.join(process.cwd(), ".data");
  await mkdir(dir, { recursive: true });
  await appendFile(path.join(dir, "leads.jsonl"), `${JSON.stringify(lead)}\n`);
}

export async function markNotified(lead: Lead): Promise<void> {
  if (!config.leadsTable) return;
  await db().send(
    new UpdateCommand({
      TableName: config.leadsTable,
      Key: key(lead),
      UpdateExpression: "SET notified = :true",
      ExpressionAttributeValues: { ":true": true },
    }),
  );
}
