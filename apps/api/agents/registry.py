import os
import json
from typing import Dict, List, Optional
from agents.base import BaseAgent

REGISTRY_PATH = os.path.join(os.path.dirname(__file__), "registry.json")

_AGENTS_CACHE: Dict[str, BaseAgent] = {}


def load_registry() -> Dict[str, BaseAgent]:
    """Loads agent definitions from registry.json and initializes BaseAgent instances."""
    global _AGENTS_CACHE
    if _AGENTS_CACHE:
        return _AGENTS_CACHE

    if not os.path.exists(REGISTRY_PATH):
        raise FileNotFoundError(f"Agent registry file not found at: {REGISTRY_PATH}")

    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    for item in data.get("agents", []):
        agent = BaseAgent(
            id=item["id"],
            name=item["name"],
            department=item["department"],
            system_prompt=item["system_prompt"],
            tools=item.get("tools", []),
            input_schema=item.get("input_schema", {}),
            output_schema=item.get("output_schema", {}),
            quality_criteria=item.get("quality_criteria", []),
            max_tokens=item.get("max_tokens", 4000),
            requires_approval_for=item.get("requires_approval_for", []),
            name_ar=item.get("name_ar"),
            department_ar=item.get("department_ar"),
            role=item.get("role"),
            role_ar=item.get("role_ar"),
            avatar=item.get("avatar"),
            sample_input=item.get("sample_input"),
        )
        _AGENTS_CACHE[agent.id] = agent

    return _AGENTS_CACHE


def get_agent(agent_id: str) -> Optional[BaseAgent]:
    """Retrieves an agent by ID."""
    agents = load_registry()
    return agents.get(agent_id)


def list_agents() -> List[BaseAgent]:
    """Returns list of all active BaseAgent instances."""
    agents = load_registry()
    return list(agents.values())


def get_all_agents_dict() -> List[Dict]:
    """Returns serialized dictionary list for all agents."""
    return [agent.to_dict() for agent in list_agents()]
