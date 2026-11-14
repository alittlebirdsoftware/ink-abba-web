/**
 * Server-side configuration, read from environment variables.
 * See .env.example for what each one does. Nothing here is a secret: on AWS
 * the app gets its credentials from the Amplify compute role.
 */
import "server-only";

export const config = {
  /** DynamoDB table for leads and quotes. Unset: the Google Sheet if configured, else .data/db.json (see store.ts). */
  leadsTable: process.env.LEADS_TABLE || null,
  /** Private S3 bucket for photo uploads. Unset: the attachment field reports it is unavailable. */
  uploadsBucket: process.env.UPLOADS_BUCKET || null,
  /** Verified SES sender, e.g. "InkAbba <requests@inkabba.com>". Unset: emails are logged, not sent. */
  sesFrom: process.env.SES_FROM || null,
  /** Where new-lead emails go. */
  notifyTo: process.env.LEADS_NOTIFY_TO || null,
  /** Mobile number, in +1XXXXXXXXXX form, that gets a text for each new lead. Unset: no text. */
  notifySms: process.env.LEADS_NOTIFY_SMS || null,
  /** "true" also emails the customer a short acknowledgment. */
  sendAck: process.env.SEND_ACK === "true",
  /** Amplify reserves AWS_* names, so the region is passed as APP_AWS_REGION. */
  region: process.env.APP_AWS_REGION || process.env.AWS_REGION || undefined,
  isProduction: process.env.NODE_ENV === "production",
};

export const clientOptions = config.region ? { region: config.region } : {};
