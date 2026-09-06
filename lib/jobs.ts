import { sql } from "./db";
import { fingerprint, type IncomingJob } from "./validation";
import { duplicateScore } from "./deduplication";

async function findDuplicate(job: IncomingJob, sourceId: string) {
  const candidates = await sql`
    SELECT id, company, title, location, contract
    FROM jobs
    WHERE active = TRUE
      AND duplicate_of_job_id IS NULL
      AND source_id <> ${sourceId}
      AND last_seen_at >= NOW() - INTERVAL '60 days'
      AND (${job.contract ?? null}::text IS NULL OR contract IS NULL OR contract = ${job.contract ?? null})
    ORDER BY COALESCE(published_at, first_seen_at) DESC
    LIMIT 150
  `;

  let best: { id: string; score: number } | null = null;
  for (const candidate of candidates.rows) {
    const score = duplicateScore(job, {
      company: candidate.company as string,
      title: candidate.title as string,
      location: candidate.location as string,
      contract: candidate.contract as IncomingJob["contract"]
    });
    if (score >= 0.76 && (!best || score > best.score)) best = { id: candidate.id as string, score };
  }
  return best;
}

export async function upsertJob(job: IncomingJob) {
  const sourceResult = await sql`SELECT id FROM sources WHERE slug = ${job.source} AND enabled = TRUE LIMIT 1`;
  const source = sourceResult.rows[0];
  if (!source) throw new Error(`Source inconnue ou désactivée: ${job.source}`);
  const jobFingerprint = fingerprint(job);

  const existing = await sql`
    UPDATE jobs SET
      last_seen_at = NOW(), active = TRUE, title = ${job.title},
      description = ${job.description}, location = ${job.location},
      contract = ${job.contract ?? null}, remote = ${job.remote},
      apply_url = ${job.applyUrl}, published_at = ${job.publishedAt ?? null},
      deadline_at = ${job.deadlineAt ?? null}, raw = ${JSON.stringify(job)}::jsonb
    WHERE fingerprint = ${jobFingerprint}
    RETURNING id, duplicate_of_job_id AS "duplicateOfJobId",
      deduplication_score AS "deduplicationScore"
  `;
  if (existing.rows[0]) {
    const row = existing.rows[0];
    return {
      id: row.id as string,
      inserted: false,
      duplicate: Boolean(row.duplicateOfJobId),
      duplicateOfJobId: row.duplicateOfJobId as string | null,
      deduplicationScore: row.deduplicationScore === null ? null : Number(row.deduplicationScore)
    };
  }

  const duplicate = await findDuplicate(job, source.id as string);

  const result = await sql`
    INSERT INTO jobs (
      source_id, external_id, fingerprint, company, title, description, location,
      contract, remote, apply_url, published_at, deadline_at, raw,
      duplicate_of_job_id, deduplication_score
    ) VALUES (
      ${source.id}, ${job.externalId}, ${jobFingerprint}, ${job.company}, ${job.title},
      ${job.description}, ${job.location}, ${job.contract ?? null}, ${job.remote}, ${job.applyUrl},
      ${job.publishedAt ?? null}, ${job.deadlineAt ?? null}, ${JSON.stringify(job)}::jsonb,
      ${duplicate?.id ?? null}, ${duplicate?.score ?? null}
    )
    ON CONFLICT (fingerprint) DO UPDATE SET
      last_seen_at = NOW(), active = TRUE, title = EXCLUDED.title,
      description = EXCLUDED.description, location = EXCLUDED.location,
      contract = EXCLUDED.contract, remote = EXCLUDED.remote,
      apply_url = EXCLUDED.apply_url, published_at = EXCLUDED.published_at,
      duplicate_of_job_id = COALESCE(jobs.duplicate_of_job_id, EXCLUDED.duplicate_of_job_id),
      deduplication_score = COALESCE(jobs.deduplication_score, EXCLUDED.deduplication_score)
    RETURNING id, (xmax = 0) AS inserted, duplicate_of_job_id AS "duplicateOfJobId",
      deduplication_score AS "deduplicationScore"
  `;
  const row = result.rows[0];
  return {
    id: row.id as string,
    inserted: row.inserted as boolean,
    duplicate: Boolean(row.duplicateOfJobId),
    duplicateOfJobId: row.duplicateOfJobId as string | null,
    deduplicationScore: row.deduplicationScore === null ? null : Number(row.deduplicationScore)
  };
}
