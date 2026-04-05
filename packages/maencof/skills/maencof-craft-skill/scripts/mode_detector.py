#!/usr/bin/env python3
"""
Mode Detector - Determines CREATE/REFACTOR/IMPROVE/FIX from context

Usage:
    mode_detector.py --request "user request text" [--skill-path <path>]

Output:
    JSON: {"mode": "CREATE", "confidence": 0.95, "reasons": [...]}
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional


class Mode:
    CREATE = "CREATE"
    REFACTOR = "REFACTOR"
    IMPROVE = "IMPROVE"
    FIX = "FIX"


def detect_mode(request: str, skill_path: Optional[Path] = None) -> Dict:
    """
    Detect operating mode from user request and context.

    Returns:
        {
            "mode": str,
            "confidence": float (0-1),
            "reasons": List[str],
            "alternatives": List[str],
            "existing_skill": bool
        }
    """
    request_lower = request.lower()
    existing_skill = skill_path and skill_path.exists() and (skill_path / "SKILL.md").exists()

    # Keyword analysis
    create_keywords = ["create", "new skill", "build", "initialize", "start"]
    refactor_keywords = ["refactor", "restructure", "reorganize", "clean up structure"]
    improve_keywords = ["improve", "enhance", "add feature", "extend", "upgrade"]
    fix_keywords = ["fix", "bug", "issue", "error", "broken", "debug", "resolve"]

    scores = {
        Mode.CREATE: sum(1 for kw in create_keywords if kw in request_lower),
        Mode.REFACTOR: sum(1 for kw in refactor_keywords if kw in request_lower),
        Mode.IMPROVE: sum(1 for kw in improve_keywords if kw in request_lower),
        Mode.FIX: sum(1 for kw in fix_keywords if kw in request_lower),
    }

    # Context adjustment
    if not existing_skill:
        scores[Mode.CREATE] += 5  # Strong bias for CREATE if no existing skill
        scores[Mode.REFACTOR] = 0
        scores[Mode.IMPROVE] = 0
        scores[Mode.FIX] = 0

    # Determine mode
    max_score = max(scores.values())
    if max_score == 0:
        # No clear keywords - default based on existence
        mode = Mode.CREATE if not existing_skill else Mode.IMPROVE
        confidence = 0.5
        reasons = ["No specific keywords detected, using default"]
    else:
        mode = max(scores, key=scores.get)
        confidence = min(max_score / 5.0, 1.0)  # Normalize to 0-1
        reasons = [f"Detected keywords for {mode}"]

    if not existing_skill and mode != Mode.CREATE:
        reasons.append("No existing skill found, defaulting to CREATE")
        mode = Mode.CREATE

    if existing_skill:
        reasons.append("Existing skill detected")

    # Find alternatives
    alternatives = [m for m, s in sorted(scores.items(), key=lambda x: x[1], reverse=True)
                    if m != mode and s > 0]

    return {
        "mode": mode,
        "confidence": round(confidence, 2),
        "reasons": reasons,
        "alternatives": alternatives[:2],  # Top 2 alternatives
        "existing_skill": existing_skill
    }


def main():
    parser = argparse.ArgumentParser(description="Detect skill creation mode")
    parser.add_argument("--request", required=True, help="User request text")
    parser.add_argument("--skill-path", help="Path to existing skill directory")
    args = parser.parse_args()

    skill_path = Path(args.skill_path) if args.skill_path else None
    result = detect_mode(args.request, skill_path)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
