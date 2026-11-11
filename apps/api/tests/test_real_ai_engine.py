"""
Tests for Phase 6: Real AI Engine & Image Generation (LLM Adapter & Fallback)
Ensures real LLM invocation paths, creative brief compilation,
image generation fallback, and schema validation work reliably.
"""

import pytest
import logging
from agents.llm_adapter import (
    compile_brief_to_prompt,
    generate_image,
    is_design_agent,
    call_llm,
)
from agents.registry import get_agent


def test_compile_brief_to_prompt():
    """Verify that brief attributes are compiled into an enriched natural language prompt."""
    task_input = {
        "brief": "Design a luxury Arabic perfume identity",
        "project_name": "Elite Oud",
        "target_audience": "Affluent youth in the Gulf",
        "tone": "Luxury & Refined",
        "colors": "Navy Blue & Gold",
        "extra_notes": "Include calligraphy details",
    }
    compiled = compile_brief_to_prompt(task_input)

    assert "CORE CREATIVE BRIEF:\nDesign a luxury Arabic perfume identity" in compiled
    assert "PROJECT / CLIENT NAME:\nElite Oud" in compiled
    assert "TARGET AUDIENCE:\nAffluent youth in the Gulf" in compiled
    assert "TONE OF VOICE:\nLuxury & Refined" in compiled
    assert "DESIGN, COLORS & STYLE GUIDELINES:\nNavy Blue & Gold" in compiled
    assert "extra_notes" in compiled


@pytest.mark.anyio
async def test_generate_image_fallback(monkeypatch):
    """Verify that generate_image returns a valid mockup URL when OPENAI_API_KEY is not set."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    image_url = await generate_image("Futuristic royal logo in gold and navy")

    assert image_url is not None
    assert image_url.startswith("https://")
    assert "unsplash.com" in image_url


def test_is_design_agent():
    """Verify classification of visual vs non-visual agents."""
    assert is_design_agent("fawzyia") is True
    assert is_design_agent("brand-identity-designer") is True
    assert is_design_agent("creative-director") is True
    assert is_design_agent("scriptwriter") is False
    assert is_design_agent("crisis-manager") is False
    assert is_design_agent("finance-officer") is False


@pytest.mark.anyio
async def test_call_llm_fallback_with_warning(monkeypatch, caplog):
    """Verify call_llm falls back gracefully and emits a warning when API keys are absent."""
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    schema = {
        "type": "object",
        "required": ["brand_name", "headline"],
        "properties": {
            "brand_name": {"type": "string"},
            "headline": {"type": "string"},
            "quality_score": {"type": "integer"},
        },
    }

    with caplog.at_level(logging.WARNING):
        result = await call_llm(
            system_prompt="You are a brand strategist.",
            task_input={"brief": "Luxury perfume launch", "project_name": "Nukhba"},
            output_schema=schema,
            agent_id="brand-identity-designer",
        )

    assert isinstance(result, dict)
    assert result.get("quality_score", 0) >= 80
    assert any("OPENAI_API_KEY" in record.message for record in caplog.records)


@pytest.mark.anyio
async def test_fawzyia_execution_includes_image_url():
    """Verify executing Fawzyia design agent generates a deliverable with image_url."""
    agent = get_agent("fawzyia")
    assert agent is not None
    user = {"id": "test-user-1", "organization_id": "00000000-0000-0000-0000-000000000001", "role": "owner"}

    brief_input = {
        "brief": "تصميم هوية بصرية فاخرة وشعار ملكي",
        "client_name": "نخبة العود",
        "project_name": "نخبة العود",
        "target_audience": "الخليج العربي",
        "tone": "Luxury",
        "colors": "Gold & Navy",
    }

    result = await agent.execute(task_input=brief_input, user=user)
    assert isinstance(result, dict)
    output = result.get("output", {})
    assert "image_url" in output or "logo_url" in output
    target_url = output.get("image_url") or output.get("logo_url")
    assert target_url.startswith("https://")


@pytest.mark.anyio
async def test_scriptwriter_execution_with_creative_brief():
    """Verify executing scriptwriter with a creative brief input object produces two_column_script."""
    agent = get_agent("scriptwriter")
    assert agent is not None
    user = {"id": "test-user-1", "organization_id": "00000000-0000-0000-0000-000000000001", "role": "owner"}

    brief_input = {
        "brief": "سكريبت إعلاني فيروسي لتطبيق توصيل سريع",
        "client_name": "FastDelivery",
        "project_name": "FastDelivery",
        "target_audience": "شباب الجامعات",
        "tone": "Bold & Viral",
        "campaign_goal": "App Installs",
    }

    result = await agent.execute(task_input=brief_input, user=user)
    assert isinstance(result, dict)
    output = result.get("output", {})
    assert "two_column_script" in output
    assert isinstance(output["two_column_script"], list)
    assert len(output["two_column_script"]) > 0
    first_scene = output["two_column_script"][0]
    assert "visual_cue" in first_scene
    assert "audio_vo" in first_scene
