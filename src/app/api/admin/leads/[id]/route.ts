import { NextResponse } from "next/server";
import { z } from "zod";
import { ownerRequest } from "@/lib/server/auth";
import { LEAD_STATUSES, updateLead } from "@/lib/server/leads";

const body = z.object({ status: z.enum(LEAD_STATUSES) });

/** Changes a lead's status. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await ownerRequest(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const lead = await updateLead((await params).id, { status: parsed.data.status });
  return lead ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false }, { status: 404 });
}
