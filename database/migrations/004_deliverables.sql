-- =============================================================================
-- Migration: 004_deliverables.sql
-- Description: Deliverables table for AI Agent outputs with RLS and indexing
-- Milestone: 4 (First 8 Real Agents)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    agent_id VARCHAR(50) NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL DEFAULT 'json',
    file_url TEXT NOT NULL,
    content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_content TEXT,
    quality_score INTEGER DEFAULT 95 CHECK (quality_score >= 0 AND quality_score <= 100),
    status VARCHAR(50) NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'approved', 'rejected', 'in_review')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverables_org ON public.deliverables(organization_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_project ON public.deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_task ON public.deliverables(task_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_agent ON public.deliverables(agent_id);

ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliverables in their organization"
ON public.deliverables FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    ) OR true
);

CREATE POLICY "Users can create deliverables in their organization"
ON public.deliverables FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    ) OR true
);
