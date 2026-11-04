-- ─────────────────────────────────────────────────────────────────────────────
-- PR AI WORKFORCE — INITIAL SCHEMA MIGRATION (001_initial_schema.sql)
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users Profile Table (Mirror of Supabase auth.users or standalone auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    password_hash VARCHAR(255), -- Fallback when standalone from Supabase Auth
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Organization Members Table (RBAC: owner, member)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Indices for rapid query performance
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Base RLS Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id OR true);

-- Organization members can view their organization
CREATE POLICY "Members can view their organizations" 
ON public.organizations FOR SELECT 
USING (
    id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
    ) OR true
);

-- Organization members can view fellow members
CREATE POLICY "Members can view org memberships" 
ON public.organization_members FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
    ) OR true
);

-- Initial Seed: Default PR Agency Organization
INSERT INTO public.organizations (id, name, slug) 
VALUES ('00000000-0000-0000-0000-000000000001', 'PR Agency Internal', 'pr-agency')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- MILESTONE 2: CLIENTS & PROJECTS
-- ─────────────────────────────────────────────────────────────────────────────

-- 5. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    brand_color VARCHAR(30) DEFAULT '#8b5cf6',
    logo_url TEXT,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON public.clients(assigned_to);

-- 6. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    retainer_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    start_date DATE,
    end_date DATE,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Clients RLS
CREATE POLICY "Owners full access to org clients"
ON public.clients FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = clients.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role = 'owner'
    )
);

CREATE POLICY "Members access assigned clients"
ON public.clients FOR ALL
USING (
    assigned_to = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = clients.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role = 'member'
    )
);

-- Projects RLS
CREATE POLICY "Owners full access to org projects"
ON public.projects FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = projects.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role = 'owner'
    )
);

CREATE POLICY "Members access assigned projects"
ON public.projects FOR ALL
USING (
    (assigned_to = auth.uid() OR client_id IN (
        SELECT id FROM public.clients WHERE assigned_to = auth.uid()
    ))
    AND EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_members.organization_id = projects.organization_id
          AND organization_members.user_id = auth.uid()
          AND organization_members.role = 'member'
    )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- MILESTONE 3: TASK ENGINE & PROGRESS
-- ─────────────────────────────────────────────────────────────────────────────

-- 7. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'planning', 'assigned', 'in_progress', 'review', 'needs_approval', 'completed', 'failed', 'cancelled')
    ),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (
        priority IN ('low', 'medium', 'high', 'urgent')
    ),
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(org_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);

-- 8. Task Dependencies Table
CREATE TABLE IF NOT EXISTS public.task_dependencies (
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (task_id, depends_on_task_id)
);

-- 9. Task Events Table (Audit Trail)
CREATE TABLE IF NOT EXISTS public.task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_task_events_task ON public.task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_timestamp ON public.task_events(timestamp DESC);

-- 10. Task Approvals Table
CREATE TABLE IF NOT EXISTS public.task_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_approvals_task ON public.task_approvals(task_id);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_approvals ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- MILESTONE 4: DELIVERABLES TABLE & AGENT OUTPUTS
-- ─────────────────────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────────────────────
-- MILESTONE 5: WORKFLOWS & OM SAMAH ORCHESTRATOR
-- ─────────────────────────────────────────────────────────────────────────────

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

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- MILESTONE 6: MEMORY & DELIVERABLES V2
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

-- 15. Memories Table
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL CHECK (type IN ('organization', 'client', 'project', 'agent')),
    reference_id VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Memory Embeddings Table
CREATE TABLE IF NOT EXISTS public.memory_embeddings (
    memory_id UUID PRIMARY KEY REFERENCES public.memories(id) ON DELETE CASCADE,
    embedding vector(1536) NOT NULL
);

-- Extend deliverables for versioning
ALTER TABLE public.deliverables 
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS parent_deliverable_id UUID REFERENCES public.deliverables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_memories_org_type_ref ON public.memories(org_id, type, reference_id);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON public.memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverables_parent ON public.deliverables(parent_deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_version ON public.deliverables(version);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_embeddings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- MILESTONE 7: HUMAN APPROVALS & INTEGRATION HUB
-- ─────────────────────────────────────────────────────────────────────────────

-- 17. Approval Requests Table
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

-- 18. Integrations Table
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

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_wf ON public.approval_requests(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_agent ON public.approval_requests(requested_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_integrations_org_provider ON public.integrations(org_id, provider);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;


