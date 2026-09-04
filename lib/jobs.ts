import { sql } from "./db";
import { fingerprint, type IncomingJob } from "./validation";

export async function upsertJob(job: IncomingJob) {
  const sourceResult = await sql`SELECT id FROM sources WHERE slug = ${job.source} AND enabled = TRUE LIMIT 1`;
  const source = sourceResult.rows[0];
  if (!source) throw new Error(`Source inconnue ou désactivée: ${job.source}`);

  const result = await sql`
    INSERT INTO jobs (
      source_id, external_id, fingerprint, company, title, description, location,
      contract, remote, apply_url, published_at, deadline_at, raw
    ) VALUES (
      ${source.id}, ${job.externalId}, ${fingerprint(job)}, ${job.company}, ${job.title},
      ${job.description}, ${job.location}, ${job.contract ?? null}, ${job.remote}, ${job.applyUrl},
      ${job.publishedAt ?? null}, ${job.deadlineAt ?? null}, ${JSON.stringify(job)}::jsonb
    )
    ON CONFLICT (fingerprint) DO UPDATE SET
      last_seen_at = NOW(), active = TRUE, title = EXCLUDED.title,
      description = EXCLUDED.description, location = EXCLUDED.location,
      contract = EXCLUDED.contract, remote = EXCLUDED.remote,
      apply_url = EXCLUDED.apply_url, published_at = EXCLUDED.published_at
    RETURNING id, (first_seen_at = last_seen_at) AS inserted
  `;
  return result.rows[0] as { id: string; inserted: boolean };
}
