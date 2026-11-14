/**
 * Keeps leads and quotes in the InkAbba Google Sheet, behind the same
 * interface as the other stores (see store.ts).
 *
 * - "Leads" and "Quotes" hold one readable row per record. Columns are found
 *   by their header text, so they can be reordered, and columns the app
 *   doesn't know (like "Owner notes") are never read or written.
 * - Lead "Status" can be changed in the sheet as well as in the app.
 *   Everything else should be edited in the app.
 * - Sign-in links, sessions and the quote counter go in a hidden "App data"
 *   tab. Only hashes of sign-in tokens are stored there.
 *
 * Every value is written RAW, so text a customer types (even one starting
 * with "=") is stored as text and never run as a formula.
 */
import "server-only";

import { requests, REQUEST_TYPES, type RequestType } from "@/content/requests";
import { quoteLabel, quotePath, quoteTotals, type Quote, type QuoteItem } from "@/lib/quote";
import { site } from "@/lib/site";
import { colLetter, createSheets, headerIndex, loadConfig } from "../../../scripts/sheet.mjs";
import { googleCredentials } from "./googleCredentials";
import type { Lead, LeadStatus } from "./leads";
import type { Item, Store } from "./store";

const TZ = "America/Los_Angeles";
type Cell = string | number | boolean;
type Values = Record<string, Cell>;
type Sheets = ReturnType<typeof createSheets>;

/* ---------- Pacific dates as spreadsheet date serials ---------- */

const SERIAL_EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

/** The wall-clock time in Pacific time, as if it were UTC. */
function pacificWall(ms: number) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((part) => [part.type, part.value]),
  );
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
}

/** A timestamp as a date-time serial showing Pacific time. */
function toSerial(iso: string | null): Cell {
  if (!iso) return "";
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? (pacificWall(ms) - SERIAL_EPOCH) / DAY_MS : "";
}

/** A date-time serial (Pacific wall time) back to an ISO timestamp. */
function fromSerial(value: Cell | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const wall = Math.round((value * DAY_MS + SERIAL_EPOCH) / 1000) * 1000;
  let instant = wall - (pacificWall(wall) - wall);
  instant = wall - (pacificWall(instant) - instant);
  return new Date(instant).toISOString();
}

const dayToSerial = (day: string): Cell => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? (Date.UTC(+match[1], +match[2] - 1, +match[3]) - SERIAL_EPOCH) / DAY_MS : day;
};

function serialToDay(value: Cell | undefined): string {
  if (typeof value === "number") return new Date(Math.round(value) * DAY_MS + SERIAL_EPOCH).toISOString().slice(0, 10);
  return String(value ?? "").trim();
}

/* ---------- cell helpers ---------- */

const text = (value: Cell | undefined) => (value === undefined || value === null ? "" : String(value).trim());
const dollars = (cents: number) => Math.round(cents) / 100;

