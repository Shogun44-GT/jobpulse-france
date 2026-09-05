import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { auth } from "@/auth";
import { calculateMatch } from "@/lib/matching";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") || "").slice(0, 100);
  const contract = (params.get("contract") || "").slice(0, 20);
  const location = (params.get("location") || "").slice(0, 100);
  const remote = params.get("remote") === "true";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = 24;
  const offset = (page - 1) * limit;
  const pattern = `%${q}%`;
  const locationPattern = `%${location}%`;
  const jobs = await sql`
    SELECT j.id, j.company, j.title, j.description, j.location, j.contract, j.remote,
      j.apply_url AS "applyUrl", j.published_at AS "publishedAt", s.name AS source
    FROM jobs j JOIN sources s ON s.id = j.source_id
    WHERE j.active = TRUE
      AND (${q} = '' OR j.title ILIKE ${pattern} OR j.company ILIKE ${pattern} OR j.description ILIKE ${pattern})
      AND (${contract} = '' OR j.contract = ${contract})
      AND (${location} = '' OR j.location ILIKE ${locationPattern})
      AND (${remote} = FALSE OR j.remote = TRUE)
    ORDER BY COALESCE(j.published_at, j.first_seen_at) DESC LIMIT ${limit} OFFSET ${offset}
  `;
  const session = await auth();
  let profile: Record<string, unknown> | null = null;
  if (session?.user?.email) {
    const email = session.user.email.toLowerCase();
    const profileResult = await sql`
      SELECT cp.desired_roles, cp.skills, cp.desired_locations, cp.desired_contracts,
        cp.remote_preference, cp.minimum_score
      FROM candidate_profiles cp JOIN users u ON u.id=cp.user_id
      WHERE LOWER(u.email)=${email} LIMIT 1
    `;
    profile = profileResult.rows[0] ?? null;
  }
  const count = await sql`
    SELECT COUNT(*)::int AS total FROM jobs j WHERE j.active = TRUE
      AND (${q} = '' OR j.title ILIKE ${pattern} OR j.company ILIKE ${pattern} OR j.description ILIKE ${pattern})
      AND (${contract} = '' OR j.contract = ${contract})
      AND (${location} = '' OR j.location ILIKE ${locationPattern})
      AND (${remote} = FALSE OR j.remote = TRUE)
  `;
  const total = count.rows[0].total as number;
  const personalizedJobs = jobs.rows.map((row) => {
    const { description, ...publicJob } = row;
    if (!profile) return publicJob;
    const match = calculateMatch({ title:row.title as string, description:description as string, location:row.location as string, contract:row.contract as string|null, remote:row.remote as boolean }, {
      desiredRoles:profile.desired_roles as string[], skills:profile.skills as string[],
      desiredLocations:profile.desired_locations as string[], desiredContracts:profile.desired_contracts as string[],
      remotePreference:profile.remote_preference as string, minimumScore:profile.minimum_score as number
    });
    return { ...publicJob, score:match.score, matchReasons:match.reasons, profileReady:match.profileReady };
  });
  return NextResponse.json({ jobs: personalizedJobs, total, page, pages: Math.ceil(total / limit) });
}
