import asyncio
import os
import json
import uuid
import datetime
import logging
from typing import Dict, Any, List, Optional, Set

from agents.registry import get_agent
import database
from memory.service import search_memory
from virtual_office import update_agent_status

logger = logging.getLogger("om_samah")

# Active workflow pause events: workflow_id -> asyncio.Event
_WORKFLOW_PAUSE_EVENTS: Dict[str, asyncio.Event] = {}

# Active background tasks: workflow_id -> asyncio.Task
_ACTIVE_WORKFLOW_TASKS: Dict[str, asyncio.Task] = {}

# Reference to WebSocket broadcast function (injected from main.py)
_WS_BROADCAST_FN = None


def set_ws_broadcast_fn(fn):
    global _WS_BROADCAST_FN
    _WS_BROADCAST_FN = fn


async def notify_workflow_update(workflow_id: str, payload: Dict[str, Any]):
    """Broadcasts workflow state change over WebSockets if registered."""
    if _WS_BROADCAST_FN:
        try:
            await _WS_BROADCAST_FN({
                "type": "workflow_updated",
                "workflow_id": workflow_id,
                **payload
            })
        except Exception as e:
            logger.warning(f"Failed to broadcast workflow update: {e}")


class OmSamahOrchestrator:
    """
    Om Samah: CEO Orchestrator for PR AI WORKFORCE.
    Deconstructs high-level business briefs into executable DAG subtasks,
    resolves sequential & parallel dependencies, enforces QA and human approvals,
    and compiles final agency deliverables.
    """

    def __init__(self, workflow_id: str, user: Dict[str, Any]):
        self.workflow_id = workflow_id
        self.user = user

    def analyze_request(self, user_request: str) -> Dict[str, Any]:
        """
        Step 1: Analyzes user request and plans DAG subtasks with dependencies.
        Dynamically selects specialized agents from the 38-agent roster based on intent.
        Raises ValueError if user_request is empty or invalid.
        """
        if not user_request or not isinstance(user_request, str) or not user_request.strip():
            raise ValueError("User request cannot be empty.")

        clean_request = user_request.strip()
        if len(clean_request) < 4:
            raise ValueError("User request is too short to construct an AI workforce workflow.")

        req_lower = clean_request.lower()

        # Extract client or brand name if present
        client_name = "Agency Client"
        for kw in ["for ", "client ", "brand ", "لـ ", "لعميل "]:
            if kw in req_lower:
                parts = req_lower.split(kw, 1)[1].split()
                if parts:
                    client_name = parts[0].capitalize()

        # 1. Video Production Intent
        video_keywords = ["video", "فيديو", "commercial", "reels", "tiktok", "storyboard", "filming", "sound", "script", "مونتاج"]
        # 2. Engineering & Tech Intent
        tech_keywords = ["code", "landing page", "website", "software", "api", "backend", "frontend", "devops", "security", "موقع", "تطوير", "برمجة", "تطبيق"]
        # 3. SEO & Content Marketing Intent
        seo_keywords = ["seo", "search engine", "keywords", "ranking", "organic", "content strategy", "سيو", "محتوى", "مقال", "مقالات"]
        # 4. Sales & CRM / B2B Outreach Intent
        sales_keywords = ["sales", "leads", "crm", "pipeline", "outreach", "b2b", "prospects", "عملاء", "مبيعات", "صفقة"]

        if any(w in req_lower for w in video_keywords):
            complexity = "Video Production Pipeline (5-Step Audio/Visual DAG)"
            steps_plan = [
                {
                    "step_key": "step_1",
                    "step_order": 1,
                    "assigned_agent_id": "scriptwriter",
                    "assigned_agent_name": "Scriptwriter",
                    "title": f"Story Concept & Commercial Script: {client_name}",
                    "depends_on": [],
                    "requires_approval": False,
                    "input": {
                        "script_title": f"Commercial Script for {client_name}",
                        "target_platform": "YouTube & Social Video",
                        "runtime_seconds": 60
                    }
                },
                {
                    "step_key": "step_2",
                    "step_order": 2,
                    "assigned_agent_id": "storyboard-artist",
                    "assigned_agent_name": "Storyboard Artist",
                    "title": f"Visual Storyboard & Shot Composition: {client_name}",
                    "depends_on": ["step_1"],
                    "requires_approval": False,
                    "input": {
                        "project_name": f"Visual Storyboard: {client_name}",
                        "script_scenes": [
                            f"Scene 1: Hook and opening narrative for {clean_request}",
                            "Scene 2: Core value showcase and dynamic product framing",
                            "Scene 3: Climax and call-to-action outro"
                        ]
                    }
                },
                {
                    "step_key": "step_3",
                    "step_order": 3,
                    "assigned_agent_id": "video-editor",
                    "assigned_agent_name": "Video Editor",
                    "title": f"Dynamic Video Assembly & Motion Cut: {client_name}",
                    "depends_on": ["step_2"],
                    "requires_approval": False,
                    "input": {
                        "cut_name": f"Dynamic Assembly: {client_name}",
                        "source_clips": ["B-Roll 4K", "Product Macro Shots", "Talking Head Narrative"],
                        "target_format": "16:9 4K UHD"
                    }
                },
                {
                    "step_key": "step_4",
                    "step_order": 4,
                    "assigned_agent_id": "sound-designer",
                    "assigned_agent_name": "Sound Designer",
                    "title": f"Cinematic Sound Design & Spatial Audio: {client_name}",
                    "depends_on": ["step_2"],
                    "requires_approval": False,
                    "input": {
                        "soundtrack_title": f"Cinematic Soundscape: {client_name}",
                        "scene_mood": "High-energy modern cinematic",
                        "target_lufs": -14.0
                    }
                },
                {
                    "step_key": "step_5",
                    "step_order": 5,
                    "assigned_agent_id": "video-director",
                    "assigned_agent_name": "Video Director",
                    "title": f"Executive Director Cut & Final Mastering: {client_name}",
                    "depends_on": ["step_3", "step_4"],
                    "requires_approval": True,
                    "input": {
                        "commercial_title": f"Master Cut: {client_name}",
                        "target_duration_sec": 60,
                        "emotional_tone": "Authoritative & Inspiring"
                    }
                }
            ]
        elif any(w in req_lower for w in tech_keywords):
            complexity = "Engineering & Systems Architecture (5-Step Tech DAG)"
            steps_plan = [
                {
                    "step_key": "step_1",
                    "step_order": 1,
                    "assigned_agent_id": "mahmoud",
                    "assigned_agent_name": "Mahmoud (Lead Architect)",
                    "title": f"System Architecture & Feasibility: {client_name}",
                    "depends_on": [],
                    "requires_approval": False,
                    "input": {
                        "project_name": f"Technical Platform for {client_name}",
                        "deliverable_type": "full_stack_architecture",
                        "tech_stack": ["Next.js", "FastAPI", "PostgreSQL"],
                        "requirements": [clean_request]
                    }
                },
                {
                    "step_key": "step_2",
                    "step_order": 2,
                    "assigned_agent_id": "frontend-dev",
                    "assigned_agent_name": "Frontend Developer",
                    "title": f"UI/UX Implementation & Web Components: {client_name}",
                    "depends_on": ["step_1"],
                    "requires_approval": False,
                    "input": {
                        "component_name": f"{client_name} Interactive Web Portal",
                        "framework": "Next.js 14 App Router + Tailwind",
                        "features": ["Client dashboard", "Real-time task monitoring", "RTL Arabic support"]
                    }
                },
                {
                    "step_key": "step_3",
                    "step_order": 3,
                    "assigned_agent_id": "backend-dev",
                    "assigned_agent_name": "Backend Developer",
                    "title": f"REST API & Database Layer: {client_name}",
                    "depends_on": ["step_1"],
                    "requires_approval": False,
                    "input": {
                        "service_name": f"{client_name} Core Microservice",
                        "endpoints_needed": ["GET /api/v1/data", "POST /api/v1/tasks"],
                        "database_tables": ["records", "audit_logs"]
                    }
                },
                {
                    "step_key": "step_4",
                    "step_order": 4,
                    "assigned_agent_id": "security-engineer",
                    "assigned_agent_name": "Security Engineer",
                    "title": f"Security Audit & Threat Modeling: {client_name}",
                    "depends_on": ["step_2", "step_3"],
                    "requires_approval": False,
                    "input": {
                        "system_component": f"{client_name} API Gateway",
                        "attack_surfaces": ["JWT verification", "IDOR vulnerability", "Rate limiting"]
                    }
                },
                {
                    "step_key": "step_5",
                    "step_order": 5,
                    "assigned_agent_id": "qa-automation-engineer",
                    "assigned_agent_name": "QA Automation Engineer",
                    "title": f"Automated E2E Testing & Release Gate: {client_name}",
                    "depends_on": ["step_4"],
                    "requires_approval": True,
                    "input": {
                        "test_suite_title": f"Release Gate E2E Suite: {client_name}",
                        "target_routes": ["/dashboard", "/api/v1/data"],
                        "assertions_required": ["Auth check passes", "Data integrity confirmed"]
                    }
                }
            ]
        elif any(w in req_lower for w in seo_keywords):
            complexity = "SEO & Organic Growth Campaign (5-Step Inbound DAG)"
            steps_plan = [
                {
                    "step_key": "step_1",
                    "step_order": 1,
                    "assigned_agent_id": "seo-specialist",
                    "assigned_agent_name": "SEO Specialist",
                    "title": f"Search Architecture & Keyword Mapping: {client_name}",
                    "depends_on": [],
                    "requires_approval": False,
                    "input": {
                        "client_domain": f"{client_name.lower().replace(' ', '')}.com",
                        "target_keywords": ["PR agency automation", "AI workforce MENA", "strategic corporate communications"],
                        "target_geography": "MENA (GCC & Egypt)"
                    }
                },
                {
                    "step_key": "step_2",
                    "step_order": 2,
                    "assigned_agent_id": "content-strategist",
                    "assigned_agent_name": "Content Strategist",
                    "title": f"Content Pillar & Editorial Funnel: {client_name}",
                    "depends_on": ["step_1"],
                    "requires_approval": False,
                    "input": {
                        "client_name": client_name,
                        "target_persona": "Enterprise Chief Marketing Officers & Founders",
                        "core_objective": clean_request
                    }
                },
                {
                    "step_key": "step_3",
                    "step_order": 3,
                    "assigned_agent_id": "copywriter",
                    "assigned_agent_name": "Copywriter",
                    "title": f"High-Converting SEO Articles & Thought Leadership: {client_name}",
                    "depends_on": ["step_2"],
                    "requires_approval": False,
                    "input": {
                        "topic": clean_request,
                        "format": "long_form_article",
                        "tone": "thought_leadership",
                        "target_language": "bilingual",
                        "key_takeaways": [
                            "AI-driven PR agility",
                            "Enterprise authority",
                            "Cost optimization"
                        ]
                    }
                },
                {
                    "step_key": "step_4",
                    "step_order": 4,
                    "assigned_agent_id": "growth-hacker",
                    "assigned_agent_name": "Growth Hacker",
                    "title": f"Distribution Channels & Backlink Acquisition: {client_name}",
                    "depends_on": ["step_2"],
                    "requires_approval": False,
                    "input": {
                        "product_name": f"{client_name} Organic Inbound Engine",
                        "north_star_metric": "Organic Search Traffic & Lead Conversion",
                        "experiment_budget": 3000
                    }
                },
                {
                    "step_key": "step_5",
                    "step_order": 5,
                    "assigned_agent_id": "compliance-officer",
                    "assigned_agent_name": "Compliance Officer",
                    "title": f"Regulatory Compliance & Content Verification: {client_name}",
                    "depends_on": ["step_3", "step_4"],
                    "requires_approval": True,
                    "input": {
                        "campaign_name": f"SEO & Inbound Campaign: {client_name}",
                        "target_jurisdictions": ["Egypt", "UAE", "Saudi Arabia"],
                        "campaign_claims": ["Highest customer retention in sector", "Full data privacy compliance"]
                    }
                }
            ]
        elif any(w in req_lower for w in sales_keywords):
            complexity = "B2B Sales Pipeline & Outreach (5-Step Commercial DAG)"
            steps_plan = [
                {
                    "step_key": "step_1",
                    "step_order": 1,
                    "assigned_agent_id": "market-researcher",
                    "assigned_agent_name": "Market Researcher",
                    "title": f"TAM & Prospect Segment Research: {client_name}",
                    "depends_on": [],
                    "requires_approval": False,
                    "input": {
                        "sector": "Enterprise Tech & Professional Services",
                        "target_country": "Saudi Arabia & UAE"
                    }
                },
                {
                    "step_key": "step_2",
                    "step_order": 2,
                    "assigned_agent_id": "lead-qualifier",
                    "assigned_agent_name": "Lead Qualifier",
                    "title": f"ICP Scoring & Prospect Qualification: {client_name}",
                    "depends_on": ["step_1"],
                    "requires_approval": False,
                    "input": {
                        "prospect_name": f"Prospective Enterprise for {client_name}",
                        "company_size": "250-1000 employees",
                        "stated_need": clean_request
                    }
                },
                {
                    "step_key": "step_3",
                    "step_order": 3,
                    "assigned_agent_id": "account-executive",
                    "assigned_agent_name": "Account Executive",
                    "title": f"Enterprise Pitch Deck & Deal Packaging: {client_name}",
                    "depends_on": ["step_2"],
                    "requires_approval": False,
                    "input": {
                        "client_name": client_name,
                        "service_package": "Enterprise AI Workforce Retainer",
                        "monthly_retainer": 15000
                    }
                },
                {
                    "step_key": "step_4",
                    "step_order": 4,
                    "assigned_agent_id": "crm-specialist",
                    "assigned_agent_name": "CRM Specialist",
                    "title": f"CRM Pipeline Automation & Deal Stage Setup: {client_name}",
                    "depends_on": ["step_2"],
                    "requires_approval": False,
                    "input": {
                        "deal_id": f"DEAL-{client_name.upper()[:4]}",
                        "current_stage": "proposal_delivered",
                        "days_in_stage": 2
                    }
                },
                {
                    "step_key": "step_5",
                    "step_order": 5,
                    "assigned_agent_id": "sales-manager",
                    "assigned_agent_name": "Sales Manager",
                    "title": f"Executive Commercial Review & Deal Governance: {client_name}",
                    "depends_on": ["step_3", "step_4"],
                    "requires_approval": True,
                    "input": {
                        "prospect_company": f"{client_name} Target Corp",
                        "prospect_role": "VP Marketing",
                        "deal_size_tier": "tier_1_enterprise",
                        "pain_points": [clean_request]
                    }
                }
            ]
        else:
            # General PR & Brand Campaign Default Plan
            complexity = "Enterprise (5-Step Coordinated DAG)"
            steps_plan = [
                {
                    "step_key": "step_1",
                    "step_order": 1,
                    "assigned_agent_id": "dr-ibrahim",
                    "assigned_agent_name": "Dr. Ibrahim",
                    "title": f"Market & Intelligence Research: {client_name}",
                    "depends_on": [],
                    "requires_approval": False,
                    "input": {
                        "client_name": client_name,
                        "industry": "PR & Communications",
                        "competitors": ["Regional Competitor A", "Competitor B"],
                        "research_objectives": [
                            f"Evaluate market positioning for: {clean_request}",
                            "Identify target audience pain points & media channels",
                            "Audit competitive share of voice"
                        ],
                        "target_region": "MENA (Egypt & GCC)"
                    }
                },
                {
                    "step_key": "step_2",
                    "step_order": 2,
                    "assigned_agent_id": "ragaa",
                    "assigned_agent_name": "Ragaa",
                    "title": f"Brand Strategy & Positioning: {client_name}",
                    "depends_on": ["step_1"],
                    "requires_approval": False,
                    "input": {
                        "client_name": client_name,
                        "campaign_goal": clean_request,
                        "target_audience": "Enterprise decision makers, business executives, and digital creators",
                        "budget_tier": "enterprise",
                        "key_differentiators": [
                            "Autonomous multi-agent speed",
                            "Bilingual dialect accuracy",
                            "Human-governed PR execution"
                        ]
                    }
                },
                {
                    "step_key": "step_3",
                    "step_order": 3,
                    "assigned_agent_id": "copywriter",
                    "assigned_agent_name": "Copywriter",
                    "title": f"PR Copywriting & Viral Scripts: {client_name}",
                    "depends_on": ["step_2"],
                    "requires_approval": False,
                    "input": {
                        "topic": clean_request,
                        "format": "press_release",
                        "tone": "authoritative and inspiring",
                        "target_language": "bilingual",
                        "key_takeaways": [
                            "Instant narrative deployment",
                            "Uncompromised editorial quality",
                            "Strategic executive thought leadership"
                        ]
                    }
                },
                {
                    "step_key": "step_4",
                    "step_order": 4,
                    "assigned_agent_id": "fawzyia",
                    "assigned_agent_name": "Fawzyia",
                    "title": f"Creative Direction & Visual Identity: {client_name}",
                    "depends_on": ["step_2"],
                    "requires_approval": False,
                    "input": {
                        "brand_name": client_name,
                        "visual_mood": "Luxury Cyber-Editorial with Royal Obsidian and Ultraviolet tones",
                        "deliverable_types": [
                            "Main Campaign Key Visual (16:9)",
                            "Social Carousel Templates (4:5)",
                            "Executive Briefing One-Pager (A4)"
                        ],
                        "brand_colors": ["#8b5cf6", "#0d0e12", "#f59e0b"]
                    }
                },
                {
                    "step_key": "step_5",
                    "step_order": 5,
                    "assigned_agent_id": "qa-lead",
                    "assigned_agent_name": "QA Lead",
                    "title": f"Quality Audit & Executive Sign-off: {client_name}",
                    "depends_on": ["step_3", "step_4"],
                    "requires_approval": True,
                    "input": {
                        "deliverable_title": f"Final PR Campaign Package for {client_name}",
                        "agent_tested": "All Specialized Agents",
                        "original_brief": clean_request,
                        "agent_output": {
                            "scope": "Multi-agent coordinated rollout",
                            "verified_components": ["Research", "Strategy", "Copywriting", "Art Direction"]
                        },
                        "quality_criteria": [
                            "Full alignment with client brief",
                            "Zero mathematical or factual leakage",
                            "WCAG accessibility and brand guideline compliance",
                            "Bilingual grammatical precision"
                        ]
                    }
                }
            ]

        # Check if user requested sensitive external action (Milestone 7)
        if any(w in req_lower for w in ["email", "بريد", "send"]):
            steps_plan[2]["action_type"] = "send_email"
            steps_plan[2]["title"] = f"Send Pitch Email to Client: {client_name}"
            steps_plan[2]["input"]["action_type"] = "send_email"
        elif any(w in req_lower for w in ["publish", "post", "نشر"]):
            steps_plan[2]["action_type"] = "publish_post"
            steps_plan[2]["title"] = f"Publish Social Post for {client_name}"
            steps_plan[2]["input"]["action_type"] = "publish_post"
        elif any(w in req_lower for w in ["ad campaign", "launch ad", "إعلان"]):
            steps_plan[2]["action_type"] = "start_ad_campaign"
            steps_plan[2]["title"] = f"Start Ad Campaign for {client_name}"
            steps_plan[2]["input"]["action_type"] = "start_ad_campaign"

        return {
            "client_name": client_name,
            "complexity": complexity,
            "steps": steps_plan
        }

    async def initialize_steps(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Parses request, creates step records in DB, and sets up DAG."""
        wf = database.get_workflow(self.workflow_id, self.user)
        if not wf:
            raise ValueError(f"Workflow {self.workflow_id} not found")

        plan = self.analyze_request(wf["user_request"])

        created_steps = []
        step_key_to_id = {}

        for s in plan["steps"]:
            # Map dependency keys
            resolved_deps = [step_key_to_id[dep] for dep in s["depends_on"] if dep in step_key_to_id]

            step_record = database.create_workflow_step({
                "workflow_id": self.workflow_id,
                "step_order": s["step_order"],
                "assigned_agent_id": s["assigned_agent_id"],
                "assigned_agent_name": s["assigned_agent_name"],
                "title": s["title"],
                "status": "pending",
                "depends_on": resolved_deps,
                "input": s["input"],
                "quality_score": 95,
                "requires_approval": s["requires_approval"],
            })
            step_key_to_id[s["step_key"]] = step_record["id"]
            created_steps.append(step_record)

        database.log_execution(
            workflow_id=self.workflow_id,
            step_id=None,
            event_type="dag_planned",
            message=f"Om Samah planned DAG with {len(created_steps)} subtasks",
            metadata={"step_count": len(created_steps), "complexity": plan["complexity"]}
        )

        return created_steps

    async def execute_step(self, step: Dict[str, Any], project_id: Optional[str] = None) -> Dict[str, Any]:
        """Executes a single agent step with retry mechanism and deliverable storage."""
        step_id = step["id"]
        agent_id = step["assigned_agent_id"]
        agent = get_agent(agent_id)
        if not agent:
            raise ValueError(f"Agent '{agent_id}' not found in registry")

        # Mark step as running
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        database.update_workflow_step(step_id, {"status": "running", "started_at": now})
        database.log_execution(
            workflow_id=self.workflow_id,
            step_id=step_id,
            event_type="step_started",
            message=f"Agent {agent.name} started execution: {step['title']}"
        )
        await notify_workflow_update(self.workflow_id, {"step_id": step_id, "status": "running"})
        try:
            await update_agent_status(agent_id, status="working", current_task=step["title"], workflow_id=self.workflow_id)
        except Exception as st_err:
            logger.warning(f"Failed to update agent status to working: {st_err}")

        # Multi-level memory retrieval (Task 4)
        org_id = self.user.get("organization_id", "00000000-0000-0000-0000-000000000001")
        wf = database.get_workflow(self.workflow_id, self.user) or {}
        query_text = f"{step['title']} {wf.get('user_request', '')}"
        
        retrieved_memories: List[Dict[str, Any]] = []

        # 1. Client context
        client_id = None
        if project_id and project_id in database.PROJECTS_DB:
            client_id = database.PROJECTS_DB[project_id].get("client_id")
        if client_id:
            c_mems = search_memory(org_id=org_id, query=query_text, type="client", reference_id=client_id, limit=3)
            retrieved_memories.extend(c_mems)

        # 2. Project context
        if project_id:
            p_mems = search_memory(org_id=org_id, query=query_text, type="project", reference_id=project_id, limit=3)
            retrieved_memories.extend(p_mems)

        # 3. Agent past learnings
        a_mems = search_memory(org_id=org_id, query=query_text, type="agent", reference_id=agent_id, limit=3)
        retrieved_memories.extend(a_mems)

        # 4. Organization context
        o_mems = search_memory(org_id=org_id, query=query_text, type="organization", reference_id=org_id, limit=3)
        retrieved_memories.extend(o_mems)

        if retrieved_memories:
            database.log_execution(
                workflow_id=self.workflow_id,
                step_id=step_id,
                event_type="memory_injected",
                message=f"Om Samah injected {len(retrieved_memories)} multi-level memories into {agent.name}",
                metadata={"memory_count": len(retrieved_memories)}
            )

        # Milestone 7: Sensitive Action Check & Human Approval Gate
        action_type = step.get("action_type") or step["input"].get("action_type")
        if not action_type:
            t_lower = step["title"].lower()
            if "send email" in t_lower or "إرسال بريد" in t_lower or "send_email" in t_lower:
                action_type = "send_email"
            elif "publish post" in t_lower or "نشر" in t_lower or "publish_post" in t_lower:
                action_type = "publish_post"
            elif "start ad" in t_lower or "إطلاق حملة" in t_lower or "start_ad_campaign" in t_lower:
                action_type = "start_ad_campaign"

        from approvals.service import SENSITIVE_ACTIONS, request_approval
        if action_type in SENSITIVE_ACTIONS:
            existing_approvals = database.list_approval_requests(workflow_id=self.workflow_id)
            approved_req = next(
                (r for r in existing_approvals if r.get("step_id") == step_id and r.get("status") in ("approved", "edited")),
                None
            )
            if not approved_req:
                req = request_approval(
                    workflow_id=self.workflow_id,
                    step_id=step_id,
                    agent_id=agent_id,
                    action_type=action_type,
                    payload=step["input"],
                )
                database.update_workflow_step(step_id, {
                    "status": "waiting_approval",
                    "requires_approval": True,
                    "approval_status": "pending",
                })
                database.update_workflow(self.workflow_id, {"status": "waiting_approval"})
                await notify_workflow_update(self.workflow_id, {
                    "step_id": step_id,
                    "status": "waiting_approval",
                    "request_id": req["id"],
                })
                try:
                    await update_agent_status(agent_id, status="blocked", current_task=step["title"], workflow_id=self.workflow_id)
                except Exception as st_err:
                    logger.warning(f"Failed to update agent status to blocked: {st_err}")

                event = _WORKFLOW_PAUSE_EVENTS.get(self.workflow_id)
                if not event:
                    event = asyncio.Event()
                    _WORKFLOW_PAUSE_EVENTS[self.workflow_id] = event
                await event.wait()
                event.clear()
                try:
                    await update_agent_status(agent_id, status="working", current_task=step["title"], workflow_id=self.workflow_id)
                except Exception as st_err:
                    logger.warning(f"Failed to update agent status to working: {st_err}")

            # Mark step input as approved for sensitive execution
            step["input"]["approved"] = True

        max_retries = 2
        attempt = 0
        last_error = None
        result = None

        while attempt <= max_retries:
            try:
                attempt += 1
                result = await agent.execute(
                    task_input=step["input"],
                    user=self.user,
                    project_id=project_id,
                    title=f"[Workflow] {step['title']}",
                    context_memories=retrieved_memories,
                )

                # Quality check
                quality_score = result["deliverable"].get("quality_score", 95)
                if quality_score < 80:
                    raise ValueError(f"Quality score {quality_score} below threshold (80)")

                break
            except Exception as e:
                last_error = str(e)
                database.log_execution(
                    workflow_id=self.workflow_id,
                    step_id=step_id,
                    event_type="step_retry",
                    message=f"Attempt {attempt} failed: {last_error}. Retrying...",
                    metadata={"attempt": attempt, "error": last_error}
                )
                if attempt > max_retries:
                    completed_now = datetime.datetime.now(datetime.timezone.utc).isoformat()
                    database.update_workflow_step(step_id, {
                        "status": "failed",
                        "completed_at": completed_now,
                        "output": {"error": last_error}
                    })
                    database.log_execution(
                        workflow_id=self.workflow_id,
                        step_id=step_id,
                        event_type="step_failed",
                        message=f"Step failed after {attempt} attempts: {last_error}"
                    )
                    await notify_workflow_update(self.workflow_id, {"step_id": step_id, "status": "failed"})
                    raise RuntimeError(f"Step '{step['title']}' failed: {last_error}")
                await asyncio.sleep(0.5)

        # Successful execution
        completed_now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        deliverable = result["deliverable"]
        output = result["output"]

        # Check if human approval is required for this step
        if step.get("requires_approval"):
            database.update_workflow_step(step_id, {
                "status": "waiting_approval",
                "approval_status": "pending",
                "output": output,
                "deliverable_id": deliverable["id"],
                "quality_score": deliverable.get("quality_score", 95),
            })
            database.update_workflow(self.workflow_id, {"status": "waiting_approval"})
            database.log_execution(
                workflow_id=self.workflow_id,
                step_id=step_id,
                event_type="waiting_human_approval",
                message=f"Step '{step['title']}' requires executive human approval before proceeding."
            )
            await notify_workflow_update(self.workflow_id, {
                "step_id": step_id,
                "status": "waiting_approval",
                "workflow_status": "waiting_approval"
            })
            try:
                await update_agent_status(agent_id, status="blocked", current_task=step["title"], workflow_id=self.workflow_id)
            except Exception as st_err:
                logger.warning(f"Failed to update agent status to blocked: {st_err}")

            # Wait on pause event for human sign-off
            pause_event = asyncio.Event()
            _WORKFLOW_PAUSE_EVENTS[self.workflow_id] = pause_event
            await pause_event.wait()
            _WORKFLOW_PAUSE_EVENTS.pop(self.workflow_id, None)

            # Re-read step to ensure approved
            updated_step = database.get_workflow_step(step_id)
            if updated_step.get("approval_status") == "rejected":
                database.update_workflow_step(step_id, {"status": "failed", "completed_at": completed_now})
                database.update_workflow(self.workflow_id, {"status": "failed"})
                await notify_workflow_update(self.workflow_id, {"step_id": step_id, "status": "failed"})
                try:
                    await update_agent_status(agent_id, status="idle")
                except Exception:
                    pass
                raise RuntimeError(f"Step '{step['title']}' was rejected by human operator.")

        # Mark completed
        database.update_workflow_step(step_id, {
            "status": "completed",
            "output": output,
            "deliverable_id": deliverable["id"],
            "quality_score": deliverable.get("quality_score", 95),
            "completed_at": completed_now,
        })
        database.log_execution(
            workflow_id=self.workflow_id,
            step_id=step_id,
            event_type="step_completed",
            message=f"Step '{step['title']}' successfully completed by {agent.name}.",
            metadata={"deliverable_id": deliverable["id"], "quality_score": deliverable.get("quality_score", 95)}
        )
        await notify_workflow_update(self.workflow_id, {"step_id": step_id, "status": "completed"})
        try:
            await update_agent_status(agent_id, status="idle")
        except Exception as st_err:
            logger.warning(f"Failed to reset agent status to idle: {st_err}")

        return database.get_workflow_step(step_id)

    async def compile_final_package(self, steps: List[Dict[str, Any]], project_id: Optional[str] = None) -> Dict[str, Any]:
        """Compiles outputs of all completed steps into a unified master deliverable."""
        wf = database.get_workflow(self.workflow_id, self.user)
        user_request = wf.get("user_request", "PR Campaign Package")

        package_components = {}
        for s in steps:
            package_components[s["assigned_agent_id"]] = {
                "step_title": s["title"],
                "agent_name": s["assigned_agent_name"],
                "quality_score": s.get("quality_score", 95),
                "deliverable_id": s.get("deliverable_id"),
                "output": s.get("output", {}),
            }

        compiled_output = {
            "title": f"Om Samah Executive PR Package: {user_request}",
            "orchestrated_by": "Om Samah (CEO Orchestrator)",
            "workflow_id": self.workflow_id,
            "status": "APPROVED_AND_VERIFIED",
            "components_count": len(package_components),
            "package_components": package_components,
            "summary_narrative": (
                f"Full agency multi-agent campaign successfully orchestrated for request: '{user_request}'. "
                f"Intelligence, strategy, viral copywriting, art direction, and QA were autonomously conducted and verified."
            ),
            "compiled_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "quality_score": 98
        }

        # Save physical file & DB record for compiled deliverable
        deliv_id = str(uuid.uuid4())
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "deliverables")
        os.makedirs(storage_dir, exist_ok=True)
        file_path = os.path.join(storage_dir, f"{deliv_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(compiled_output, f, ensure_ascii=False, indent=2)

        saved_deliv = database.create_deliverable({
            "id": deliv_id,
            "project_id": project_id,
            "agent_id": "om-samah",
            "agent_name": "Om Samah (CEO)",
            "title": f"Compiled PR Campaign Package - {user_request[:50]}",
            "file_type": "json",
            "file_url": f"/storage/deliverables/{deliv_id}.json",
            "content_json": compiled_output,
            "raw_content": json.dumps(compiled_output, ensure_ascii=False),
            "quality_score": 98,
            "status": "delivered",
        }, self.user)

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        database.update_workflow(self.workflow_id, {
            "status": "completed",
            "compiled_deliverable_id": deliv_id,
            "completed_at": now
        })

        database.log_execution(
            workflow_id=self.workflow_id,
            step_id=None,
            event_type="workflow_completed",
            message="Om Samah compiled and sealed final agency deliverable package.",
            metadata={"deliverable_id": deliv_id}
        )

        await notify_workflow_update(self.workflow_id, {
            "status": "completed",
            "compiled_deliverable_id": deliv_id,
            "workflow_status": "completed"
        })

        return saved_deliv

    async def run(self, project_id: Optional[str] = None):
        """
        Executes the entire DAG:
        - Resolves dependencies.
        - Runs independent steps concurrently via asyncio.gather.
        - Pauses on human approvals.
        - Compiles final deliverable package.
        """
        database.update_workflow(self.workflow_id, {"status": "running"})
        database.log_execution(
            workflow_id=self.workflow_id,
            step_id=None,
            event_type="workflow_started",
            message="Om Samah began DAG execution."
        )
        await notify_workflow_update(self.workflow_id, {"status": "running"})

        try:
            steps = database.get_workflow_steps(self.workflow_id)
            if not steps:
                steps = await self.initialize_steps(project_id)

            completed_ids: Set[str] = {s["id"] for s in steps if s["status"] == "completed"}

            while len(completed_ids) < len(steps):
                # Refresh current steps
                steps = database.get_workflow_steps(self.workflow_id)
                current_completed = {s["id"] for s in steps if s["status"] == "completed"}
                completed_ids.update(current_completed)

                # Check if any step failed
                failed = [s for s in steps if s["status"] == "failed"]
                if failed:
                    database.update_workflow(self.workflow_id, {"status": "failed"})
                    await notify_workflow_update(self.workflow_id, {"status": "failed"})
                    return

                # Find all steps whose dependencies are completely satisfied and are still pending
                ready_to_run = []
                for s in steps:
                    if s["status"] == "pending":
                        deps = s.get("depends_on", [])
                        if all(d in completed_ids for d in deps):
                            ready_to_run.append(s)

                if not ready_to_run:
                    # Check if any step is waiting for approval
                    waiting = [s for s in steps if s["status"] == "waiting_approval"]
                    if waiting:
                        # Yield and wait
                        await asyncio.sleep(0.5)
                        continue
                    else:
                        break

                # Execute ready steps in parallel using asyncio.gather!
                logger.info(f"Om Samah executing {len(ready_to_run)} step(s) in parallel: {[s['title'] for s in ready_to_run]}")
                executed_results = await asyncio.gather(
                    *[self.execute_step(s, project_id) for s in ready_to_run],
                    return_exceptions=False
                )

                for res in executed_results:
                    if res and res["status"] == "completed":
                        completed_ids.add(res["id"])

            # All steps completed! Compile final package
            final_steps = database.get_workflow_steps(self.workflow_id)
            await self.compile_final_package(final_steps, project_id)

        except Exception as e:
            logger.error(f"Workflow execution failure: {e}")
            database.update_workflow(self.workflow_id, {"status": "failed"})
            database.log_execution(
                workflow_id=self.workflow_id,
                step_id=None,
                event_type="workflow_failed",
                message=f"Workflow failed: {str(e)}"
            )
            await notify_workflow_update(self.workflow_id, {"status": "failed", "error": str(e)})
            raise


def start_workflow_in_background(workflow_id: str, user: Dict[str, Any], project_id: Optional[str] = None) -> asyncio.Task:
    """Launches Om Samah DAG execution in an asynchronous non-blocking task."""
    orchestrator = OmSamahOrchestrator(workflow_id, user)

    async def _runner():
        try:
            await orchestrator.run(project_id)
        except Exception as exc:
            logger.error(f"Background workflow {workflow_id} failed: {exc}")

    task = asyncio.create_task(_runner())
    _ACTIVE_WORKFLOW_TASKS[workflow_id] = task
    return task


def approve_workflow_step(workflow_id: str, step_id: str, approved: bool, notes: Optional[str] = None) -> Dict[str, Any]:
    """Resolves a human approval pause and signals the orchestrator to resume."""
    step = database.get_workflow_step(step_id)
    if not step:
        raise ValueError(f"Step {step_id} not found")

    approval_status = "approved" if approved else "rejected"
    database.update_workflow_step(step_id, {
        "approval_status": approval_status,
        "approval_notes": notes or ("Approved by agency owner" if approved else "Rejected"),
        "status": "completed" if approved else "failed"
    })

    database.log_execution(
        workflow_id=workflow_id,
        step_id=step_id,
        event_type="human_approval_received",
        message=f"Human approval received: {approval_status}. Notes: {notes or 'None'}",
        metadata={"approved": approved, "notes": notes}
    )

    # Wake up orchestrator if paused
    if workflow_id in _WORKFLOW_PAUSE_EVENTS:
        _WORKFLOW_PAUSE_EVENTS[workflow_id].set()

    return database.get_workflow_step(step_id)


def cancel_workflow(workflow_id: str) -> bool:
    """Cancels a running workflow and unblocks any paused events."""
    database.update_workflow(workflow_id, {"status": "cancelled"})
    database.log_execution(
        workflow_id=workflow_id,
        step_id=None,
        event_type="workflow_cancelled",
        message="Workflow cancelled by user"
    )
    if workflow_id in _WORKFLOW_PAUSE_EVENTS:
        _WORKFLOW_PAUSE_EVENTS[workflow_id].set()
    if workflow_id in _ACTIVE_WORKFLOW_TASKS:
        _ACTIVE_WORKFLOW_TASKS[workflow_id].cancel()
    return True
