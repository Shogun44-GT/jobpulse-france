CREATE TABLE IF NOT EXISTS sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  fetched INTEGER NOT NULL DEFAULT 0,
  inserted INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sync_runs_source_created_idx
  ON sync_runs (source, created_at DESC);

-- Garde 30 jours d'historique sans nécessiter une tâche supplémentaire.
CREATE OR REPLACE FUNCTION cleanup_old_sync_runs() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM sync_runs WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cleanup_sync_runs_after_insert ON sync_runs;
CREATE TRIGGER cleanup_sync_runs_after_insert
AFTER INSERT ON sync_runs
FOR EACH STATEMENT EXECUTE FUNCTION cleanup_old_sync_runs();
