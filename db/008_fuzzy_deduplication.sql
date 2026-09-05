ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS duplicate_of_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deduplication_score NUMERIC(5,4);

CREATE INDEX IF NOT EXISTS jobs_canonical_fresh_idx
  ON jobs(active, first_seen_at DESC)
  WHERE duplicate_of_job_id IS NULL;

CREATE INDEX IF NOT EXISTS jobs_duplicate_of_idx
  ON jobs(duplicate_of_job_id)
  WHERE duplicate_of_job_id IS NOT NULL;
