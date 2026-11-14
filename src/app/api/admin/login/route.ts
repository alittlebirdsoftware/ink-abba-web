import { NextResponse } from "next/server";
import { z } from "zod";
import { linkBase, startLogin } from "@/lib/server/auth";

const body = z.object({ email: z.email().max(254) });

/**
 * Requests a sign-in link. The answer is the same whether or not the address
 * belongs to an owner, so this cannot be used to find out who the owner is.
 */
export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (parsed.success) {
    try {
      await startLogin(parsed.data.email, linkBase(request));
    } catch (error) {
      console.error("LOGIN_LINK_FAILED", error);
    }
  }
  return NextResponse.json({ ok: true });
}
