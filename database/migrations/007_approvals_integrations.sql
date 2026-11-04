-- ====================================================================
-- PR AI WORKFORCE - Migration 007: Human Approvals & Integration Hub
-- ====================================================================

-- 1. Approval Requests Table
CREATE TABLE IF NOT EXISTS public.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
    step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    requested_by_agent_id VARCHAR(50) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'edited')
    ),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Integrations Table
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (
        provider IN (
            'google_drive', 'google_docs', 'gmail', 'google_sheets',
            'meta_ads', 'google_ads', 'instagram', 'image_gen', 'video_gen'
        )
    ),
    status VARCHAR(50) NOT NULL DEFAULT 'disconnected' CHECK (
        status IN ('connected', 'disconnected', 'error', 'requires_api_access')
    ),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    connected_at TIMESTAMPTZ,
    connected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_org_provider UNIQUE (org_id, provider)
);

-- 3. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_wf ON public.approval_requests(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_agent ON public.approval_requests(requested_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_integrations_org_provider ON public.integrations(org_id, provider);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);

-- 4. Row Level Security (RLS)
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_requests_isolation ON public.approval_requests
    FOR ALL
    USING (
        workflow_id IS NULL OR workflow_id IN (
            SELECT id FROM public.workflows 
            WHERE org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

CREATE POLICY integrations_org_isolation ON public.integrations
    FOR ALL
    USING (org_id = current_setting('app.current_org_id', true)::uuid);
