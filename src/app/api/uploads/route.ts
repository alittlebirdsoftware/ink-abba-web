import { NextResponse } from "next/server";
import { z } from "zod";
import { createUpload } from "@/lib/server/uploads";
import { validateFile } from "@/lib/validate";

const body = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
});

/** Issues a short-lived upload form for one file. The file itself goes straight to S3. */
export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const problem = validateFile({ type: parsed.data.contentType, size: parsed.data.size });
  if (problem) {
    return NextResponse.json({ ok: false, error: problem }, { status: 422 });
  }

  try {
    const upload = await createUpload(parsed.data.filename, parsed.data.contentType);
    if (!upload) {
      return NextResponse.json({ ok: false, error: "uploads_unavailable" }, { status: 501 });
    }
    return NextResponse.json({ ok: true, ...upload });
  } catch (error) {
    console.error("UPLOAD_PRESIGN_FAILED", error);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
