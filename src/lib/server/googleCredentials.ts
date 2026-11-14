/**
 * The Google OAuth client and refresh token the sheet store uses, read from
 * AWS Secrets Manager at run time through the Amplify compute role. They are
 * never in an environment variable or the build output.
 *
 * The secret is a JSON string: {"client_id", "client_secret", "refresh_token"}.
 * It is read on first use and again after five minutes, so a rotated token
 * is picked up without a redeploy.
 */
import "server-only";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { clientOptions } from "./config";

export interface GoogleCredentials {
  refreshToken: string;
  client: { client_id: string; client_secret: string };
}

const TTL_MS = 5 * 60_000;
let client: SecretsManagerClient | null = null;
let cached: { at: number; value: Promise<GoogleCredentials> } | null = null;

async function load(secretId: string): Promise<GoogleCredentials> {
  client ??= new SecretsManagerClient(clientOptions);
  const out = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  const secret = JSON.parse(out.SecretString ?? "{}");
  if (!secret.client_id || !secret.client_secret || !secret.refresh_token) {
    throw new Error(`Secret ${secretId} needs client_id, client_secret and refresh_token`);
  }
  return {
    refreshToken: secret.refresh_token,
    client: { client_id: secret.client_id, client_secret: secret.client_secret },
  };
}

export function googleCredentials(secretId: string): Promise<GoogleCredentials> {
  if (!cached || Date.now() - cached.at > TTL_MS) {
    const value = load(secretId);
    cached = { at: Date.now(), value };
    // A failed read is not kept: the next call tries again.
    value.catch(() => {
      if (cached?.value === value) cached = null;
    });
  }
  return cached.value;
}
