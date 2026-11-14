/**
 * Owner sign-in without a password.
 *
 * The owner enters their email; if it is on the OWNER_EMAILS list they are
 * sent a link that works once, for 15 minutes. Opening it and pressing
 * "Sign in" creates a 30-day session. Only hashes of the link token and the
 * session id are stored, so a copy of the database cannot be used to sign in.
 */
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { site } from "@/lib/site";
import { config } from "./config";
import { sendLoginLink } from "./notify";
import { store, ttl } from "./store";

const COOKIE = "ia_session";
const LINK_MINUTES = 15;
const SESSION_DAYS = 30;
const RESEND_SECONDS = 60;

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function ownerEmails() {
  return (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** In production only listed addresses may sign in. In development, with no list, any address may. */
function isOwner(email: string) {
  const allowed = ownerEmails();
  if (allowed.length === 0) return !config.isProduction;
  return allowed.includes(email);
}

/**
 * Base address for links in emails. In production this is always SITE_URL,
 * never the incoming request's host, so a forged Host header cannot make the
 * app email a sign-in link that points at someone else's site.
 */
export function linkBase(request: Request) {
  return config.isProduction ? site.url : new URL(request.url).origin;
}

/** Sends a sign-in link if the address is an owner's. Callers respond the same either way. */
export async function startLogin(rawEmail: string, base: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!isOwner(email)) return;

  const recent = await store().get("LOGINRATE", email);
  if (recent && Date.now() - Number(recent.at) < RESEND_SECONDS * 1000) return;
  const now = new Date();
  await store().put({ pk: "LOGINRATE", sk: email, at: now.getTime(), ttl: ttl(new Date(now.getTime() + 3_600_000)) });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(now.getTime() + LINK_MINUTES * 60_000);
  await store().put({ pk: "LOGIN", sk: hash(token), email, expiresAt: expiresAt.toISOString(), ttl: ttl(expiresAt) });
  await sendLoginLink(email, `${base}/admin/verify?token=${token}`, LINK_MINUTES);
}

/** Exchanges a link token for a session cookie. Returns false if the link is unknown, used or expired. */
export async function completeLogin(token: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(token)) return false;
  const record = await store().get("LOGIN", hash(token));
  if (!record) return false;
  await store().del("LOGIN", hash(token));
  if (new Date(String(record.expiresAt)) < new Date()) return false;

  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await store().put({
    pk: "SESSION",
    sk: hash(sessionId),
    email: record.email,
    expiresAt: expiresAt.toISOString(),
    ttl: ttl(expiresAt),
  });
  (await cookies()).set(COOKIE, sessionId, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return true;
}

/** The signed-in owner's email, or null. */
export async function getOwner(): Promise<string | null> {
  const sessionId = (await cookies()).get(COOKIE)?.value;
  if (!sessionId || !/^[0-9a-f]{64}$/.test(sessionId)) return null;
  const session = await store().get("SESSION", hash(sessionId));
  if (!session || new Date(String(session.expiresAt)) < new Date()) return null;
  return String(session.email);
}

/** For owner pages: sends anyone not signed in to the sign-in page. */
export async function requireOwner(): Promise<string> {
  const owner = await getOwner();
  if (!owner) redirect("/admin/login");
  return owner;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const sessionId = jar.get(COOKIE)?.value;
  if (sessionId) await store().del("SESSION", hash(sessionId));
  jar.delete(COOKIE);
}

/** For owner API routes. Other sites have no reason to call them. */
export async function ownerRequest(request: Request): Promise<string | null> {
  if (request.headers.get("sec-fetch-site") === "cross-site") return null;
  return getOwner();
}
