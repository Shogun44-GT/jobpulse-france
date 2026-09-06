import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { decryptSecret } from "@/lib/secret-crypto";
import { generateApplicationHook } from "@/lib/gemini";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ jobId: z.string().uuid("Offre invalide"), format: z.enum(["hook", "letter", "linkedin"]).default("hook") });

export async function POST(request: Request) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Connecte-toi pour générer une accroche" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Offre invalide" }, { status: 400 });
  const result = await sql`
    SELECT u.id AS user_id,ais.provider,ais.model,ais.api_key_ciphertext,ais.api_key_iv,
      cp.headline,cp.education_level,cp.experience_years,cp.skills,cp.desired_roles,
      j.id AS job_id,j.title,j.company,j.location,j.contract,j.description
    FROM users u
    LEFT JOIN user_ai_settings ais ON ais.user_id=u.id
    LEFT JOIN candidate_profiles cp ON cp.user_id=u.id
    CROSS JOIN jobs j
    WHERE LOWER(u.email)=${email} AND j.id=${parsed.data.jobId} AND j.active=TRUE
    LIMIT 1`;
  const row = result.rows[0];
  if (!row) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  if (!row.api_key_ciphertext) return NextResponse.json({ error: "Configure d’abord ta clé Gemini", needsSetup: true }, { status: 409 });
  if (!row.headline && !(row.skills as string[] | null)?.length) return NextResponse.json({ error: "Complète d’abord ton profil pour obtenir un texte fiable", needsProfile: true }, { status: 409 });
  const recent = await sql`SELECT COUNT(*)::int AS total FROM ai_generation_log WHERE user_id=${row.user_id as string} AND created_at > NOW()-INTERVAL '1 hour'`;
  if ((recent.rows[0]?.total as number) >= 10) return NextResponse.json({ error: "Limite de 10 générations par heure atteinte" }, { status: 429 });
  try {
    const hook = await generateApplicationHook({
      apiKey: decryptSecret(row.api_key_ciphertext as string, row.api_key_iv as string),
      format: parsed.data.format,
      job: { title: row.title as string, company: row.company as string, location: row.location as string, contract: row.contract as string | null, description: row.description as string },
      profile: { headline: (row.headline as string | null) ?? "", educationLevel: (row.education_level as string | null) ?? "", experienceYears: (row.experience_years as number | null) ?? 0, skills: (row.skills as string[] | null) ?? [], desiredRoles: (row.desired_roles as string[] | null) ?? [] }
    });
    await sql`INSERT INTO ai_generation_log (user_id,job_id,provider,model) VALUES (${row.user_id as string},${row.job_id as string},${row.provider as string},${row.model as string})`;
    return NextResponse.json({ ok: true, hook });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Génération impossible" }, { status: 502 });
  }
}
