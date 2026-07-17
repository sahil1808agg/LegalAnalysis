-- =============================================================================
-- ContractIQ — Security RLS Policies
-- Run this in the Supabase SQL Editor after running the main schema.
-- All statements are idempotent (safe to re-run).
-- =============================================================================


-- =============================================================================
-- RATE LIMITING TABLE
-- Reads/writes use service role only — no user-facing RLS policies.
-- =============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup
  ON rate_limit_events (user_id, action, created_at DESC);

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — service role only via createAdminClient()


-- =============================================================================
-- ENABLE RLS ON ALL TABLES (idempotent)
-- =============================================================================

ALTER TABLE contracts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_terms      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback  ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- contracts policies
-- =============================================================================

DO $$ BEGIN
  CREATE POLICY "contracts_select" ON contracts
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "contracts_insert" ON contracts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "contracts_update" ON contracts
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "contracts_delete" ON contracts
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- key_terms policies
-- =============================================================================

DO $$ BEGIN
  CREATE POLICY "key_terms_select" ON key_terms
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "key_terms_insert" ON key_terms
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "key_terms_update" ON key_terms
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "key_terms_delete" ON key_terms
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- chat_sessions policies
-- =============================================================================

DO $$ BEGIN
  CREATE POLICY "chat_sessions_select" ON chat_sessions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "chat_sessions_insert" ON chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- chat_messages policies (scoped through session ownership)
-- =============================================================================

DO $$ BEGIN
  CREATE POLICY "chat_messages_select" ON chat_messages
    FOR SELECT USING (
      session_id IN (
        SELECT id FROM chat_sessions WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "chat_messages_insert" ON chat_messages
    FOR INSERT WITH CHECK (
      session_id IN (
        SELECT id FROM chat_sessions WHERE user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- user_feedback policies
-- =============================================================================

DO $$ BEGIN
  CREATE POLICY "user_feedback_select" ON user_feedback
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_feedback_insert" ON user_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "user_feedback_update" ON user_feedback
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- STORAGE — private contracts bucket
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$ BEGIN
  CREATE POLICY "storage_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'contracts'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "storage_select" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'contracts'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "storage_delete" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'contracts'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
