"""
PR AI WORKFORCE - Human-in-the-Loop Approval Service
Enforces strict human governance over sensitive agent actions (send_email, publish_post, start_ad_campaign, etc.)
and synchronizes with Om Samah workflow pausing and resumption.
"""

from typing import Optional, Dict, Any, List
import datetime
import uuid
import database

# Set of sensitive actions that strictly require human authorization
SENSITIVE_ACTIONS = {
    "send_email",
    "publish_post",
    "start_ad_campaign",
    "update_ad_budget",
    "delete_file",
    "execute_external_action",
    "export_to_drive",
}

_APPROVAL_WS_BROADCAST_FN = None


def set_approval_ws_broadcast_fn(fn):
    global _APPROVAL_WS_BROADCAST_FN
    _APPROVAL_WS_BROADCAST_FN = fn


async def notify_approvals_change(event_type: str, request_data: Dict[str, Any]):
    """Broadcasts real-time approval events over WebSockets."""
    if _APPROVAL_WS_BROADCAST_FN:
        try:
            await _APPROVAL_WS_BROADCAST_FN({
                "type": event_type,
                "approval_request": request_data,
                "pending_count": database.get_pending_approvals_count(),
            })
        except Exception:
            pass


class RequiresApproval(Exception):
    """Raised when an agent attempts a sensitive external action without pre-approval."""

    def __init__(self, action_type: str, message: Optional[str] = None, request_id: Optional[str] = None):
        self.action_type = action_type
        self.request_id = request_id
        super().__init__(message or f"Action '{action_type}' requires human sign-off before execution.")


def request_approval(
    workflow_id: Optional[str],
    step_id: Optional[str],
    agent_id: str,
    action_type: str,
    payload: Dict[str, Any],
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Creates an approval request.
    If associated with a workflow step, pauses the step and workflow.
    """
    record = database.create_approval_request({
        "workflow_id": workflow_id,
        "step_id": step_id,
        "task_id": task_id,
        "requested_by_agent_id": agent_id,
        "action_type": action_type,
        "payload": payload,
        "status": "pending",
    })

    # Pause workflow step if linked
    if step_id:
        database.update_workflow_step(step_id, {
            "status": "waiting_approval",
            "approval_status": "pending",
        })
    if workflow_id:
        database.update_workflow(workflow_id, {"status": "waiting_approval"})
        database.log_execution(
            workflow_id=workflow_id,
            step_id=step_id,
            event_type="approval_requested",
            message=f"Agent {agent_id} requested human approval for sensitive action: {action_type}",
            metadata={"request_id": record["id"], "action_type": action_type}
        )

    return record


async def approve(request_id: str, user_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
    """Marks approval request as approved and resumes blocked workflow if applicable."""
    req = database.get_approval_request(request_id)
    if not req:
        raise ValueError(f"Approval request '{request_id}' not found")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    updated = database.update_approval_request(request_id, {
        "status": "approved",
        "reviewed_by": user_id,
        "reviewed_at": now,
        "notes": notes,
    })

    # Resume workflow step if linked
    if req.get("workflow_id") and req.get("step_id"):
        from orchestrator.om_samah import approve_workflow_step
        try:
            await approve_workflow_step(
                workflow_id=req["workflow_id"],
                step_id=req["step_id"],
                approved=True,
                notes=notes,
            )
        except Exception:
            pass

    await notify_approvals_change("approval_approved", updated)
    return updated


async def reject(request_id: str, user_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
    """Marks approval request as rejected and flags step as failed or rejected."""
    req = database.get_approval_request(request_id)
    if not req:
        raise ValueError(f"Approval request '{request_id}' not found")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    updated = database.update_approval_request(request_id, {
        "status": "rejected",
        "reviewed_by": user_id,
        "reviewed_at": now,
        "notes": notes,
    })

    # Update step if linked
    if req.get("step_id"):
        database.update_workflow_step(req["step_id"], {
            "status": "failed",
            "approval_status": "rejected",
            "approval_notes": notes,
            "completed_at": now,
        })
    if req.get("workflow_id"):
        database.update_workflow(req["workflow_id"], {"status": "failed"})
        database.log_execution(
            workflow_id=req["workflow_id"],
            step_id=req.get("step_id"),
            event_type="approval_rejected",
            message=f"Human reviewer rejected action '{req['action_type']}': {notes or 'No notes provided'}",
            metadata={"request_id": request_id}
        )

    await notify_approvals_change("approval_rejected", updated)
    return updated


async def edit_and_approve(
    request_id: str,
    user_id: str,
    modified_payload: Dict[str, Any],
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """Updates payload and approves the action."""
    req = database.get_approval_request(request_id)
    if not req:
        raise ValueError(f"Approval request '{request_id}' not found")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    updated = database.update_approval_request(request_id, {
        "status": "edited",
        "payload": modified_payload,
        "reviewed_by": user_id,
        "reviewed_at": now,
        "notes": notes,
    })

    # Update step input with edited payload and resume
    if req.get("step_id"):
        step = database.get_workflow_step(req["step_id"])
        if step:
            cur_input = dict(step.get("input", {}))
            cur_input.update(modified_payload)
            database.update_workflow_step(req["step_id"], {"input": cur_input})

    if req.get("workflow_id") and req.get("step_id"):
        from orchestrator.om_samah import approve_workflow_step
        try:
            await approve_workflow_step(
                workflow_id=req["workflow_id"],
                step_id=req["step_id"],
                approved=True,
                notes=f"Approved with modifications: {notes or ''}".strip(),
            )
        except Exception:
            pass

    await notify_approvals_change("approval_edited_approved", updated)
    return updated


def list_approval_requests(
    status: Optional[str] = None,
    workflow_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    return database.list_approval_requests(status=status, workflow_id=workflow_id)


def get_approval_request(request_id: str) -> Optional[Dict[str, Any]]:
    return database.get_approval_request(request_id)


def get_pending_approvals_count() -> int:
    return database.get_pending_approvals_count()
