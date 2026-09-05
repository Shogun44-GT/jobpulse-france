ALTER TABLE user_notification_outbox
  ADD COLUMN IF NOT EXISTS match_score SMALLINT CHECK (match_score BETWEEN 0 AND 100);

ALTER TABLE user_notification_outbox
  ADD COLUMN IF NOT EXISTS match_reasons TEXT[] NOT NULL DEFAULT '{}';
