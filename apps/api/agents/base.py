import os
import json
import uuid
import datetime
from typing import Dict, Any, List, Optional
import jsonschema

from agents.llm_adapter import call_llm
import database


class BaseAgent:
    """
    BaseAgent: Standard contract and runtime execution harness for PR AI WORKFORCE agents.
    Enforces strict input validation, LLM orchestration, output schema validation,
    and storage of structured deliverables with immutable audit trails.
    """

    def __init__(
        self,
        id: str,
        name: str,
        department: str,
        system_prompt: str,
        tools: List[str],
        input_schema: Dict[str, Any],
        output_schema: Dict[str, Any],
        quality_criteria: Optional[List[str]] = None,
        max_tokens: int = 4000,
        requires_approval_for: Optional[List[str]] = None,
        name_ar: Optional[str] = None,
        department_ar: Optional[str] = None,
        role: Optional[str] = None,
        role_ar: Optional[str] = None,
        avatar: Optional[str] = None,
        sample_input: Optional[Dict[str, Any]] = None,
    ):
        self.id = id
        self.name = name
        self.department = department
        self.system_prompt = system_prompt
        self.tools = tools or []
        self.input_schema = input_schema or {}
        self.output_schema = output_schema or {}
        self.quality_criteria = quality_criteria or []
        self.max_tokens = max_tokens
        self.requires_approval_for = requires_approval_for or []
        self.name_ar = name_ar or name
        self.department_ar = department_ar or department
        self.role = role or "Specialized AI Agent"
        self.role_ar = role_ar or "وكيل ذكاء اصطناعي متخصص"
        self.avatar = avatar or "bot"
        self.sample_input = sample_input or {}

    def validate_input(self, task_input: Dict[str, Any]) -> None:
        """Validates task_input against self.input_schema using jsonschema."""
        if not self.input_schema:
            return
        try:
            jsonschema.validate(instance=task_input, schema=self.input_schema)
        except jsonschema.ValidationError as e:
            raise ValueError(f"Input validation error for agent '{self.name}': {e.message}")

    def validate_output(self, structured_output: Dict[str, Any]) -> None:
        """Validates structured_output against self.output_schema using jsonschema."""
        if not self.output_schema:
            return
        try:
            jsonschema.validate(instance=structured_output, schema=self.output_schema)
        except jsonschema.ValidationError as e:
            raise ValueError(f"Output schema violation for agent '{self.name}': {e.message}")

    async def execute(
        self,
        task_input: Dict[str, Any],
        user: Dict[str, Any],
        project_id: Optional[str] = None,
        task_id: Optional[str] = None,
        title: Optional[str] = None,
        context_memories: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Full Agent Execution Lifecycle:
        1. Validate input against input_schema
        2. Build prompt with system_prompt + retrieved memory + task_input
        3. Call LLM (Gemini / OpenAI / domain adapter)
        4. Validate output against output_schema
        5. Save deliverable to file storage & database
        6. Return deliverable record + structured output
        """
        # Step 1: Input Validation
        self.validate_input(task_input)

        # Step 2: Inject retrieved memories if provided
        active_system_prompt = self.system_prompt
        memories = context_memories or task_input.get("retrieved_context")
        if memories:
            memory_block = "\n\n### RETRIEVED ORGANIZATIONAL & CLIENT MEMORY (GROUND TRUTH):\n"
            for m in memories:
                m_type = m.get("type", "context").upper()
                m_content = m.get("content", "")
                memory_block += f"- [{m_type}] {m_content}\n"
            active_system_prompt += memory_block

        self.last_injected_prompt = active_system_prompt

        # Step 3: Prompt Construction and LLM Execution
        structured_output = await call_llm(
            agent_id=self.id,
            system_prompt=active_system_prompt,
            task_input=task_input,
            output_schema=self.output_schema,
            max_tokens=self.max_tokens,
        )

        # Step 4: Output Validation against Contract
        self.validate_output(structured_output)

        # Step 5: Save Deliverable File & Record
        deliverable_id = str(uuid.uuid4())
        deliverable_title = title or f"{self.name} - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"

        # Write physical file to storage
        storage_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "deliverables")
        os.makedirs(storage_dir, exist_ok=True)
        file_path = os.path.join(storage_dir, f"{deliverable_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(structured_output, f, ensure_ascii=False, indent=2)

        quality_score = structured_output.get("quality_score", 95)

        deliverable_data = {
            "id": deliverable_id,
            "project_id": project_id,
            "task_id": task_id,
            "agent_id": self.id,
            "agent_name": self.name,
            "title": deliverable_title,
            "file_type": "json",
            "file_url": f"/storage/deliverables/{deliverable_id}.json",
            "content_json": structured_output,
            "raw_content": json.dumps(structured_output, ensure_ascii=False),
            "quality_score": quality_score,
            "status": "delivered",
        }

        # Store in database
        saved_deliverable = database.create_deliverable(deliverable_data, user)

        return {
            "deliverable": saved_deliverable,
            "output": structured_output,
            "agent": {
                "id": self.id,
                "name": self.name,
                "department": self.department,
            },
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serializes agent profile for registry API."""
        return {
            "id": self.id,
            "name": self.name,
            "name_ar": self.name_ar,
            "department": self.department,
            "department_ar": self.department_ar,
            "role": self.role,
            "role_ar": self.role_ar,
            "avatar": self.avatar,
            "system_prompt": self.system_prompt,
            "tools": self.tools,
            "input_schema": self.input_schema,
            "output_schema": self.output_schema,
            "quality_criteria": self.quality_criteria,
            "max_tokens": self.max_tokens,
            "requires_approval_for": self.requires_approval_for,
            "sample_input": self.sample_input,
            "status": "ready",
        }
