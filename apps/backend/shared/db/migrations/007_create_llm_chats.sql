-- =============================================================================
-- 007_create_llm_chats.sql
-- Stores LLM chat history with vector embeddings for similarity search.
-- Embedding dimension is set by OLLAMA_EMBED_DIMENSIONS (default: 1024 for bge-m3).
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE chat_role AS ENUM ('user', 'assistant');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS llm_chats (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      chat_role   NOT NULL,
  content   TEXT        NOT NULL,
  -- 1024 dimensions = bge-m3; change if switching embedding model
  embedding vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_chats_user_id  ON llm_chats (user_id);
CREATE INDEX IF NOT EXISTS idx_llm_chats_created  ON llm_chats (user_id, created_at DESC);

-- HNSW index for fast approximate nearest-neighbor search on embeddings
CREATE INDEX IF NOT EXISTS idx_llm_chats_embedding
  ON llm_chats USING hnsw (embedding vector_cosine_ops);
