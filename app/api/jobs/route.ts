import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

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
    SELECT j.id, j.company, j.title, j.location, j.contract, j.remote,
      j.apply_url AS "applyUrl", j.published_at AS "publishedAt", s.name AS source
    FROM jobs j JOIN sources s ON s.id = j.source_id
    WHERE j.active = TRUE
      AND (${q} = '' OR j.title ILIKE ${pattern} OR j.company ILIKE ${pattern} OR j.description ILIKE ${pattern})
      AND (${contract} = '' OR j.contract = ${contract})
      AND (${location} = '' OR j.location ILIKE ${locationPattern})
      AND (${remote} = FALSE OR j.remote = TRUE)
    ORDER BY COALESCE(j.published_at, j.first_seen_at) DESC LIMIT ${limit} OFFSET ${offset}
  `;
  const count = await sql`
    SELECT COUNT(*)::int AS total FROM jobs j WHERE j.active = TRUE
      AND (${q} = '' OR j.title ILIKE ${pattern} OR j.company ILIKE ${pattern} OR j.description ILIKE ${pattern})
      AND (${contract} = '' OR j.contract = ${contract})
      AND (${location} = '' OR j.location ILIKE ${locationPattern})
      AND (${remote} = FALSE OR j.remote = TRUE)
  `;
  const total = count.rows[0].total as number;
  return NextResponse.json({ jobs: jobs.rows, total, page, pages: Math.ceil(total / limit) });
}