function cents(value: Cell | undefined) {
  if (typeof value === "number") return Math.round(value * 100);
  const amount = Number.parseFloat(text(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function number(value: Cell | undefined) {
  if (typeof value === "number") return value;
  const amount = Number.parseFloat(text(value).replace(/[%,\s]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

/* ---------- tab layouts ---------- */

type Format = "datetime" | "date" | "money" | "wrap";

type Column = { name: string; width: number; format?: Format; options?: readonly string[] };

type TabSpec = {
  title: string;
  hidden?: boolean;
  /** Written once, when the tab is set up. Includes columns the app never touches. */
  columns: Column[];
  /** The record kinds (pk) kept in this tab. */
  owns: (pk: string) => boolean;
  keyOf: (row: Values) => { pk: string; sk: string } | null;
  toRow: (item: Item) => Values;
  fromRow: (row: Values) => Item | null;
};

const LEAD_STATUSES: readonly LeadStatus[] = ["new", "contacted", "quoted", "won", "lost"];
const typeByTitle = new Map(REQUEST_TYPES.map((type) => [requests[type].title.toLowerCase(), type]));

/** "Label: value" lines, in the form's order, so the sheet reads like the request. */
function detailsText(type: RequestType, details: Record<string, string>) {
  const fields = requests[type]?.fields ?? [];
  const known = new Set(fields.map((field) => field.name));
  const lines = fields.filter((field) => details[field.name]).map((field) => `${field.label}: ${details[field.name]}`);
  for (const [name, value] of Object.entries(details)) if (!known.has(name) && value) lines.push(`${name}: ${value}`);
  return lines.join("\n");
}

/** Reverses detailsText. Lines that don't start with a known label continue the field above. */
function parseDetails(type: RequestType, value: string) {
  const byLabel = new Map<string, string>();
  for (const field of requests[type]?.fields ?? []) {
    byLabel.set(field.label.toLowerCase(), field.name);
    byLabel.set(field.name.toLowerCase(), field.name);
  }
  const details: Record<string, string> = {};
  let current: string | null = null;
  for (const line of value.split("\n")) {
    const match = /^([^:]{1,120}): ?(.*)$/.exec(line);
    const name = match ? byLabel.get(match[1].trim().toLowerCase()) : undefined;
    if (match && name) {
      current = name;
      details[name] = match[2];
    } else if (current) {
      details[current] += `\n${line}`;
    } else if (line.trim()) {
      current = "details";
      details.details = line;
    }
  }
  return details;
}

const leadsTab: TabSpec = {
  title: "Leads",
  columns: [
    { name: "ID", width: 170 },
    { name: "Received", width: 150, format: "datetime" },
    { name: "Status", width: 100, options: LEAD_STATUSES },
    { name: "Request", width: 190 },
    { name: "Name", width: 150 },
    { name: "Company", width: 190 },
    { name: "Email", width: 220 },
    { name: "Phone", width: 130 },
    { name: "Details", width: 380, format: "wrap" },
    { name: "Customer notes", width: 220, format: "wrap" },
    { name: "Attachment", width: 160 },
    { name: "From page", width: 140 },
    { name: "Owner emailed", width: 110 },
    { name: "Owner notes", width: 260, format: "wrap" },
  ],
  owns: (pk) => pk === "LEAD",
  keyOf: (row) => (text(row.ID) ? { pk: "LEAD", sk: text(row.ID) } : null),
  toRow(item) {
    const lead = item as unknown as Lead;
    return {
      ID: lead.id,
      Received: toSerial(lead.createdAt),
      Status: lead.status,
      Request: requests[lead.type]?.title ?? lead.type,
      Name: lead.contact.name,
      Company: lead.contact.company,
      Email: lead.contact.email,
      Phone: lead.contact.phone,
      Details: detailsText(lead.type, lead.details),
      "Customer notes": lead.contact.notes,
      Attachment: lead.attachmentKey ?? "",
      "From page": lead.page ?? "",
      "Owner emailed": lead.notified ? "yes" : "no",
    };
  },
  fromRow(row) {
    const id = text(row.ID);
    if (!/^[0-9a-z]{19}$/.test(id)) return null;
    const request = text(row.Request).toLowerCase();
    const type: RequestType = typeByTitle.get(request) ?? (REQUEST_TYPES.find((t) => t === request) || "question");
    const status = text(row.Status).toLowerCase() as LeadStatus;
    const lead: Lead = {
      id,
      createdAt: fromSerial(row.Received) ?? new Date(Number.parseInt(id.slice(0, 9), 36)).toISOString(),
      type,
      status: LEAD_STATUSES.includes(status) ? status : "new",
      contact: {
        name: text(row.Name),
        company: text(row.Company),
        email: text(row.Email),
        phone: text(row.Phone),
        notes: text(row["Customer notes"]),
      },
      details: parseDetails(type, text(row.Details)),
      attachmentKey: text(row.Attachment) || null,
      page: text(row["From page"]) || null,
      notified: row["Owner emailed"] === true || ["YES", "TRUE"].includes(text(row["Owner emailed"]).toUpperCase()),
    };
    return { pk: "LEAD", sk: id, ...lead };
  },
};

/** One line per item: "4 × HP 58A black toner @ $64.50". */
const itemLine = (item: QuoteItem) => `${item.qty} × ${item.description} @ $${(item.unitCents / 100).toFixed(2)}`;

function parseItems(value: string): QuoteItem[] {
  return value
    .split("\n")
    .map((line) => /^\s*([\d.]+)\s*[×x]\s*(.+?)\s*@\s*\$?\s*([\d,]*\.?\d+)\s*$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ qty: Number(match[1]), description: match[2], unitCents: cents(match[3]) }));
}

const quoteSk = (number: number) => String(number).padStart(8, "0");

/** The customer's link, from SITE_URL (or the local dev server). */
function customerLink(quote: Quote) {
  const base = process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? site.url : "http://localhost:3477");
  return `${base}${quotePath(quote)}`;
}

const quotesTab: TabSpec = {
  title: "Quotes",
  columns: [
    { name: "Quote", width: 80 },
    { name: "Status", width: 90 },
    { name: "Created", width: 150, format: "datetime" },
    { name: "Sent", width: 150, format: "datetime" },
    { name: "Approved", width: 150, format: "datetime" },
    { name: "Valid until", width: 110, format: "date" },
    { name: "Customer", width: 150 },
    { name: "Company", width: 190 },
    { name: "Email", width: 220 },
    { name: "Phone", width: 130 },
    { name: "Items", width: 380, format: "wrap" },
    { name: "Subtotal", width: 100, format: "money" },
    { name: "Tax rate %", width: 90 },
    { name: "Tax", width: 90, format: "money" },
    { name: "Delivery", width: 90, format: "money" },
    { name: "Total", width: 100, format: "money" },
    { name: "Notes", width: 260, format: "wrap" },
    { name: "Lead ID", width: 170 },
    { name: "Customer link", width: 260 },
    { name: "Owner notes", width: 260, format: "wrap" },
  ],
  owns: (pk) => pk === "QUOTE",
  keyOf(row) {
    const match = /(\d+)/.exec(text(row.Quote));
    return match ? { pk: "QUOTE", sk: quoteSk(Number(match[1])) } : null;
  },
  toRow(item) {
    const quote = item as unknown as Quote;
    const totals = quoteTotals(quote);
    return {
      Quote: quoteLabel(quote.number),
      Status: quote.status === "accepted" ? "approved" : quote.status,
      Created: toSerial(quote.createdAt),
      Sent: toSerial(quote.sentAt),
      Approved: toSerial(quote.acceptedAt),
      "Valid until": dayToSerial(quote.validUntil),
      Customer: quote.customer.name,
      Company: quote.customer.company,
      Email: quote.customer.email,
      Phone: quote.customer.phone,
      Items: quote.items.map(itemLine).join("\n"),
      Subtotal: dollars(totals.subtotal),
      "Tax rate %": quote.taxRate,
      Tax: dollars(totals.tax),
      Delivery: dollars(totals.shipping),
      Total: dollars(totals.total),
      Notes: quote.notes,
      "Lead ID": quote.leadId ?? "",
      "Customer link": customerLink(quote),
    };
  },
  fromRow(row) {
    const key = quotesTab.keyOf(row);
    if (!key) return null;
    const status = text(row.Status).toLowerCase();
    const quote: Quote = {
      number: Number(key.sk),
      token: /([0-9a-f]{32})\s*$/.exec(text(row["Customer link"]))?.[1] ?? "",
      leadId: text(row["Lead ID"]) || null,
      status: status === "approved" || status === "accepted" ? "accepted" : status === "sent" ? "sent" : "draft",
      createdAt: fromSerial(row.Created) ?? new Date(0).toISOString(),
      sentAt: fromSerial(row.Sent),
      acceptedAt: fromSerial(row.Approved),
      validUntil: serialToDay(row["Valid until"]),
      customer: {
        name: text(row.Customer),
        company: text(row.Company),
        email: text(row.Email),
        phone: text(row.Phone),
      },
      items: parseItems(text(row.Items)),
      shippingCents: cents(row.Delivery),
      taxRate: number(row["Tax rate %"]),
      notes: text(row.Notes),
    };
    return { pk: "QUOTE", sk: key.sk, ...quote };
  },
};

const appTab: TabSpec = {
  title: "App data",
  hidden: true,
  columns: [
    { name: "Kind", width: 100 },
    { name: "Key", width: 300 },
    { name: "Data", width: 400 },
    { name: "Expires", width: 160, format: "datetime" },
  ],
  owns: () => true,
  keyOf: (row) => (text(row.Kind) ? { pk: text(row.Kind), sk: text(row.Key) } : null),
  toRow(item) {
    const data: Record<string, unknown> = { ...item };
    delete data.pk;
    delete data.sk;
    const ttl = typeof item.ttl === "number" ? item.ttl : null;
    return {
      Kind: item.pk,
      Key: item.sk,
      Data: JSON.stringify(data),
      Expires: ttl ? toSerial(new Date(ttl * 1000).toISOString()) : "",
    };
  },
  fromRow(row) {
    const key = appTab.keyOf(row);
    if (!key) return null;
    try {
      return { ...JSON.parse(text(row.Data) || "{}"), pk: key.pk, sk: key.sk };
    } catch {
      return null;
    }
  },
};

const TABS = [leadsTab, quotesTab, appTab];
const tabFor = (pk: string) => TABS.find((tab) => tab.owns(pk))!;
const isExpired = (item: Item) => typeof item.ttl === "number" && item.ttl * 1000 < Date.now();

/* ---------- the store ---------- */

type Read = { headers: string[]; rows: { rowNumber: number; values: Values }[] };

const READ_CACHE_MS = 2000;

const NUMBER_FORMATS: Partial<Record<Format, object>> = {
  datetime: { type: "DATE_TIME", pattern: "yyyy-mm-dd h:mm am/pm" },
  date: { type: "DATE", pattern: "mmm d, yyyy" },
  money: { type: "CURRENCY", pattern: "$#,##0.00" },
};

/**
 * Date, money and wrap formats for the app's columns, wherever they now sit.
 * Re-applied after every write: writing an empty cell (a quote not yet sent,
 * say) clears its format, so the date filled in later would show as a number.
 */
function cellFormats(sheetId: number, spec: TabSpec, index: Record<string, number>) {
  return spec.columns.flatMap((col) => {
    if (!col.format || !index[col.name]) return [];
    const range = { sheetId, startRowIndex: 1, startColumnIndex: index[col.name] - 1, endColumnIndex: index[col.name] };
    const userEnteredFormat = col.format === "wrap" ? { wrapStrategy: "WRAP" } : { numberFormat: NUMBER_FORMATS[col.format] };
    const fields = col.format === "wrap" ? "userEnteredFormat.wrapStrategy" : "userEnteredFormat.numberFormat";
    return [{ repeatCell: { range, cell: { userEnteredFormat }, fields } }];
  });
}

/** Formatting applied once, when the app first sets up an empty tab. */
function formatRequests(sheetId: number, spec: TabSpec) {
  const column = (index: number) => ({ sheetId, startRowIndex: 1, startColumnIndex: index, endColumnIndex: index + 1 });
  const out: object[] = [
    {
      updateSheetProperties: {
        properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.93, green: 0.95, blue: 0.97 } } },
        fields: "userEnteredFormat(textFormat.bold,backgroundColor)",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1 },
        cell: { userEnteredFormat: { verticalAlignment: "TOP" } },
        fields: "userEnteredFormat.verticalAlignment",
      },
    },
  ];
  out.push(...cellFormats(sheetId, spec, Object.fromEntries(spec.columns.map((col, i) => [col.name, i + 1]))));
  spec.columns.forEach((col, index) => {
    out.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: index, endIndex: index + 1 },
        properties: { pixelSize: col.width },
        fields: "pixelSize",
      },
    });
    // No checkbox columns: an empty checkbox reads as FALSE, which makes every row look used.
    if (col.options) {
      out.push({
        setDataValidation: {
          range: column(index),
          rule: {
            condition: { type: "ONE_OF_LIST", values: col.options.map((value) => ({ userEnteredValue: value })) },
            strict: true,
            showCustomUi: true,
          },
        },
      });
    }
  });
  return out;
}

