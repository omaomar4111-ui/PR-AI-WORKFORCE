"""
Unit tests for Phase 7: Marketing Intelligence & Humanization Protocol.
Verifies Anti-AI Slop detection, Human Score rubric, Growth Marketing OS ingestion,
Gemini temperature tuning (0.8/0.9), and elimination of robotic mock text.
"""

import pytest
import os
import json
from unittest.mock import AsyncMock, MagicMock, patch
from agents.evaluator import detect_ai_slop, sanitize_ai_slop, evaluate_output_quality
from knowledge.loader import get_growth_marketing_context, get_agentkit_persona, HUMANIZATION_DIRECTIVE
from agents.registry import get_agent
from agents.llm_adapter import call_gemini, call_llm


def test_detect_ai_slop_english():
    """Verify detection of forbidden English robotic cliches."""
    robotic_text = "In today's fast-paced world, we must delve into this tapestry to unleash our potential and elevate our brand."
    detected = detect_ai_slop(robotic_text)
    assert any("delve" in w for w in detected)
    assert any("unleash" in w for w in detected)
    assert any("tapestry" in w for w in detected)
    assert any("elevate" in w for w in detected)


def test_detect_ai_slop_arabic():
    """Verify detection of forbidden Arabic robotic phrases."""
    robotic_arabic = "في عالمنا المتسارع، من الجدير بالذكر أننا نسعى إلى إطلاق العنان لقدراتنا، وفي الختام نشكركم."
    detected = detect_ai_slop(robotic_arabic)
    assert any("في عالمنا المتسارع" in w for w in detected)
    assert any("إطلاق العنان" in w for w in detected)
    assert any("من الجدير بالذكر" in w for w in detected)
    assert any("في الختام" in w for w in detected)


def test_sanitize_ai_slop():
    """Verify automatic replacement of AI slop with natural phrasing."""
    text = "في عالمنا المتسارع يجب أن نعمل على إطلاق العنان لـ طاقتنا."
    cleaned = sanitize_ai_slop(text)
    assert "في عالمنا المتسارع" not in cleaned
    assert "إطلاق العنان لـ" not in cleaned


def test_calculate_human_score_penalizes_slop():
    """Verify that robotic slop gets a low score and failure flag."""
    slop_deliverable = {
        "headline": "In today's fast-paced world, unleash your growth",
        "body": "We delve deep to elevate and revolutionize your business tapestry.",
        "cta": "Furthermore, in conclusion."
    }
    report = evaluate_output_quality(slop_deliverable)
    assert report["is_slop_free"] is False
    assert len(report["slop_detected"]) >= 3
    assert report["human_score"] < 70
    assert "تحذير" in report["human_grade"]


def test_calculate_human_score_rewards_human_copy():
    """Verify that authentic Arabic direct-response copy scores high on human rubric."""
    human_deliverable = {
        "headline": "مشكلتك مش في الإعلانات. مشكلتك في الـ Offer نفسه.",
        "hook": "حرقت 10 آلاف دولار في إعلانات ممولة عشان انت متعملش الغلطة دي.",
        "body": "العميل مش عايز كلام مكرر. العميل عايز نتيجة واضحة تريحه في 5 دقايق.",
        "cta": "جرّبه دلوقتي على شغلك انت — ابدأ فورًا من غير كارت."
    }
    report = evaluate_output_quality(human_deliverable)
    assert report["is_slop_free"] is True
    assert len(report["slop_detected"]) == 0
    assert report["human_score"] >= 85
    assert "طبيعي ومقنع" in report["human_grade"] or "جيد جداً" in report["human_grade"]


def test_growth_marketing_context_loader():
    """Verify Growth Marketing OS loads bilingual hooks and Arabic CTAs."""
    ctx = get_growth_marketing_context("hook")
    assert "PROVEN HIGH-CONVERTING HOOK FORMULAS" in ctx
    assert "HIGH-CONVERTING MENA CTAs" in ctx
    assert "OBJECTIVE EMPHASIS" in ctx


def test_agentkit_persona_loader():
    """Verify AgentKits Marketing loader retrieves copywriter persona."""
    persona = get_agentkit_persona("copywriter")
    assert len(persona) > 0


@pytest.mark.anyio
async def test_gemini_config_temperature_and_topp(monkeypatch):
    """Verify call_gemini uses temperature=0.8 and top_p=0.9 for creative generation."""
    monkeypatch.setenv("GEMINI_API_KEY", "test-key-phase7")

    captured_config = {}

    def mock_generative_model(model_name, system_instruction, generation_config):
        nonlocal captured_config
        captured_config = generation_config
        mock_m = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = json.dumps({"headline": "Natural Human Copy", "quality_score": 90})
        mock_m.generate_content_async = AsyncMock(return_value=mock_resp)
        return mock_m

    with patch("google.generativeai.GenerativeModel", side_effect=mock_generative_model):
        with patch("google.generativeai.configure"):
            result = await call_gemini(
                prompt="Write a punchy hook",
                system_prompt="You are an elite copywriter.",
                schema={"type": "object", "properties": {"headline": {"type": "string"}}}
            )

    assert captured_config.get("temperature") == 0.8
    assert captured_config.get("top_p") == 0.9
    assert result["headline"] == "Natural Human Copy"


@pytest.mark.anyio
async def test_scriptwriter_execution_humanized_no_mock_artifact(monkeypatch):
    """Verify scriptwriter deliverable produces authentic two-column script without 'Verified deliverable artifact'."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    agent = get_agent("scriptwriter")
    assert agent is not None
    user = {"id": "user-p7", "organization_id": "00000000-0000-0000-0000-000000000001", "role": "owner"}

    brief_input = {
        "brief_text": "سكريبت إعلاني لتطبيق توصيل قهوة مختصة اسمه سُكر",
        "client_name": "قهوة سُكر",
        "marketing_objective": "pas",
    }

    result = await agent.execute(task_input=brief_input, user=user)
    assert isinstance(result, dict)
    output = result.get("output", {})
    raw_str = json.dumps(output, ensure_ascii=False)

    # CRITICAL: Ensure zero occurrences of the robotic mock string
    assert "Verified deliverable artifact" not in raw_str

    # Ensure two_column_script has authentic dialogue
    assert "two_column_script" in output
    assert len(output["two_column_script"]) >= 3
    first_scene = output["two_column_script"][0]
    assert "visual_cue" in first_scene
    assert "audio_vo" in first_scene

    # Check human score
    assert "human_score" in output or "quality_score" in output
