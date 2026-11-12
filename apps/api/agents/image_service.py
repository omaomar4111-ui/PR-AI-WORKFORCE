"""
Image Generation Service using Pollinations.ai (Free, Zero API Key Required).
Provides instant URL generation for visual agents, branding, logos, and creative assets.
"""

import urllib.parse
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def generate_image_free(prompt: str, width: int = 1024, height: int = 1024) -> str:
    """
    Generates a free high-resolution AI image URL via Pollinations.ai.
    Requires no API key, works globally, and returns direct image asset URL.
    """
    if not prompt or not prompt.strip():
        prompt = "modern minimalist professional brand identity logo clean vector aesthetic"

    clean_prompt = " ".join(prompt.strip().split())[:600]
    encoded = urllib.parse.quote(clean_prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true"
    logger.info(f"Generated Pollinations.ai image URL for prompt length {len(clean_prompt)}")
    return url


def construct_visual_prompt(agent_id: str, brief: str, task_input: Optional[Dict[str, Any]] = None) -> str:
    """
    Constructs a detailed, high-aesthetic image generation prompt based on agent archetype and user brief.
    Follows: [Subject] + [Details] + [Setting & Style] + [Lighting & Quality].
    """
    task_input = task_input or {}
    brand_name = (
        task_input.get("brand_name")
        or task_input.get("client_name")
        or task_input.get("project_name")
        or ""
    )
    style = (
        task_input.get("visual_style")
        or task_input.get("colors")
        or "modern minimalist luxury"
    )
    clean_brief = brief.strip() if brief else "innovative high quality design"

    if "brand" in agent_id or "logo" in agent_id:
        brand_ref = f"'{brand_name}'" if brand_name else "modern brand"
        return (
            f"Brand logo and graphic visual identity for {brand_ref}. "
            f"{clean_brief}. Vector icon emblem, balanced clean typography, "
            f"minimalist corporate showcase, {style}, studio soft lighting, 8k resolution, Behance featured"
        )
    elif "social" in agent_id or "marketing" in agent_id:
        return (
            f"High-converting social media visual campaign for {clean_brief}. "
            f"Editorial typography layout, vibrant color palette, {style}, "
            f"commercial advertising photography, crisp clarity, cinematic ambient glow"
        )
    elif "storyboard" in agent_id or "video" in agent_id:
        return (
            f"Cinematic video storyboard frame: {clean_brief}. "
            f"Dramatic widescreen scene, dynamic character action, atmospheric depth, "
            f"anamorphic lens flare, 35mm film still, photorealistic"
        )
    elif "packaging" in agent_id:
        return (
            f"Luxury product packaging design mockup: {clean_brief}. "
            f"Embossed foil detailing, premium box container, elegant presentation, "
            f"{style}, photorealistic product render, soft daylight shadows"
        )
    else:
        return (
            f"Professional visual design asset: {clean_brief}. "
            f"Clean modern layout, {style}, premium studio rendering, 4k ultra detailed"
        )
