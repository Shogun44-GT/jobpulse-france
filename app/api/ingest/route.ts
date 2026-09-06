import { NextRequest, NextResponse } from "next/server";
import { incomingJobSchema } from "@/lib/validation";
import { upsertJob } from "@/lib/jobs";
import { hasValidBearerToken } from "@/lib/bearer-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const expectedKey = process.env.INGEST_API_KEY;
  if (!hasValidBearerToken(request.headers.get("authorization"), expectedKey)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const parsed = incomingJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Offre invalide", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await upsertJob(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur d'ingestion" }, { status: 422 });
  }
}
