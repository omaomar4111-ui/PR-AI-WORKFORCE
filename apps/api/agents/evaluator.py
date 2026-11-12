"""
Marketing Intelligence & Quality Evaluator (Anti-AI Slop Rubric).
Implements evaluation metrics inspired by prompt-eval-rubric to audit and score
human authenticity, persuasive impact, hook strength, and robotic cliché penalties.
"""

import re
from typing import Dict, Any, List, Union

AI_SLOP_ENGLISH = [
    r"\bdelve\b",
    r"\btapestry\b",
    r"\bin today'?s fast-paced world\b",
    r"\bunlock\b",
    r"\bunleash\b",
    r"\belevate\b",
    r"\btestament\b",
    r"\bbeacon\b",
    r"\bharness\b",
    r"\bfurthermore\b",
    r"\bmoreover\b",
    r"\bin conclusion\b",
    r"\bgame-changer\b",
    r"\brevolutionize\b",
    r"\bit is worth noting\b",
    r"\bnavigating the landscape\b",
]

AI_SLOP_ARABIC = [
    r"في عالمنا المتسارع",
    r"في الختام",
    r"من الجدير بالذكر",
    r"مما لا شك فيه",
    r"في عصرنا الحالي",
    r"إطلاق العنان",
    r"سواء كنت.*?أو كنت",
    r"رحلة استثنائية",
    r"يُعد هذا بمثابة",
    r"في ظل التطورات المتلاحقة",
    r"يسعدنا أن نعلن",
]


def detect_ai_slop(text: str) -> List[str]:
    """Scans text for robotic AI clichés and slop phrases in both English and Arabic."""
    if not text:
        return []
    
    slop_found = []
    text_lower = text.lower()
    
    for pattern in AI_SLOP_ENGLISH:
        if re.search(pattern, text_lower):
            clean_name = pattern.replace(r"\b", "").replace("'", "")
            slop_found.append(clean_name)
            
    for pattern in AI_SLOP_ARABIC:
        if re.search(pattern, text):
            slop_found.append(pattern)
            
    return list(set(slop_found))


def sanitize_ai_slop(text: str) -> str:
    """Replaces robotic AI clichés with natural, conversational phrasing."""
    if not text:
        return text

    sanitized = text
    # Arabic replacements
    sanitized = re.sub(r"في عالمنا المتسارع", "دلوقتي في السوق", sanitized)
    sanitized = re.sub(r"إطلاق العنان لـ", "تستغل أقصى قوة لـ", sanitized)
    sanitized = re.sub(r"من الجدير بالذكر أن", "السر هنا إن", sanitized)
    sanitized = re.sub(r"مما لا شك فيه أن", "الواضح إن", sanitized)
    sanitized = re.sub(r"في عصرنا الحالي", "النهارده", sanitized)
    sanitized = re.sub(r"في الختام", "الخلاصة", sanitized)

    # English replacements
    sanitized = re.sub(r"\b[Uu]nleash\b", "Maximize", sanitized)
    sanitized = re.sub(r"\b[Uu]nlock\b", "Access", sanitized)
    sanitized = re.sub(r"\b[Ee]levate\b", "Grow", sanitized)
    sanitized = re.sub(r"\b[Dd]elve into\b", "Analyze", sanitized)
    sanitized = re.sub(r"\b[Gg]ame-changer\b", "Major Breakthrough", sanitized)

    return sanitized


def evaluate_output_quality(content: Union[str, Dict[str, Any]], content_type: str = "general") -> Dict[str, Any]:
    """
    Evaluates the quality and human authenticity of an AI deliverable.
    Returns calculated human score (0-100), breakdown rubrics, and slop audit report.
    """
    if isinstance(content, dict):
        text_corpus = " ".join(str(v) for v in content.values() if isinstance(v, (str, int, float, list)))
    else:
        text_corpus = str(content)

    slop_found = detect_ai_slop(text_corpus)
    
    # 1. Slop Penalty Rubric (0.0 to 1.0)
    slop_penalty = max(0.0, 1.0 - (len(slop_found) * 0.35))

    # 2. Hook Strength Rubric
    has_contrarian = bool(re.search(r"مشكلتك|غلطة|بطّل|stop|instead of|burned|not the", text_corpus, re.IGNORECASE))
    has_question = "?" in text_corpus or "؟" in text_corpus
    has_numbers = bool(re.search(r"\d+", text_corpus))
    hook_score = 0.5 + (0.2 if has_contrarian else 0.0) + (0.15 if has_question else 0.0) + (0.15 if has_numbers else 0.0)
    hook_score = min(1.0, hook_score)

    # 3. Direct Response & CTA Rubric
    has_cta = bool(re.search(r"ابدأ|اطلب|احجز|جرّب|شوف|ابدأ فورًا|ادفع|call|get|claim|start|order|click", text_corpus, re.IGNORECASE))
    cta_score = 0.9 if has_cta else 0.6

    # 4. Sentence Pacing & Conversational Style
    sentences = re.split(r"[.!?؟\n]+", text_corpus)
    non_empty = [s.strip() for s in sentences if len(s.strip().split()) > 0]
    avg_words = sum(len(s.split()) for s in non_empty) / max(1, len(non_empty))
    pacing_score = 1.0 if avg_words <= 16 else max(0.5, 1.0 - ((avg_words - 16) * 0.03))

    # Overall Human Score calculation (82 - 96 typical range for high-quality human copy)
    raw_score = (
        (slop_penalty * 0.40) +
        (hook_score * 0.25) +
        (cta_score * 0.20) +
        (pacing_score * 0.15)
    ) * 100.0

    final_human_score = max(50, min(97, int(raw_score)))

    if slop_found:
        human_grade = "Needs Polish (تحذير: يحتوي على ألفاظ روبوتية)"
    elif final_human_score >= 88:
        human_grade = "High Human Authenticity (طبيعي ومقنع 100%)"
    elif final_human_score >= 78:
        human_grade = "Good Human Flow (جيد جداً وقريب من البشري)"
    else:
        human_grade = "Average (يحتاج تنقيح النبرة)"

    return {
        "human_score": final_human_score,
        "human_grade": human_grade,
        "slop_detected": slop_found,
        "is_slop_free": len(slop_found) == 0,
        "rubrics": {
            "slop_free_rubric": round(slop_penalty, 2),
            "hook_strength_rubric": round(hook_score, 2),
            "cta_clarity_rubric": round(cta_score, 2),
            "conversational_pacing_rubric": round(pacing_score, 2),
        }
    }
