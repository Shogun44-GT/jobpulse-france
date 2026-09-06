import { NextRequest, NextResponse } from "next/server";
import { fetchFranceTravailJobs } from "@/lib/connectors/france-travail";
import { fetchLaBonneAlternanceJobs, isLaBonneAlternanceConfigured } from "@/lib/connectors/la-bonne-alternance";
import { atsConfigured, fetchAshbyJobs, fetchGreenhouseJobs, fetchLeverJobs, fetchSmartRecruitersJobs } from "@/lib/connectors/ats";
import { upsertJob } from "@/lib/jobs";
import { sql } from "@/lib/db";
import { deliverSlackOutbox, deliverUserSlackOutbox, enqueueSlack, enqueueUserSlack, shouldNotify } from "@/lib/slack";

export const maxDuration = 60;

type SourceResult = {
  source: string;
  status: "success" | "failed" | "skipped";
  fetched: number;
  inserted: number;
  error?: string;
};

async function setSourceStatus(slug: string, success: boolean) {
  if (success) await sql`UPDATE sources SET last_success_at = NOW() WHERE slug = ${slug}`;
  else await sql`UPDATE sources SET last_error_at = NOW() WHERE slug = ${slug}`;
}

async function ingestSource(slug: string, fetchJobs: () => Promise<Awaited<ReturnType<typeof fetchFranceTravailJobs>>>) {
  try {
    const jobs = await fetchJobs();
    let inserted = 0;
    for (const job of jobs) {
      const result = await upsertJob(job);
      if (result.inserted && !result.duplicate) {
        inserted += 1;
        if (shouldNotify(job.contract)) await enqueueSlack(result.id);
        await enqueueUserSlack(result.id);
      }
    }
    await setSourceStatus(slug, true);
    return { source: slug, status: "success", fetched: jobs.length, inserted } satisfies SourceResult;
  } catch (error) {
    await setSourceStatus(slug, false);
    return {
      source: slug,
      status: "failed",
      fetched: 0,
      inserted: 0,
      error: error instanceof Error ? error.message : "Erreur inconnue"
    } satisfies SourceResult;
  }
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const startedAt = Date.now();
  try {
    const selected = request.nextUrl.searchParams.get("source") || "france-travail";
    const connectors = {
      "france-travail": { configured: true, fetchJobs: fetchFranceTravailJobs },
      "la-bonne-alternance": { configured: isLaBonneAlternanceConfigured(), fetchJobs: fetchLaBonneAlternanceJobs },
      greenhouse: { configured: atsConfigured("greenhouse"), fetchJobs: fetchGreenhouseJobs },
      lever: { configured: atsConfigured("lever"), fetchJobs: fetchLeverJobs },
      ashby: { configured: atsConfigured("ashby"), fetchJobs: fetchAshbyJobs },
      smartrecruiters: { configured: atsConfigured("smartrecruiters"), fetchJobs: fetchSmartRecruitersJobs }
    } as const;
    if (!(selected in connectors)) {
      return NextResponse.json({ ok: false, error: `Source inconnue: ${selected}` }, { status: 400 });
    }
    const connector = connectors[selected as keyof typeof connectors];
    const result = connector.configured
      ? await ingestSource(selected, connector.fetchJobs)
      : { source: selected, status: "skipped", fetched: 0, inserted: 0 } satisfies SourceResult;
    const sources = [result];

    const slack = await deliverSlackOutbox();
    const userSlack = await deliverUserSlackOutbox();
    const fetched = sources.reduce((total, source) => total + source.fetched, 0);
    const inserted = sources.reduce((total, source) => total + source.inserted, 0);
    const ok = result.status !== "failed";

    return NextResponse.json(
      { ok, source: selected, fetched, inserted, sources, slack, userSlack, durationMs: Date.now() - startedAt },
      { status: ok ? 200 : 500 }
    );
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }, { status: 500 });
  }
}
