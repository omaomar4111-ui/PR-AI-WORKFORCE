-- ====================================================================
-- PR AI WORKFORCE - Migration 006: Persistent Memory & Deliverables v2
-- ====================================================================

-- 1. Enable pgvector extension for dense embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Memories table (multi-level context: org, client, project, agent)
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('organization', 'client', 'project', 'agent')),
    reference_id VARCHAR(64) NOT NULL, -- client_id, project_id, or agent_id
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Memory Embeddings table (1536-dimensional vectors for cosine similarity)
CREATE TABLE IF NOT EXISTS memory_embeddings (
    memory_id UUID PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
    embedding vector(1536) NOT NULL
);

-- 4. Extend deliverables table for versioning
ALTER TABLE deliverables 
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS parent_deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL;

-- 5. Indexes for fast lookup & vector cosine similarity search
CREATE INDEX IF NOT EXISTS idx_memories_org_type_ref ON memories(org_id, type, reference_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverables_parent ON deliverables(parent_deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_version ON deliverables(version);

-- Vector index for cosine distance (<=>)
CREATE INDEX IF NOT EXISTS idx_memory_embeddings_cosine 
    ON memory_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 6. Row Level Security (RLS)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY memories_org_isolation ON memories
    FOR ALL
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY memory_embeddings_org_isolation ON memory_embeddings
    FOR ALL
    USING (
        memory_id IN (
            SELECT id FROM memories 
            WHERE org_id = current_setting('app.current_org_id', true)::uuid
        )
    );
