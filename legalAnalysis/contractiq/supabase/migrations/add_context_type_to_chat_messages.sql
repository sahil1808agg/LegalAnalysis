-- Add context_type to chat_messages for conversation memory layer.
-- Stores which source (CONTRACT / HISTORY / BOTH) each assistant response used.
-- Safe to run on existing tables: new column is nullable, old rows stay untouched.

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS context_type text
    CHECK (context_type IN ('CONTRACT', 'HISTORY', 'BOTH'));

COMMENT ON COLUMN chat_messages.context_type IS
  'Source classification for assistant messages: CONTRACT, HISTORY, or BOTH. NULL for user messages and legacy rows.';
