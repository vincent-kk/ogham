#!/usr/bin/env python3
"""
Complexity Scorer - Evaluates skill complexity and recommends structure

Usage:
    complexity_scorer.py --interactive
    complexity_scorer.py --analyze <skill-path>

Output:
    JSON: {
        "score": 0.52,
        "category": "medium",
        "structure_recommendation": {...},
        "components": {...}
    }
"""

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional


@dataclass
class SkillSpecification:
    file_count: int = 0
    has_mcp_integration: bool = False
    workflow_steps: int = 0
    conditionals: int = 0
    external_deps: int = 0


def calculate_complexity(spec: SkillSpecification) -> Dict:
    """
    Calculate complexity score using weighted formula.

    Formula:
        complexity = (file_count/20 × 0.3) + (mcp × 0.2) + (workflow/10 × 0.1)
                   + (conditionals/15 × 0.15) + (deps/5 × 0.25)

    Returns:
        {
            "score": float,
            "category": str,
            "components": dict,
            "structure_recommendation": dict
        }
    """
    # Component scores (normalized to 0-1)
    file_score = min(spec.file_count / 20, 1.0)
    mcp_score = 1.0 if spec.has_mcp_integration else 0.0
    workflow_score = min(spec.workflow_steps / 10, 1.0)
    conditional_score = min(spec.conditionals / 15, 1.0)
    deps_score = min(spec.external_deps / 5, 1.0)

    # Weighted sum
    complexity = (
        file_score * 0.3 +
        mcp_score * 0.2 +
        workflow_score * 0.1 +
        conditional_score * 0.15 +
        deps_score * 0.25
    )

    # Categorize
    if complexity < 0.4:
        category = "simple"
    elif complexity < 0.7:
        category = "medium"
    else:
        category = "complex"

    # Structure recommendation
    if category == "simple":
        structure = {
            "skill_md_target": "2-3k words",
            "include_reference_md": False,
            "include_examples_md": False,
            "include_knowledge": False,
            "include_docs": False,
            "scripts_count": "1-2",
            "description": "Minimal structure with SKILL.md and basic scripts"
        }
    elif category == "medium":
        structure = {
            "skill_md_target": "3-4k words",
            "include_reference_md": True,
            "include_examples_md": True,
            "include_knowledge": False,
            "include_docs": False,
            "scripts_count": "3-5",
            "description": "Standard structure with layered documentation"
        }
    else:  # complex
        structure = {
            "skill_md_target": "4-5k words (compressed)",
            "include_reference_md": True,
            "include_examples_md": True,
            "include_knowledge": True,
            "include_docs": True,
            "scripts_count": "5-7+",
            "description": "Full hierarchy with deep knowledge base"
        }

    return {
        "score": round(complexity, 2),
        "category": category,
        "components": {
            "file_score": round(file_score, 2),
            "mcp_score": round(mcp_score, 2),
            "workflow_score": round(workflow_score, 2),
            "conditional_score": round(conditional_score, 2),
            "deps_score": round(deps_score, 2)
        },
        "structure_recommendation": structure
    }


def analyze_existing_skill(skill_path: Path) -> SkillSpecification:
    """Analyze existing skill directory to determine complexity"""
    if not skill_path.exists():
        raise ValueError(f"Skill path not found: {skill_path}")

    # Count files
    file_count = sum(1 for _ in skill_path.rglob("*") if _.is_file())

    # Check for MCP integration (look for mcp references in SKILL.md)
    has_mcp = False
    skill_md = skill_path / "SKILL.md"
    if skill_md.exists():
        content = skill_md.read_text().lower()
        has_mcp = any(mcp in content for mcp in ["playwright", "context7", "sequential", "mcp"])

    # Estimate workflow steps (count headers in SKILL.md)
    workflow_steps = 0
    if skill_md.exists():
        content = skill_md.read_text()
        workflow_steps = len([line for line in content.split('\n') if line.strip().startswith('##')])

    # Estimate conditionals (rough heuristic based on scripts)
    conditionals = 0
    scripts_dir = skill_path / "scripts"
    if scripts_dir.exists():
        for script in scripts_dir.glob("*.py"):
            content = script.read_text()
            conditionals += content.count("if ") + content.count("elif ")

    # Count external dependencies
    external_deps = 0
    requirements = skill_path / "requirements.txt"
    if requirements.exists():
        external_deps = len([line for line in requirements.read_text().split('\n') if line.strip()])

    return SkillSpecification(
        file_count=file_count,
        has_mcp_integration=has_mcp,
        workflow_steps=workflow_steps,
        conditionals=conditionals,
        external_deps=external_deps
    )


def interactive_mode():
    """Interactive CLI for gathering skill specification"""
    print("=== Skill Complexity Scorer - Interactive Mode ===\n")

    file_count = int(input("Expected total file count (scripts + references + assets): "))
    mcp_integration = input("MCP integration planned? (yes/no): ").lower() == "yes"
    workflow_steps = int(input("Number of workflow steps: "))
    conditionals = int(input("Number of conditional branches: "))
    external_deps = int(input("Number of external dependencies: "))

    spec = SkillSpecification(
        file_count=file_count,
        has_mcp_integration=mcp_integration,
        workflow_steps=workflow_steps,
        conditionals=conditionals,
        external_deps=external_deps
    )

    return calculate_complexity(spec)


def main():
    parser = argparse.ArgumentParser(description="Calculate skill complexity")
    parser.add_argument("--interactive", action="store_true", help="Interactive mode")
    parser.add_argument("--analyze", help="Analyze existing skill directory")
    args = parser.parse_args()

    if args.interactive:
        result = interactive_mode()
    elif args.analyze:
        skill_path = Path(args.analyze)
        spec = analyze_existing_skill(skill_path)
        result = calculate_complexity(spec)
        result["analyzed_spec"] = {
            "file_count": spec.file_count,
            "has_mcp_integration": spec.has_mcp_integration,
            "workflow_steps": spec.workflow_steps,
            "conditionals": spec.conditionals,
            "external_deps": spec.external_deps
        }
    else:
        parser.print_help()
        return

    print("\n" + json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
