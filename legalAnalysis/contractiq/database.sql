-- =============================================================================
-- ContractIQ — Production Database Schema
-- =============================================================================
-- Paste this entire file into the Supabase SQL Editor and run.
-- Safe to re-run: all statements use IF NOT EXISTS or ON CONFLICT DO NOTHING.
-- Policies use DROP IF EXISTS before CREATE to allow idempotent re-runs.
--
-- Execution order:
--   1. Extensions
--   2. Tables
--   3. Indexes
--   4. Row Level Security — enable + policies
--   5. Storage — bucket + policies
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

-- pgcrypto provides gen_random_uuid() on older Postgres versions.
-- On Supabase (Postgres 15+) this is already available; the statement is a no-op.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- contracts
-- Master record for each uploaded contract.
-- Stores the full extracted text so the AI pipeline never re-downloads the PDF.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  type             text        NOT NULL CHECK (type IN ('NDA', 'MSA')),
  contract_text    text        NOT NULL DEFAULT '',
  file_path        text,                         -- null when Storage upload failed
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  page_count       int         NOT NULL DEFAULT 0,
  token_count      int,                          -- estimated after pdf-parse; null until set
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  contracts               IS 'One row per uploaded PDF contract.';
COMMENT ON COLUMN contracts.contract_text IS 'Full extracted text with [PAGE N] markers inserted by pdf-parse.';
COMMENT ON COLUMN contracts.file_path     IS 'Supabase Storage path: {user_id}/{contract_id}/{filename}.pdf. Null if Storage upload failed.';
COMMENT ON COLUMN contracts.token_count   IS 'Approximate token count (text.length / 4). Used to enforce the 15,000-token limit.';
COMMENT ON COLUMN contracts.last_accessed_at IS 'Updated on every /results page load. Drives the 90-day data-retention policy.';


-- -----------------------------------------------------------------------------
-- key_terms
-- One row per extracted (or user-defined) key term for a contract.
-- user_id is denormalised here to simplify RLS without a JOIN.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS key_terms (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id       uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_name         text        NOT NULL,
  value             text        NOT NULL,
  page_number       int         NOT NULL CHECK (page_number >= 1),
  confidence_score  float       NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_sentence   text        NOT NULL,
  is_custom         boolean     NOT NULL DEFAULT false,
  original_ai_value text,                        -- set on first user edit; never overwritten again
  is_edited         boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  key_terms                    IS 'Extracted key terms — one row per term per contract.';
COMMENT ON COLUMN key_terms.is_custom          IS 'True for terms the user added before processing (max 5).';
COMMENT ON COLUMN key_terms.original_ai_value  IS 'Stores the AI-extracted value when a user edits a term. Set once; never overwritten by subsequent edits.';
COMMENT ON COLUMN key_terms.is_edited          IS 'True after the user saves an inline correction.';


-- -----------------------------------------------------------------------------
-- chat_sessions
-- Groups all chat messages for a single contract + user pair.
-- The UNIQUE constraint enforces one session per contract per user.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, user_id)
);

COMMENT ON TABLE chat_sessions IS 'One chat session per contract per user. Created automatically on the first chat message.';


-- -----------------------------------------------------------------------------
-- chat_messages
-- Individual messages (user or assistant) within a chat session.
-- RLS is enforced via a JOIN to chat_sessions (no direct user_id column).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role         text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content      text        NOT NULL,
  context_type text        CHECK (context_type IN ('CONTRACT', 'HISTORY', 'BOTH')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  chat_messages              IS 'Individual messages in a contract chat session, ordered by created_at ASC.';
COMMENT ON COLUMN chat_messages.role         IS '"user" for human messages; "assistant" for GPT-4o responses.';
COMMENT ON COLUMN chat_messages.content      IS 'Full message text. Assistant responses always contain at least one [Page X] citation.';
COMMENT ON COLUMN chat_messages.context_type IS 'Source classification for assistant messages: CONTRACT, HISTORY, or BOTH. NULL for user messages and legacy rows.';


-- -----------------------------------------------------------------------------
-- user_feedback
-- Thumbs-up / thumbs-down feedback per contract review, with an optional comment.
-- The UNIQUE constraint enforces one submission per contract per user (409 on duplicate).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      text        NOT NULL CHECK (rating IN ('up', 'down')),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, user_id)
);

COMMENT ON TABLE  user_feedback         IS 'One feedback record per contract per user. Duplicate attempts receive a 409.';
COMMENT ON COLUMN user_feedback.rating  IS '"up" = helpful; "down" = not helpful.';
COMMENT ON COLUMN user_feedback.comment IS 'Optional free-text comment submitted alongside the rating.';


