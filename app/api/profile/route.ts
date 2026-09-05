import { auth } from "@/auth";
import { sql } from "@/lib/db";
import { profileSchema } from "@/lib/profile-validation";
import { NextResponse } from "next/server";

const defaults = {
  headline: "", educationLevel: "", experienceYears: 0, skills: [],
  desiredRoles: [], desiredLocations: [], desiredContracts: ["stage", "alternance"],
  remotePreference: "indifferent", minimumScore: 60
};

async function currentUserEmail() {
  const session = await auth();
  return session?.user?.email?.trim().toLowerCase() ?? null;
}

export async function GET() {
  const email = await currentUserEmail();
  if (!email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const result = await sql`
    SELECT cp.headline, cp.education_level, cp.experience_years, cp.skills,
      cp.desired_roles, cp.desired_locations, cp.desired_contracts,
      cp.remote_preference, cp.minimum_score
    FROM candidate_profiles cp JOIN users u ON u.id = cp.user_id
    WHERE LOWER(u.email) = ${email} LIMIT 1
  `;
  const row = result.rows[0];
  if (!row) return NextResponse.json({ profile: defaults });
  return NextResponse.json({ profile: {
    headline: row.headline ?? "", educationLevel: row.education_level ?? "",
    experienceYears: row.experience_years ?? 0, skills: row.skills ?? [],
    desiredRoles: row.desired_roles ?? [], desiredLocations: row.desired_locations ?? [],
    desiredContracts: row.desired_contracts ?? [], remotePreference: row.remote_preference ?? "indifferent",
    minimumScore: row.minimum_score ?? 60
  }});
}

export async function PUT(request: Request) {
  const email = await currentUserEmail();
  if (!email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Profil invalide" }, { status: 400 });
  const p = parsed.data;
  const result = await sql`
    INSERT INTO candidate_profiles (
      user_id, headline, education_level, experience_years, skills, desired_roles,
      desired_locations, desired_contracts, remote_preference, minimum_score
    )
    SELECT id, ${p.headline || null}, ${p.educationLevel || null}, ${p.experienceYears},
      ${p.skills}, ${p.desiredRoles}, ${p.desiredLocations}, ${p.desiredContracts},
      ${p.remotePreference}, ${p.minimumScore}
    FROM users WHERE LOWER(email) = ${email}
    ON CONFLICT (user_id) DO UPDATE SET
      headline = EXCLUDED.headline, education_level = EXCLUDED.education_level,
      experience_years = EXCLUDED.experience_years, skills = EXCLUDED.skills,
      desired_roles = EXCLUDED.desired_roles, desired_locations = EXCLUDED.desired_locations,
      desired_contracts = EXCLUDED.desired_contracts, remote_preference = EXCLUDED.remote_preference,
      minimum_score = EXCLUDED.minimum_score, updated_at = NOW()
    RETURNING user_id
  `;
  if (!result.rows[0]) return NextResponse.json({ error: "Compte utilisateur introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, profile: p });
}
