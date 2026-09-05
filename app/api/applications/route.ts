import { auth } from "@/auth";
import { applicationStatus, createApplicationSchema, updateApplicationSchema } from "@/lib/application-validation";
import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

async function currentEmail() {
  const session = await auth();
  return session?.user?.email?.trim().toLowerCase() ?? null;
}

export async function GET() {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const result = await sql`
    SELECT a.id, a.job_id, a.status, a.notes, a.applied_at, a.created_at, a.updated_at,
      j.company, j.title, j.location, j.contract, j.remote, j.apply_url, j.published_at,
      s.name AS source
    FROM applications a
    JOIN users u ON u.id = a.user_id
    JOIN jobs j ON j.id = a.job_id
    JOIN sources s ON s.id = j.source_id
    WHERE LOWER(u.email) = ${email}
    ORDER BY a.updated_at DESC
  `;
  return NextResponse.json({ applications: result.rows.map((row) => ({
    id: row.id, jobId: row.job_id, status: row.status, notes: row.notes,
    appliedAt: row.applied_at, createdAt: row.created_at, updatedAt: row.updated_at,
    company: row.company, title: row.title, location: row.location, contract: row.contract,
    remote: row.remote, applyUrl: row.apply_url, publishedAt: row.published_at, source: row.source
  })) });
}

export async function POST(request: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Connecte-toi pour suivre cette offre." }, { status: 401 });
  const parsed = createApplicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Offre invalide" }, { status: 400 });
  const result = await sql`
    INSERT INTO applications (user_id, job_id)
    SELECT u.id, j.id FROM users u CROSS JOIN jobs j
    WHERE LOWER(u.email) = ${email} AND j.id = ${parsed.data.jobId}
    ON CONFLICT (user_id, job_id) DO UPDATE SET updated_at = applications.updated_at
    RETURNING id, status
  `;
  if (!result.rows[0]) return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, application: result.rows[0] });
}

export async function PATCH(request: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const parsed = updateApplicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  const { id, status, notes } = parsed.data;
  const result = await sql`
    UPDATE applications a SET status = ${status}, notes = ${notes},
      applied_at = CASE WHEN ${status} = 'applied' AND applied_at IS NULL THEN NOW() ELSE applied_at END,
      updated_at = NOW()
    FROM users u WHERE a.user_id = u.id AND a.id = ${id} AND LOWER(u.email) = ${email}
    RETURNING a.id, a.status, a.notes, a.applied_at, a.updated_at
  `;
  if (!result.rows[0]) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true, application: result.rows[0] });
}

export async function DELETE(request: Request) {
  const email = await currentEmail();
  if (!email) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
  const result = await sql`
    DELETE FROM applications a USING users u
    WHERE a.user_id = u.id AND a.id = ${parsedId.data} AND LOWER(u.email) = ${email}
    RETURNING a.id
  `;
  if (!result.rows[0]) return NextResponse.json({ error: "Candidature introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
