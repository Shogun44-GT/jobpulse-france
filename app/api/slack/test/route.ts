import { NextRequest, NextResponse } from "next/server";
import { sendSlackTest } from "@/lib/slack";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    await sendSlackTest();
    return NextResponse.json({ ok: true, message: "Message de test envoyé" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur Slack" }, { status: 500 });
  }
}
