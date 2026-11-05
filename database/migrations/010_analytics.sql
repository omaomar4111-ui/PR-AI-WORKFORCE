-- ====================================================================
-- PR AI WORKFORCE - Migration 010: Analytics, Cost Tracking & Security
-- ====================================================================

-- 1. AI Usage Logs Table
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
    model VARCHAR(100) NOT NULL DEFAULT 'gemini-1.5-pro',
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    total_tokens INT NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
    latency_ms INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Quality Scores Table
CREATE TABLE IF NOT EXISTS public.quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE CASCADE,
    agent_id VARCHAR(50) NOT NULL,
    overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    breakdown_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. System Metrics Table
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value FLOAT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Indexes for fast analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_org_created ON public.ai_usage_logs(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_agent ON public.ai_usage_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_project ON public.ai_usage_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_workflow ON public.ai_usage_logs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_deliverable ON public.quality_scores(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_quality_scores_agent ON public.quality_scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at);

-- 5. Row Level Security (RLS)
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_logs_org_isolation ON public.ai_usage_logs
    FOR ALL
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY quality_scores_isolation ON public.quality_scores
    FOR ALL
    USING (
        deliverable_id IS NULL OR deliverable_id IN (
            SELECT id FROM public.deliverables 
            WHERE org_id = current_setting('app.current_org_id', true)::uuid
        )
    );

CREATE POLICY system_metrics_access ON public.system_metrics
    FOR ALL
    USING (true);
