"""
Knowledge Base Ingestion & Loader for Marketing Intelligence (Phase 7).
Ingests tested frameworks, hooks, and CTAs from Growth Marketing OS and AgentKits Marketing.
"""

import os
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = os.path.dirname(__file__)
GROWTH_OS_DIR = os.path.join(KNOWLEDGE_DIR, "growth_marketing_os")
AGENTKITS_DIR = os.path.join(KNOWLEDGE_DIR, "agentkits_marketing")

# Core Humanization Directives & Anti-Slop Dictionary
HUMANIZATION_DIRECTIVE = """
### 🛡️ STRICT HUMANIZATION PROTOCOL & COPY LAWS:
1. ABSOLUTE ROBOTIC BANS (ZERO TOLERANCE):
   - English bans: "Delve", "Tapestry", "In today's fast-paced world", "Unlock", "Unleash", "Elevate", "Testament", "Beacon", "Harness", "Furthermore", "Moreover", "In conclusion", "Game-changer", "Revolutionize", "It's important to note".
   - Arabic bans: "في عالمنا المتسارع", "في الختام", "من الجدير بالذكر", "مما لا شك فيه", "في عصرنا الحالي", "إطلاق العنان", "سواء كنت... أو كنت...", "رحلة استثنائية", "يُعد هذا بمثابة", "في ظل التطورات المتلاحقة".
   Any output containing these words will be penalized by the automated quality auditor.

2. VOICE & PERSPECTIVE:
   - Speak directly to the human reader in 1st person / direct 2nd person (أنت / أنتم / أنا).
   - Write like an elite direct-response marketer speaking to a friend across a coffee table.
   - Confident, punchy, conversational, candid, and emotionally resonant.

3. STRUCTURE & RHYTHM:
   - Short sentences. Max 10-14 words per sentence.
   - Use pattern interrupts (Contrarian, Mistake/Loss, Curiosity Gap, Proof-First).
   - Visual breathing room and tactical pauses.
   - Include real-world street examples and numbers (e.g., "$10K burned", "8 من كل 10", "في 5 دقايق").

4. PROVEN MARKETING FRAMEWORKS:
   - AIDA (Attention -> Interest -> Desire -> Action)
   - PAS (Problem -> Agitate -> Solution)
   - BAB (Before -> After -> Bridge)
   - Use native, high-converting Arabic CTAs (عامية بيزنس راقية) that humans actually say:
     "ابدأ فورًا — التسليم لحظي", "اطلب دلوقتي وادفع عند الاستلام", "الدفع لما الأوردر يوصلك — من غير فيزا", "جرّبه على شغلك انت", "احجز نسختك".
"""


def get_growth_marketing_context(marketing_objective: str = "") -> str:
    """
    Extracts high-leverage hooks and CTAs from Growth Marketing OS swipe files.
    """
    context_parts = []

    # 1. Load Bilingual Hooks
    hook_path = os.path.join(GROWTH_OS_DIR, "swipe-files", "hooks", "bilingual-hook-bank.md")
    if os.path.exists(hook_path):
        try:
            with open(hook_path, "r", encoding="utf-8") as f:
                hooks_raw = f.read()
                # Extract sample bank section
                if "## 📋 The Bank" in hooks_raw:
                    bank_section = hooks_raw.split("## 📋 The Bank", 1)[1][:1500]
                    context_parts.append(f"### 🪝 PROVEN HIGH-CONVERTING HOOK FORMULAS (GROWTH MARKETING OS):\n{bank_section.strip()}")
        except Exception as e:
            logger.warning(f"Failed to read bilingual hooks: {e}")

    # 2. Load Arabic CTA Bank
    cta_path = os.path.join(GROWTH_OS_DIR, "swipe-files", "ctas", "arabic-cta-bank.md")
    if os.path.exists(cta_path):
        try:
            with open(cta_path, "r", encoding="utf-8") as f:
                cta_raw = f.read()
                if "## 📋 The Bank" in cta_raw:
                    bank_section = cta_raw.split("## 📋 The Bank", 1)[1][:1500]
                    context_parts.append(f"### 🎯 HIGH-CONVERTING MENA CTAs (GROWTH MARKETING OS):\n{bank_section.strip()}")
        except Exception as e:
            logger.warning(f"Failed to read Arabic CTA bank: {e}")

    # 3. Add objective-specific guidance
    if marketing_objective:
        obj_lower = marketing_objective.lower()
        if "hook" in obj_lower or "attention" in obj_lower or "جذب" in obj_lower:
            context_parts.append("### OBJECTIVE EMPHASIS:\nFocus aggressively on the first 3 seconds: Use a CONTRARIAN belief-breaker or a LOSS-PREVENTION hook.")
        elif "pas" in obj_lower or "problem" in obj_lower or "ألم" in obj_lower:
            context_parts.append("### OBJECTIVE EMPHASIS:\nUse PAS framework (Problem -> Agitate -> Solution). Twist the knife on the operational headache before introducing the relief.")
        elif "cta" in obj_lower or "deal" in obj_lower or "إغلاق" in obj_lower:
            context_parts.append("### OBJECTIVE EMPHASIS:\nFocus heavily on Risk-Reversal CTA: No card required, payment on delivery, or instant access guarantee.")

    return "\n\n".join(context_parts)


def get_agentkit_persona(agent_id: str) -> str:
    """
    Extracts specialized role persona instructions from AgentKits Marketing.
    """
    mapping = {
        "copywriter": "copywriter.md",
        "scriptwriter": "copywriter.md",
        "growth-hacker": "conversion-optimizer.md",
        "media-buyer": "attraction-specialist.md",
        "seo-specialist": "seo-specialist.md",
        "ragaa": "brand-voice-guardian.md",
        "content-strategist": "planner.md",
        "sales-manager": "sales-enabler.md",
    }

    target_file = mapping.get(agent_id)
    if not target_file:
        return ""

    agent_path = os.path.join(AGENTKITS_DIR, "agents", target_file)
    if not os.path.exists(agent_path):
        return ""

    try:
        with open(agent_path, "r", encoding="utf-8") as f:
            raw = f.read()
            # Extract Reasoning Process or Expertise section
            if "## Reasoning Process" in raw:
                return raw.split("## Reasoning Process", 1)[1][:1200]
            return raw[:1000]
    except Exception as e:
        logger.warning(f"Failed to read agentkit persona for {agent_id}: {e}")
        return ""