export function sheetConfig() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const secretId = process.env.GOOGLE_SHEETS_SECRET_ID;
  // On AWS: the OAuth client and refresh token come from Secrets Manager (googleCredentials.ts).
  if (spreadsheetId && secretId) {
    return { mode: "oauth", spreadsheetId, credentials: () => googleCredentials(secretId) };
  }
  // TEMPORARY, until the secret is in place: the same values as environment variables.
  // Remove this branch, and GOOGLE_OAUTH_* in amplify.yml, once GOOGLE_SHEETS_SECRET_ID is live.
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (spreadsheetId && refreshToken) {
    return {
      mode: "oauth",
      spreadsheetId,
      refreshToken,
      client: { client_id: process.env.GOOGLE_OAUTH_CLIENT_ID, client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET },
    };
  }
  // Local: ~/.config/inkabba/sheet.json, which points at the machine's shared OAuth files.
  return loadConfig(process.env);
}

export const sheetConfigured = () =>
  Boolean(
    (process.env.GOOGLE_SHEET_ID && (process.env.GOOGLE_SHEETS_SECRET_ID || process.env.GOOGLE_OAUTH_REFRESH_TOKEN)) ||
      process.env.INKABBA_SHEET_CONFIG,
  );

export function sheetStore(): Store {
  const sheets: Sheets = createSheets(sheetConfig() as Parameters<typeof createSheets>[0]);
  const cache = new Map<string, { at: number; read: Read }>();
  let sheetIds: Map<string, number> | null = null;
  let ready: Promise<void> | null = null;

  async function setUp() {
    const tabs = (await sheets.tabs()) as { title: string; sheetId: number }[];
    for (const spec of TABS) {
      let sheetId = tabs.find((tab) => tab.title === spec.title)?.sheetId;
      if (sheetId === undefined) {
        const added = await sheets.raw([{ addSheet: { properties: { title: spec.title, hidden: spec.hidden ?? false } } }]);
        sheetId = added.replies[0].addSheet.properties.sheetId as number;
        tabs.push({ title: spec.title, sheetId });
      }
      const headers = ((await sheets.values(spec.title, "1:1"))[0] ?? []) as string[];
      if (headers.every((header) => !String(header).trim())) {
        await sheets.setRange(spec.title, `A1:${colLetter(spec.columns.length)}1`, [spec.columns.map((col) => col.name)]);
        await sheets.raw(formatRequests(sheetId, spec));
        continue;
      }
      // Someone renamed or removed a column the app needs: add it back at the end.
      const have = headerIndex(headers);
      const missing = spec.columns.filter((col) => !(col.name in have) && col.name !== "Owner notes");
      if (missing.length) {
        const start = headers.length + 1;
        await sheets.setRange(
          spec.title,
          `${colLetter(start)}1:${colLetter(start + missing.length - 1)}1`,
          [missing.map((col) => col.name)],
        );
      }
    }
    sheetIds = new Map(tabs.map((tab) => [tab.title, tab.sheetId]));
  }

  const ensureReady = () => {
    ready ??= setUp().catch((error) => {
      ready = null;
      throw error;
    });
    return ready;
  };

  async function read(spec: TabSpec, fresh = false): Promise<Read> {
    await ensureReady();
    const hit = cache.get(spec.title);
    if (!fresh && hit && Date.now() - hit.at < READ_CACHE_MS) return hit.read;
    const values = (await sheets.values(spec.title, "A1:ZZ", { render: "UNFORMATTED_VALUE" })) as Cell[][];
    const headers = (values[0] ?? []).map((header) => String(header).trim());
    const rows = values.slice(1).map((cells, i) => {
      const row: Values = {};
      headers.forEach((header, col) => {
        if (header && !(header in row)) row[header] = cells[col] ?? "";
      });
      return { rowNumber: i + 2, values: row };
    });
    const result = { headers, rows };
    cache.set(spec.title, { at: Date.now(), read: result });
    return result;
  }

  function locate(spec: TabSpec, data: Read, pk: string, sk: string) {
    return data.rows.find((row) => {
      const key = spec.keyOf(row.values);
      return key?.pk === pk && key.sk === sk;
    });
  }

  async function write(item: Item) {
    const spec = tabFor(item.pk);
    const values = spec.toRow(item);
    // Find the row by its key now, at write time, never from an earlier read.
    const data = await read(spec, true);
    const index = headerIndex(data.headers) as Record<string, number>;
    const existing = locate(spec, data, item.pk, item.sk);
    if (existing) {
      await sheets.setCells(
        spec.title,
        Object.entries(values).map(([name, value]) => ({ ref: `${colLetter(index[name])}${existing.rowNumber}`, value })),
      );
    } else {
      const width = Math.max(...Object.keys(values).map((name) => index[name]));
      const row: Cell[] = Array.from({ length: width }, () => "");
      for (const [name, value] of Object.entries(values)) row[index[name] - 1] = value;
      await sheets.append(spec.title, row);
    }
    cache.delete(spec.title);
    const formats = cellFormats(sheetIds!.get(spec.title)!, spec, index);
    if (formats.length) await sheets.raw(formats);
  }

  async function removeRows(spec: TabSpec, rowNumbers: number[]) {
    if (!rowNumbers.length) return;
    const sheetId = sheetIds!.get(spec.title)!;
    // Bottom first, so earlier deletions don't shift the rows still to go.
    await sheets.raw(
      [...rowNumbers]
        .sort((a, b) => b - a)
        .map((rowNumber) => ({
          deleteDimension: { range: { sheetId, dimension: "ROWS", startIndex: rowNumber - 1, endIndex: rowNumber } },
        })),
    );
    cache.delete(spec.title);
  }

  return {
    async put(item) {
      // An append can collide with another write landing on the same row; try again.
      for (let attempt = 1; ; attempt++) {
        try {
          await write(item);
          break;
        } catch (error) {
          if (attempt >= 3 || !String(error).includes("does not read back")) throw error;
        }
      }
      if (tabFor(item.pk) === appTab && item.pk === "LOGIN") {
        // Tidy expired sign-in records while we're here.
        const data = await read(appTab, true);
        const expired = data.rows.filter((row) => {
          const record = appTab.fromRow(row.values);
          return record && isExpired(record);
        });
        await removeRows(appTab, expired.map((row) => row.rowNumber));
      }
    },
    async get(pk, sk) {
      const spec = tabFor(pk);
      const row = locate(spec, await read(spec), pk, sk);
      const item = row ? spec.fromRow(row.values) : null;
      return item && !isExpired(item) ? item : null;
    },
    async del(pk, sk) {
      const spec = tabFor(pk);
      const row = locate(spec, await read(spec, true), pk, sk);
      if (row) await removeRows(spec, [row.rowNumber]);
    },
    async list(pk, { newestFirst = false, limit = 500 } = {}) {
      const spec = tabFor(pk);
      const items = (await read(spec)).rows
        .map((row) => spec.fromRow(row.values))
        .filter((item): item is Item => item !== null && item.pk === pk)
        .sort((a, b) => (a.sk < b.sk ? -1 : a.sk > b.sk ? 1 : 0));
      return (newestFirst ? items.reverse() : items).slice(0, limit);
    },
    async next(pk, sk, start) {
      // Never hand out a number already used in the Quotes tab, even if the counter row was lost.
      const current = await this.get(pk, sk);
      const used = pk === "COUNTER" && sk === "quote" ? (await this.list("QUOTE", { newestFirst: true, limit: 1 }))[0] : null;
      const n = Math.max(current ? Number(current.n) + 1 : start, used ? Number(used.sk) + 1 : start);
      await this.put({ pk, sk, n });
      return n;
    },
  };
}
