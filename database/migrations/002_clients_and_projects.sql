-- ─────────────────────────────────────────────────────────────────────────────
-- PR AI WORKFORCE — MIGRATION 002: CLIENTS & PROJECTS (002_clients_and_projects.sql)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Clients Table
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

-- Indices for Clients
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON public.clients(assigned_to);

-- 2. Projects Table
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

-- Indices for Projects
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for Clients
-- Owner can view and manage all clients in their organization
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

-- Members can only view/manage clients assigned to them
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

-- 5. RLS Policies for Projects
-- Owner can view and manage all projects in their organization
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

-- Members can only access projects assigned to them or their assigned clients
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
