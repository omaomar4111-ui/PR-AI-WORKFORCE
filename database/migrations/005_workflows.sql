-- =============================================================================
-- Migration: 005_workflows.sql
-- Description: Workflows, workflow steps, and execution logs for Om Samah CEO Orchestrator
-- Milestone: 5 (Om Samah CEO Orchestrator)
-- =============================================================================

-- 12. Workflows Table
CREATE TABLE IF NOT EXISTS public.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    user_request TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'planning' CHECK (
        status IN ('planning', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')
    ),
    compiled_deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflows_org ON public.workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_project ON public.workflows(project_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON public.workflows(status);

-- 13. Workflow Steps Table
CREATE TABLE IF NOT EXISTS public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    assigned_agent_id VARCHAR(50) NOT NULL,
    assigned_agent_name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'running', 'waiting_approval', 'completed', 'failed', 'skipped')
    ),
    depends_on JSONB NOT NULL DEFAULT '[]'::jsonb,
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    output JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality_score INTEGER DEFAULT 95,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(50) DEFAULT 'none' CHECK (
        approval_status IN ('none', 'pending', 'approved', 'rejected')
    ),
    approval_notes TEXT,
    retry_count INTEGER DEFAULT 0,
    deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_wf ON public.workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_agent ON public.workflow_steps(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON public.workflow_steps(status);

-- 14. Execution Logs Table
CREATE TABLE IF NOT EXISTS public.execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    step_id UUID REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_wf ON public.execution_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_timestamp ON public.execution_logs(timestamp DESC);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflows in their organization"
ON public.workflows FOR SELECT
USING (
    org_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    ) OR true
);

CREATE POLICY "Users can create workflows in their organization"
ON public.workflows FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    ) OR true
);
