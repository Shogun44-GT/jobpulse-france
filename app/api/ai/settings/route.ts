import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { encryptSecret } from "@/lib/secret-crypto";
import { geminiModel, validateGeminiKey } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ apiKey: z.string().trim().min(20, "Clé API trop courte").max(500) });
async function email() { const session = await auth(); return session?.user?.email?.trim().toLowerCase() ?? null; }

export async function GET() {
  const userEmail = await email();
  if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const result = await sql`SELECT ais.provider,ais.model,ais.api_key_last_four,ais.updated_at FROM user_ai_settings ais JOIN users u ON u.id=ais.user_id WHERE LOWER(u.email)=${userEmail} LIMIT 1`;
  const row = result.rows[0];
  return NextResponse.json({ configured: Boolean(row), settings: row ? { provider: row.provider, model: row.model, lastFour: row.api_key_last_four, updatedAt: row.updated_at } : null });
}

export async function PUT(request: Request) {
  const userEmail = await email();
  if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Clé invalide" }, { status: 400 });
  try { await validateGeminiKey(parsed.data.apiKey); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Clé invalide" }, { status: 400 }); }
  const encrypted = encryptSecret(parsed.data.apiKey);
  const result = await sql`
    INSERT INTO user_ai_settings (user_id,provider,model,api_key_ciphertext,api_key_iv,api_key_last_four)
    SELECT id,'gemini',${geminiModel},${encrypted.ciphertext},${encrypted.iv},${parsed.data.apiKey.slice(-4)} FROM users WHERE LOWER(email)=${userEmail}
    ON CONFLICT (user_id) DO UPDATE SET provider=EXCLUDED.provider,model=EXCLUDED.model,api_key_ciphertext=EXCLUDED.api_key_ciphertext,api_key_iv=EXCLUDED.api_key_iv,api_key_last_four=EXCLUDED.api_key_last_four,updated_at=NOW()
    RETURNING user_id`;
  if (!result.rows[0]) return NextResponse.json({ error: "Compte utilisateur introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, settings: { provider: "gemini", model: geminiModel, lastFour: parsed.data.apiKey.slice(-4) } });
}

export async function DELETE() {
  const userEmail = await email();
  if (!userEmail) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  await sql`DELETE FROM user_ai_settings ais USING users u WHERE ais.user_id=u.id AND LOWER(u.email)=${userEmail}`;
  return NextResponse.json({ ok: true });
}
