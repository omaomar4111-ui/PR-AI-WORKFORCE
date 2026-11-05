import datetime
import logging
from typing import Dict, Any, List, Optional, Callable, Awaitable
from agents.registry import list_agents

logger = logging.getLogger("virtual_office")

# In-memory agent status registry: agent_id -> status record
_AGENT_STATUS_STORE: Dict[str, Dict[str, Any]] = {}

# Async broadcast function reference (injected from main.py)
_STATUS_BROADCAST_FN: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None


def set_status_ws_broadcast_fn(fn: Callable[[Dict[str, Any]], Awaitable[None]]):
    """Registers the async WebSocket broadcast function."""
    global _STATUS_BROADCAST_FN
    _STATUS_BROADCAST_FN = fn


def reset_statuses():
    """Resets all agent statuses to 'idle'."""
    global _AGENT_STATUS_STORE
    _AGENT_STATUS_STORE = {}
    init_statuses()


def init_statuses():
    """Initializes status records for all 38 agents in the registry."""
    global _AGENT_STATUS_STORE
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    agents = list_agents()
    for a in agents:
        if a.id not in _AGENT_STATUS_STORE:
            _AGENT_STATUS_STORE[a.id] = {
                "agent_id": a.id,
                "name": a.name,
                "name_ar": a.name_ar,
                "role": a.role,
                "role_ar": a.role_ar,
                "department": a.department,
                "department_ar": a.department_ar,
                "avatar": a.avatar,
                "status": "idle",  # "idle" | "working" | "blocked"
                "current_task": None,
                "workflow_id": None,
                "updated_at": now,
            }


def get_all_statuses() -> List[Dict[str, Any]]:
    """Returns a list of status records for all 38 agents."""
    init_statuses()
    return list(_AGENT_STATUS_STORE.values())


def get_agent_status(agent_id: str) -> Optional[Dict[str, Any]]:
    """Returns the status record for a specific agent."""
    init_statuses()
    return _AGENT_STATUS_STORE.get(agent_id)


async def update_agent_status(
    agent_id: str,
    status: str,
    current_task: Optional[str] = None,
    workflow_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Updates the operational status of an agent and broadcasts the event
    to all active WebSocket clients.
    """
    init_statuses()
    if agent_id not in _AGENT_STATUS_STORE:
        raise ValueError(f"Agent '{agent_id}' not found in registry")

    valid_statuses = {"idle", "working", "blocked"}
    if status not in valid_statuses:
        raise ValueError(f"Invalid status '{status}'. Must be one of {valid_statuses}")

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    record = _AGENT_STATUS_STORE[agent_id]
    record["status"] = status
    record["current_task"] = current_task if status != "idle" else None
    record["workflow_id"] = workflow_id if status != "idle" else None
    record["updated_at"] = now

    # Broadcast event via WebSocket
    if _STATUS_BROADCAST_FN:
        try:
            await _STATUS_BROADCAST_FN({
                "type": "agent_status_updated",
                "agent": record
            })
        except Exception as e:
            logger.warning(f"Failed to broadcast agent status update: {e}")

    return record