-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- contracts: filtered by user_id on every dashboard + results query
CREATE INDEX IF NOT EXISTS contracts_user_id_idx    ON contracts (user_id);
-- contracts: dashboard default sort is date_desc
CREATE INDEX IF NOT EXISTS contracts_created_at_idx ON contracts (created_at DESC);
-- contracts: results page polled by status during processing
CREATE INDEX IF NOT EXISTS contracts_status_idx     ON contracts (status);

-- key_terms: fetched by contract_id on every results page load
CREATE INDEX IF NOT EXISTS key_terms_contract_id_idx ON key_terms (contract_id);
-- key_terms: order custom terms after standard terms in the panel
CREATE INDEX IF NOT EXISTS key_terms_is_custom_idx   ON key_terms (contract_id, is_custom);

-- chat_sessions: looked up by contract_id + user_id on every chat request
CREATE INDEX IF NOT EXISTS chat_sessions_contract_id_idx ON chat_sessions (contract_id);

-- chat_messages: history loaded in ascending created_at order
CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (created_at ASC);

-- user_feedback: checked for duplicates on every feedback submission
CREATE INDEX IF NOT EXISTS user_feedback_contract_id_idx ON user_feedback (contract_id);


-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE contracts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_terms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;


-- -----------------------------------------------------------------------------
-- contracts policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "contracts_select" ON contracts;
CREATE POLICY "contracts_select" ON contracts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "contracts_insert" ON contracts;
CREATE POLICY "contracts_insert" ON contracts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "contracts_update" ON contracts;
CREATE POLICY "contracts_update" ON contracts
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "contracts_delete" ON contracts;
CREATE POLICY "contracts_delete" ON contracts
  FOR DELETE
  USING (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- key_terms policies
-- user_id is denormalised on key_terms so RLS needs no JOIN.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "key_terms_select" ON key_terms;
CREATE POLICY "key_terms_select" ON key_terms
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "key_terms_insert" ON key_terms;
CREATE POLICY "key_terms_insert" ON key_terms
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "key_terms_update" ON key_terms;
CREATE POLICY "key_terms_update" ON key_terms
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "key_terms_delete" ON key_terms;
CREATE POLICY "key_terms_delete" ON key_terms
  FOR DELETE
  USING (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- chat_sessions policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "chat_sessions_select" ON chat_sessions;
CREATE POLICY "chat_sessions_select" ON chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_sessions_insert" ON chat_sessions;
CREATE POLICY "chat_sessions_insert" ON chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_sessions_update" ON chat_sessions;
CREATE POLICY "chat_sessions_update" ON chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_sessions_delete" ON chat_sessions;
CREATE POLICY "chat_sessions_delete" ON chat_sessions
  FOR DELETE
  USING (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- chat_messages policies
-- chat_messages has no direct user_id column; access is gated through
-- session ownership. The sub-select is safe because chat_sessions has RLS too.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
CREATE POLICY "chat_messages_select" ON chat_messages
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
CREATE POLICY "chat_messages_insert" ON chat_messages
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_messages_delete" ON chat_messages;
CREATE POLICY "chat_messages_delete" ON chat_messages
  FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- user_feedback policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_feedback_select" ON user_feedback;
CREATE POLICY "user_feedback_select" ON user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_feedback_insert" ON user_feedback;
CREATE POLICY "user_feedback_insert" ON user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_feedback_update" ON user_feedback;
CREATE POLICY "user_feedback_update" ON user_feedback
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_feedback_delete" ON user_feedback;
CREATE POLICY "user_feedback_delete" ON user_feedback
  FOR DELETE
  USING (auth.uid() = user_id);


-- =============================================================================
-- 5. STORAGE
-- =============================================================================

-- Create the private 'contracts' bucket.
-- public = false: all access requires a signed URL generated server-side.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contracts',
  'contracts',
  false,
  10485760,            -- 10 MB in bytes (matches client-side and API validation)
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;


-- Storage object policies
-- Path convention enforced: contracts/{user_id}/{contract_id}/{filename}.pdf
-- (storage.foldername(name))[1] returns the first path segment, which must
-- equal the authenticated user's UUID.

DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
CREATE POLICY "storage_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "storage_select" ON storage.objects;
CREATE POLICY "storage_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "storage_update" ON storage.objects;
CREATE POLICY "storage_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
