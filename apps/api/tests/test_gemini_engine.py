"""
Unit tests for Gemini 1.5 Flash text engine and Pollinations.ai image generator.
Verifies real API invocation paths, regex JSON extraction, schema compliance, and offline fallbacks.
"""

import pytest
import os
import json
from unittest.mock import AsyncMock, MagicMock, patch
from agents.image_service import generate_image_free, construct_visual_prompt
from agents.llm_adapter import (
    call_gemini,
    extract_json_from_gemini,
    compile_brief_to_prompt,
    call_llm,
)


def test_generate_image_free_url_formatting():
    """Verify Pollinations.ai URL is generated properly with safe encoding and parameters."""
    prompt = "Modern minimal luxury Arabic coffee logo, warm colors, vector badge"
    url = generate_image_free(prompt, width=1024, height=1024)

    assert url.startswith("https://image.pollinations.ai/prompt/")
    assert "width=1024" in url
    assert "height=1024" in url
    assert "nologo=true" in url
    assert " " not in url.split("?")[0]  # Check URL encoding


def test_construct_visual_prompt():
    """Verify construct_visual_prompt crafts high-aesthetic prompts according to archetype."""
    prompt = construct_visual_prompt(
        agent_id="brand-identity-designer",
        brief="Specialty coffee shop named Sukkar",
        task_input={"brand_name": "Sukkar Coffee", "colors": "Warm amber and cream"},
    )
    assert "Sukkar" in prompt
    assert "logo" in prompt.lower()
    assert "lighting" in prompt.lower()


def test_extract_json_from_gemini_clean():
    """Verify extraction of plain JSON string."""
    raw = '{"status": "success", "score": 98}'
    result = extract_json_from_gemini(raw)
    assert result == {"status": "success", "score": 98}


def test_extract_json_from_gemini_markdown_code_block():
    """Verify extraction of JSON wrapped inside markdown code blocks."""
    raw = """Here is your requested deliverable:
```json
{
  "campaign_headline": "Future of AI",
  "quality_score": 99
}
```
Hope this meets your criteria!"""
    result = extract_json_from_gemini(raw)
    assert result["campaign_headline"] == "Future of AI"
    assert result["quality_score"] == 99


def test_extract_json_from_gemini_raw_regex_fallback():
    """Verify extraction when model includes messy commentary without code blocks."""
    raw = 'Leading thoughts... { "summary": "Strategic Plan", "approved": true } trailing notes...'
    result = extract_json_from_gemini(raw)
    assert result["summary"] == "Strategic Plan"
    assert result["approved"] is True


@pytest.mark.anyio
async def test_call_gemini_with_mocked_api(monkeypatch):
    """Verify call_gemini correctly configures GenerativeModel and returns structured JSON when key is set."""
    monkeypatch.setenv("GEMINI_API_KEY", "mock-gemini-key-test-12345")

    mock_response = MagicMock()
    mock_response.text = json.dumps({
        "headline": "Revolutionary AI Workforce",
        "key_message": "Automate agency deliverables effortlessly",
        "quality_score": 97
    })

    mock_model = MagicMock()
    mock_model.generate_content_async = AsyncMock(return_value=mock_response)

    with patch("google.generativeai.GenerativeModel", return_value=mock_model):
        with patch("google.generativeai.configure") as mock_configure:
            result = await call_gemini(
                prompt="Write headline for AI launch",
                system_prompt="You are a senior creative copywriter.",
                schema={"type": "object", "properties": {"headline": {"type": "string"}}},
            )

    mock_configure.assert_called_once_with(api_key="mock-gemini-key-test-12345")
    assert result["headline"] == "Revolutionary AI Workforce"
    assert result["quality_score"] == 97


@pytest.mark.anyio
async def test_call_gemini_fallback_when_key_absent(monkeypatch):
    """Verify call_gemini falls back gracefully without raising an exception when GEMINI_API_KEY is not set."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = await call_gemini(
        prompt="Develop launch strategy",
        system_prompt="You are an executive strategist.",
        schema={"type": "object", "properties": {"summary": {"type": "string"}}},
    )

    assert isinstance(result, dict)
    assert len(result) > 0


@pytest.mark.anyio
async def test_call_llm_visual_agent_generates_pollinations_image(monkeypatch):
    """Verify visual design agents automatically include Pollinations image_url in output."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    result = await call_llm(
        agent_id="brand-identity-designer",
        system_prompt="You are a brand identity designer.",
        task_input={"brief_text": "شعار لمقهى قهوة مختصة اسمه سُكر، ألوان دافئة"},
        output_schema={"type": "object", "properties": {"brand_name": {"type": "string"}}},
    )

    assert "image_url" in result
    assert result["image_url"].startswith("https://image.pollinations.ai/prompt/")
    assert "nologo=true" in result["image_url"]
