-- ============================================================
-- ContractIQ — Complete Database Setup
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- ─── Migration blocks (run before CREATE TABLE) ──────────────
ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS contract_text text;
ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS page_count integer;
ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS file_path text;

-- ─── Block 0 — shared trigger function ──────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ─── Block 1 — contracts ────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  contract_type   text        NOT NULL CHECK (contract_type IN ('NDA', 'MSA')),
  contract_text   text        NOT NULL DEFAULT '',
  status          text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  file_path       text,
  error_message   text,
  page_count      integer,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_user_id   ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contracts_select_own ON contracts;
DROP POLICY IF EXISTS contracts_insert_own ON contracts;
DROP POLICY IF EXISTS contracts_update_own ON contracts;
DROP POLICY IF EXISTS contracts_delete_own ON contracts;

CREATE POLICY contracts_select_own ON contracts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY contracts_insert_own ON contracts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY contracts_update_own ON contracts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY contracts_delete_own ON contracts FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS contracts_updated_at ON contracts;
CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Block 2 — key_terms ────────────────────────────────────
CREATE TABLE IF NOT EXISTS key_terms (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id      uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_name        text        NOT NULL,
  value            text        NOT NULL DEFAULT '',
  original_value   text,
  page_number      integer     NOT NULL DEFAULT 0,
  confidence_score float4      NOT NULL DEFAULT 0,
  source_sentence  text,
  is_custom        boolean     NOT NULL DEFAULT false,
  is_edited        boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_key_terms_contract_id ON key_terms(contract_id);
CREATE INDEX IF NOT EXISTS idx_key_terms_user_id     ON key_terms(user_id);

ALTER TABLE key_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS key_terms_select_own ON key_terms;
DROP POLICY IF EXISTS key_terms_insert_own ON key_terms;
DROP POLICY IF EXISTS key_terms_update_own ON key_terms;

CREATE POLICY key_terms_select_own ON key_terms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY key_terms_insert_own ON key_terms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY key_terms_update_own ON key_terms FOR UPDATE USING (auth.uid() = user_id);

-- ─── Block 3 — term_corrections ─────────────────────────────
CREATE TABLE IF NOT EXISTS term_corrections (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key_term_id  uuid        NOT NULL REFERENCES key_terms(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id  uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  old_value    text        NOT NULL,
  new_value    text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_term_corrections_user_id     ON term_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_term_corrections_contract_id ON term_corrections(contract_id);

ALTER TABLE term_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS term_corrections_insert_own ON term_corrections;

-- Users can write their own corrections; reads are service-role only (analytics)
CREATE POLICY term_corrections_insert_own ON term_corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Block 4 — chat_sessions ────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_contract_id ON chat_sessions(contract_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id     ON chat_sessions(user_id);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_sessions_select_own ON chat_sessions;
DROP POLICY IF EXISTS chat_sessions_insert_own ON chat_sessions;
DROP POLICY IF EXISTS chat_sessions_update_own ON chat_sessions;

CREATE POLICY chat_sessions_select_own ON chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY chat_sessions_insert_own ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY chat_sessions_update_own ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Block 5 — chat_messages ────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content       text        NOT NULL,
  page_citation integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_messages_select_own ON chat_messages;
DROP POLICY IF EXISTS chat_messages_insert_own ON chat_messages;

CREATE POLICY chat_messages_select_own ON chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY chat_messages_insert_own ON chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Block 6 — user_feedback ────────────────────────────────
CREATE TABLE IF NOT EXISTS user_feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_id uuid        NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  rating      text        NOT NULL CHECK (rating IN ('up', 'down')),
  comment     text        CHECK (char_length(comment) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, contract_id)
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_contract_id ON user_feedback(contract_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id     ON user_feedback(user_id);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_feedback_insert_own ON user_feedback;
DROP POLICY IF EXISTS user_feedback_select_own ON user_feedback;

CREATE POLICY user_feedback_insert_own ON user_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_feedback_select_own ON user_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Block 7 — Supabase Storage bucket ──────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contracts', 'contracts', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ─── Block 8 — Storage RLS policies ─────────────────────────
DROP POLICY IF EXISTS "storage_insert_own_contracts" ON storage.objects;
DROP POLICY IF EXISTS "storage_select_own_contracts" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete_own_contracts" ON storage.objects;

CREATE POLICY "storage_insert_own_contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_select_own_contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "storage_delete_own_contracts"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
