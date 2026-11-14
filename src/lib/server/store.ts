/**
 * The one place that talks to storage.
 *
 * Records are keyed by `pk` (the kind of record) and `sk` (its id). Three
 * backends share this interface, chosen in this order:
 * - LEADS_TABLE set: a single DynamoDB table (for when the business outgrows the sheet).
 * - GOOGLE_SHEET_ID + GOOGLE_SHEETS_SECRET_ID (AWS) or INKABBA_SHEET_CONFIG (local) set: the InkAbba
 *   Google Sheet (sheetStore.ts).
 * - Neither, in development: a JSON file in .data/, so the app runs with no accounts at all.
 */
import "server-only";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { clientOptions, config } from "./config";
import { sheetConfigured, sheetStore } from "./sheetStore";

export type Item = { pk: string; sk: string } & Record<string, unknown>;

type ListOptions = { newestFirst?: boolean; limit?: number };

export interface Store {
  put(item: Item): Promise<void>;
  get(pk: string, sk: string): Promise<Item | null>;
  del(pk: string, sk: string): Promise<void>;
  list(pk: string, options?: ListOptions): Promise<Item[]>;
  /** Atomically adds one to a counter and returns the new value; the first value is `start`. */
  next(pk: string, sk: string, start: number): Promise<number>;
}

function dynamoStore(table: string): Store {
  const db = DynamoDBDocumentClient.from(new DynamoDBClient(clientOptions), {
    marshallOptions: { removeUndefinedValues: true },
  });
  return {
    async put(item) {
      await db.send(new PutCommand({ TableName: table, Item: item }));
    },
    async get(pk, sk) {
      const result = await db.send(new GetCommand({ TableName: table, Key: { pk, sk }, ConsistentRead: true }));
      return (result.Item as Item | undefined) ?? null;
    },
    async del(pk, sk) {
      await db.send(new DeleteCommand({ TableName: table, Key: { pk, sk } }));
    },
    async list(pk, { newestFirst = false, limit = 500 } = {}) {
      const items: Item[] = [];
      let start: Record<string, unknown> | undefined;
      do {
        const page = await db.send(
          new QueryCommand({
            TableName: table,
            KeyConditionExpression: "pk = :pk",
            ExpressionAttributeValues: { ":pk": pk },
            ScanIndexForward: !newestFirst,
            Limit: limit - items.length,
            ExclusiveStartKey: start,
          }),
        );
        items.push(...((page.Items ?? []) as Item[]));
        start = page.LastEvaluatedKey;
      } while (start && items.length < limit);
      return items;
    },
    async next(pk, sk, start) {
      const result = await db.send(
        new UpdateCommand({
          TableName: table,
          Key: { pk, sk },
          UpdateExpression: "SET n = if_not_exists(n, :before) + :one",
          ExpressionAttributeValues: { ":before": start - 1, ":one": 1 },
          ReturnValues: "UPDATED_NEW",
        }),
      );
      return Number(result.Attributes?.n);
    },
  };
}

function fileStore(): Store {
  const dir = path.join(process.cwd(), ".data");
  const file = path.join(dir, "db.json");
  const read = (): Record<string, Item> => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {});
  const write = (data: Record<string, Item>) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, JSON.stringify(data, null, 2));
  };
  const key = (pk: string, sk: string) => `${pk}|${sk}`;
  return {
    async put(item) {
      const data = read();
      data[key(item.pk, item.sk)] = item;
      write(data);
    },
    async get(pk, sk) {
      return read()[key(pk, sk)] ?? null;
    },
    async del(pk, sk) {
      const data = read();
      delete data[key(pk, sk)];
      write(data);
    },
    async list(pk, { newestFirst = false, limit = 500 } = {}) {
      const items = Object.values(read())
        .filter((item) => item.pk === pk)
        .sort((a, b) => (a.sk < b.sk ? -1 : 1));
      return (newestFirst ? items.reverse() : items).slice(0, limit);
    },
    async next(pk, sk, start) {
      const data = read();
      const current = data[key(pk, sk)];
      const n = current ? Number(current.n) + 1 : start;
      data[key(pk, sk)] = { pk, sk, n };
      write(data);
      return n;
    },
  };
}

let instance: Store | null = null;

export function store(): Store {
  if (instance) return instance;
  if (config.leadsTable) return (instance = dynamoStore(config.leadsTable));
  if (sheetConfigured()) return (instance = sheetStore());
  if (config.isProduction && process.env.LEADS_ALLOW_LOCAL !== "1") {
    throw new Error("No storage configured (LEADS_TABLE or the Google Sheet); refusing to use local file storage in production.");
  }
  return (instance = fileStore());
}

/** Seconds-since-epoch value for DynamoDB's automatic expiry of short-lived records. */
export const ttl = (expiresAt: Date) => Math.floor(expiresAt.getTime() / 1000);

/** The record without its storage keys. */
export function fields<T>(item: Item): T {
  const copy: Record<string, unknown> = { ...item };
  delete copy.pk;
  delete copy.sk;
  return copy as T;
}
