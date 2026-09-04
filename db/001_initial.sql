CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('api', 'ats', 'rss')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id),
  external_id TEXT NOT NULL,
  fingerprint CHAR(64) NOT NULL UNIQUE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT 'France',
  contract TEXT CHECK (contract IN ('stage', 'alternance', 'cdi', 'cdd', 'graduate')),
  remote BOOLEAN NOT NULL DEFAULT FALSE,
  apply_url TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS jobs_fresh_idx ON jobs(active, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS jobs_contract_idx ON jobs(contract) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS jobs_location_idx ON jobs(location) WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  slack_webhook_encrypted TEXT,
  minimum_score SMALLINT NOT NULL DEFAULT 60 CHECK (minimum_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  contracts TEXT[] NOT NULL DEFAULT ARRAY['stage', 'alternance'],
  locations TEXT[] NOT NULL DEFAULT ARRAY['France'],
  remote_only BOOLEAN NOT NULL DEFAULT FALSE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  excluded_keywords TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS alerts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'slack',
  kind TEXT NOT NULL DEFAULT 'new_job' CHECK (kind IN ('new_job', 'deadline_reminder')),
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  provider_message_id TEXT,
  UNIQUE(user_id, job_id, kind)
);

INSERT INTO sources (slug, name, kind) VALUES
  ('france-travail', 'France Travail', 'api'),
  ('la-bonne-alternance', 'La Bonne Alternance', 'api'),
  ('adzuna', 'Adzuna', 'api'),
  ('greenhouse', 'Greenhouse', 'ats'),
  ('lever', 'Lever', 'ats'),
  ('ashby', 'Ashby', 'ats'),
  ('smartrecruiters', 'SmartRecruiters', 'ats')
ON CONFLICT (slug) DO NOTHING;
