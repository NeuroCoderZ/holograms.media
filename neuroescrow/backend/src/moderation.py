"""
Content Moderation for Hermes
Blocks inappropriate content, spam, and policy violations
"""
import re
from typing import Dict, Any, List


# Blacklisted patterns (Russian + English)
BLACKLIST_PATTERNS = [
    # Spam
    r'(?i)(купи|продам|заработок|биткоин|крипто)\s+(здесь|тут|сейчас)',
    r'(?i)(casino|казино|ставки|betting)',
    
    # Scam
    r'(?i)(гарант|100%|быстрые деньги|easy money)',
    r'(?i)(telegram\s*@|whatsapp|viber)\s*[\w\d]+',
    
    # Inappropriate
    r'(?i)(порно|porn|xxx)',
    
    # Threats
    r'(?i)(убью|kill|threat|угроза)',
]

# Suspicious keywords (lower severity)
SUSPICIOUS_KEYWORDS = [
    'обман', 'scam', 'fraud', 'мошенник', 'fake',
    'взлом', 'hack', 'stolen', 'украден'
]


def moderate_content(text: str) -> Dict[str, Any]:
    """
    Moderate text content
    Returns: {"safe": bool, "reason": str, "severity": str}
    """
    
    # Check blacklist patterns
    for pattern in BLACKLIST_PATTERNS:
        if re.search(pattern, text):
            return {
                "safe": False,
                "reason": "Обнаружен запрещённый контент",
                "severity": "high",
                "action": "block"
            }
    
    # Check suspicious keywords
    suspicious_count = sum(1 for keyword in SUSPICIOUS_KEYWORDS if keyword.lower() in text.lower())
    
    if suspicious_count >= 3:
        return {
            "safe": False,
            "reason": "Подозрительный контент (множественные триггеры)",
            "severity": "medium",
            "action": "warn"
        }
    
    # Check excessive caps (spam indicator)
    if len(text) > 20:
        caps_ratio = sum(1 for c in text if c.isupper()) / len(text)
        if caps_ratio > 0.7:
            return {
                "safe": False,
                "reason": "Спам (избыточные заглавные буквы)",
                "severity": "low",
                "action": "warn"
            }
    
    # Check excessive repetition
    words = text.split()
    if len(words) > 5:
        unique_ratio = len(set(words)) / len(words)
        if unique_ratio < 0.3:
            return {
                "safe": False,
                "reason": "Спам (повторяющийся текст)",
                "severity": "low",
                "action": "warn"
            }
    
    return {
        "safe": True,
        "reason": "Контент безопасен",
        "severity": "none",
        "action": "allow"
    }


def moderate_image(image_url: str, description: str = "") -> Dict[str, Any]:
    """
    Moderate image content
    For now, uses description-based moderation
    In production, integrate with vision-based moderation API
    """
    
    # If description provided, moderate it
    if description:
        text_result = moderate_content(description)
        if not text_result["safe"]:
            return {
                **text_result,
                "content_type": "image"
            }
    
    # TODO: Integrate with Mistral vision API for actual image analysis
    # For now, assume safe if no description issues
    return {
        "safe": True,
        "reason": "Изображение прошло проверку",
        "severity": "none",
        "action": "allow",
        "content_type": "image"
    }


def get_user_risk_score(user_id: str, violations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Calculate user risk score based on violation history
    """
    if not violations:
        return {
            "risk_level": "low",
            "score": 0,
            "action": "none"
        }
    
    # Calculate score
    score = 0
    for violation in violations:
        severity = violation.get("severity", "low")
        if severity == "high":
            score += 10
        elif severity == "medium":
            score += 5
        elif severity == "low":
            score += 1
    
    # Determine risk level and action
    if score >= 30:
        return {
            "risk_level": "critical",
            "score": score,
            "action": "ban",
            "reason": "Множественные серьёзные нарушения"
        }
    elif score >= 15:
        return {
            "risk_level": "high",
            "score": score,
            "action": "restrict",
            "reason": "Частые нарушения"
        }
    elif score >= 5:
        return {
            "risk_level": "medium",
            "score": score,
            "action": "warn",
            "reason": "Несколько нарушений"
        }
    else:
        return {
            "risk_level": "low",
            "score": score,
            "action": "monitor",
            "reason": "Минимальные нарушения"
        }
