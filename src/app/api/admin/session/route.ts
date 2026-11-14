import { NextResponse } from "next/server";
import { z } from "zod";
import { completeLogin, signOut } from "@/lib/server/auth";

const body = z.object({ token: z.string().max(100) });

/** Exchanges the one-time token from a sign-in link for a session. */
export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  const ok = parsed.success && (await completeLogin(parsed.data.token));
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}

/** Signs out. */
export async function DELETE(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  await signOut();
  return NextResponse.json({ ok: true });
}
