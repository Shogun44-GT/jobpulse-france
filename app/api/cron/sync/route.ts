import { NextRequest, NextResponse } from "next/server";
import { fetchFranceTravailJobs } from "@/lib/connectors/france-travail";
import { upsertJob } from "@/lib/jobs";
import { sql } from "@/lib/db";
import { deliverSlackOutbox, enqueueSlack, shouldNotify } from "@/lib/slack";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const startedAt = Date.now();
  try {
    const jobs = await fetchFranceTravailJobs();
    let inserted = 0;
    for (const job of jobs) {
      const result = await upsertJob(job);
      if (result.inserted) {
        inserted += 1;
        if (shouldNotify(job.contract)) await enqueueSlack(result.id);
      }
    }
    const slack = await deliverSlackOutbox();
    await sql`UPDATE sources SET last_success_at = NOW() WHERE slug = 'france-travail'`;
    return NextResponse.json({ ok: true, source: "france-travail", fetched: jobs.length, inserted, slack, durationMs: Date.now() - startedAt });
  } catch (error) {
    await sql`UPDATE sources SET last_error_at = NOW() WHERE slug = 'france-travail'`;
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 500 });
  }
}
