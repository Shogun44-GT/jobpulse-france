CREATE TABLE IF NOT EXISTS slack_connections (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  webhook_ciphertext TEXT NOT NULL,
  webhook_iv TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS user_notification_outbox_pending_idx
  ON user_notification_outbox (created_at)
  WHERE status IN ('pending', 'failed');
