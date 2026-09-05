CREATE TABLE IF NOT EXISTS candidate_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT,
  education_level TEXT,
  experience_years SMALLINT NOT NULL DEFAULT 0 CHECK (experience_years BETWEEN 0 AND 50),
  skills TEXT[] NOT NULL DEFAULT '{}',
  desired_roles TEXT[] NOT NULL DEFAULT '{}',
  desired_locations TEXT[] NOT NULL DEFAULT '{}',
  desired_contracts TEXT[] NOT NULL DEFAULT ARRAY['stage', 'alternance'],
  remote_preference TEXT NOT NULL DEFAULT 'indifferent'
    CHECK (remote_preference IN ('indifferent', 'hybrid', 'remote')),
  minimum_score SMALLINT NOT NULL DEFAULT 60 CHECK (minimum_score BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS candidate_profiles_locations_idx
  ON candidate_profiles USING GIN (desired_locations);

CREATE INDEX IF NOT EXISTS candidate_profiles_skills_idx
  ON candidate_profiles USING GIN (skills);
