-- =============================================================================
-- ContractIQ — Complete Supabase Schema
-- Paste this entire file into the Supabase SQL Editor and run on a fresh project.
-- Run once; re-running is safe (all statements use IF NOT EXISTS / OR REPLACE).
-- =============================================================================


-- =============================================================================
-- TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- contracts
-- Master record for each uploaded contract. Stores extracted text so the AI
-- pipeline never needs to re-download the PDF.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  type              text        NOT NULL CHECK (type IN ('NDA', 'MSA')),
  contract_text     text        NOT NULL DEFAULT '',
  file_path         text,                          -- null if Storage upload failed
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  page_count        int         NOT NULL DEFAULT 0,
  token_count       int,                           -- populated after extraction
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_accessed_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- key_terms
-- One row per extracted (or custom) key term for a contract.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS key_terms (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id         uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_name           text        NOT NULL,
  value               text        NOT NULL,
  page_number         int         NOT NULL,
  confidence_score    float       NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_sentence     text        NOT NULL,
  is_custom           boolean     NOT NULL DEFAULT false,
  original_ai_value   text,                        -- set when user edits a term
  is_edited           boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- chat_sessions
-- One session per contract per user; groups all chat messages.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, user_id)
);

-- -----------------------------------------------------------------------------
-- chat_messages
-- Individual messages in a contract chat session.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- user_feedback
-- Thumbs-up / thumbs-down per contract review with optional comment.
-- One submission per contract per user.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_feedback (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id  uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating       text        NOT NULL CHECK (rating IN ('up', 'down')),
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, user_id)
);


-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS contracts_user_id_idx    ON contracts (user_id);
CREATE INDEX IF NOT EXISTS contracts_created_at_idx ON contracts (created_at DESC);

CREATE INDEX IF NOT EXISTS key_terms_contract_id_idx ON key_terms (contract_id);

CREATE INDEX IF NOT EXISTS chat_sessions_contract_id_idx ON chat_sessions (contract_id);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx  ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx  ON chat_messages (created_at ASC);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE contracts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_terms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback  ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- contracts policies
-- -----------------------------------------------------------------------------
CREATE POLICY "contracts_select" ON contracts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "contracts_insert" ON contracts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contracts_update" ON contracts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "contracts_delete" ON contracts
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- key_terms policies
-- -----------------------------------------------------------------------------
CREATE POLICY "key_terms_select" ON key_terms
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "key_terms_insert" ON key_terms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "key_terms_update" ON key_terms
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "key_terms_delete" ON key_terms
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- chat_sessions policies
-- -----------------------------------------------------------------------------
CREATE POLICY "chat_sessions_select" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chat_sessions_insert" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- chat_messages policies
-- Access is gated through session ownership (no direct user_id column).
-- -----------------------------------------------------------------------------
CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- user_feedback policies
-- -----------------------------------------------------------------------------
CREATE POLICY "user_feedback_select" ON user_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_feedback_insert" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_feedback_update" ON user_feedback
  FOR UPDATE USING (auth.uid() = user_id);


-- =============================================================================
-- SUPABASE STORAGE
-- =============================================================================

-- Create the private contracts bucket (skips if it already exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- INSERT: user can upload only to their own folder
--   Path pattern: contracts/{user_id}/{contract_id}/{filename}.pdf
CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- SELECT: user can generate signed URLs only for their own files
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: user can delete only their own files
CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
