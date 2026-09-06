CREATE TABLE IF NOT EXISTS candidate_cvs (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 3145728),
  page_count SMALLINT NOT NULL CHECK (page_count BETWEEN 1 AND 12),
  text_ciphertext TEXT NOT NULL,
  text_iv TEXT NOT NULL,
  text_length INTEGER NOT NULL,
  content_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
