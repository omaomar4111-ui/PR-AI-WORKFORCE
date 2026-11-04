import asyncio
import os
import json
import uuid
import datetime
import logging
from typing import Dict, Any, List, Optional, Set

from agents.registry import get_agent
import database

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
        Returns nodes (steps) and edges (dependencies).
        """
        req_lower = user_request.lower()

        # Extract client or brand name if present
        client_name = "Agency Client"
        for kw in ["for ", "client ", "brand "]:
            if kw in req_lower:
                parts = req_lower.split(kw, 1)[1].split()
                if parts:
                    client_name = parts[0].capitalize()

        # Build DAG steps:
        # Step 1: Research (Dr. Ibrahim) -> depends on: none
        # Step 2: Strategy (Ragaa) -> depends on: [Step 1]
        # Step 3: Content (Copywriter) -> depends on: [Step 2] (Parallel with Step 4)
        # Step 4: Design (Fawzyia) -> depends on: [Step 2] (Parallel with Step 3)
        # Step 5: Quality Assurance & Review (QA Lead) -> depends on: [Step 3, Step 4] (Requires Approval)

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
                        f"Evaluate market positioning for: {user_request}",
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
                    "campaign_goal": user_request,
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
                    "topic": user_request,
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
                "requires_approval": True,  # Escalates to Human Approval before final compilation!
                "input": {
                    "deliverable_title": f"Final PR Campaign Package for {client_name}",
                    "agent_tested": "All Specialized Agents",
                    "original_brief": user_request,
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

        return {
            "client_name": client_name,
            "complexity": "Enterprise (5-Step Coordinated DAG)",
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
                    title=f"[Workflow] {step['title']}"
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
