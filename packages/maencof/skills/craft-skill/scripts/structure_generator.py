#!/usr/bin/env python3
"""
Structure Generator - Creates skill directory structure based on complexity

Usage:
    structure_generator.py --name <skill-name> --complexity <simple|medium|complex> --path <output-path>

Example:
    structure_generator.py --name api-client --complexity medium --path ./skills
"""

import argparse
import json
from pathlib import Path
from typing import Dict


SKILL_MD_TEMPLATES = {
    "simple": """---
name: {name}
description: [TODO: Complete description with specific trigger scenarios]
version: 1.0.0
complexity: simple
created: {date}
---

# {title}

## Quick Start
[2-3 sentence overview]

## When to Use This Skill
[Specific trigger scenarios - bulleted list]

## Workflow
[Simple 2-3 step process]

## Resources
### scripts/
[Brief description of available scripts]

## Quick Reference
[Common operations cheat sheet]
""",

    "medium": """---
name: {name}
description: [TODO: Complete description with specific trigger scenarios]
version: 1.0.0
complexity: medium
created: {date}
---

# {title}

## Quick Start
[2-3 sentence overview]

## When to Use This Skill
[Specific trigger scenarios - bulleted list]

## Core Workflow
[High-level 4-6 step process with references to reference.md]

## Resources
### reference.md
Detailed workflows, algorithms, and implementation guidance.

### examples.md
Real-world usage examples and patterns.

### scripts/
[Brief description of available automation tools]

## Quick Reference
[Common operations cheat sheet]
""",

    "complex": """---
name: {name}
description: [TODO: Complete description with specific trigger scenarios]
version: 1.0.0
complexity: complex
created: {date}
---

# {title}

## Quick Start
[2-3 sentence overview - keep brief, details in reference.md]

## When to Use This Skill
[Specific trigger scenarios - bulleted list]

## Core Workflow
[High-level overview - details in reference.md]

## Resources
### reference.md
Comprehensive workflows, algorithms, and mode-specific processes.

### examples.md
5-10 real-world examples covering all complexity levels.

### knowledge/
Deep-dive topics: skill anatomy, MCP integration, resource design, quality standards.

### scripts/
[Brief index of automation tools - details in reference.md]

### docs/
Migration guides, troubleshooting, advanced patterns.

## Quick Reference
[Essential operations only - full reference in reference.md]
"""
}


def generate_structure(name: str, complexity: str, path: Path) -> Dict:
    """
    Generate skill directory structure based on complexity.

    Returns:
        {
            "skill_path": Path,
            "files_created": List[str],
            "next_steps": List[str]
        }
    """
    from datetime import date

    skill_path = path / name

    if skill_path.exists():
        raise ValueError(f"Skill directory already exists: {skill_path}")

    skill_path.mkdir(parents=True, exist_ok=False)

    files_created = []

    # Create SKILL.md
    title = " ".join(word.capitalize() for word in name.split("-"))
    today = date.today().isoformat()
    skill_md_content = SKILL_MD_TEMPLATES[complexity].format(
        name=name,
        title=title,
        date=today
    )
    (skill_path / "SKILL.md").write_text(skill_md_content)
    files_created.append("SKILL.md")

    # Create scripts/
    scripts_dir = skill_path / "scripts"
    scripts_dir.mkdir()
    (scripts_dir / "example.py").write_text(f"#!/usr/bin/env python3\n# Example script for {name}\n")
    files_created.append("scripts/example.py")

    # Medium complexity additions
    if complexity in ["medium", "complex"]:
        (skill_path / "reference.md").write_text(f"# Detailed Reference for {title}\n\n[TODO: Add detailed workflows]\n")
        files_created.append("reference.md")

        (skill_path / "examples.md").write_text(f"# {title} Examples\n\n[TODO: Add 5-10 examples]\n")
        files_created.append("examples.md")

    # Complex additions
    if complexity == "complex":
        knowledge_dir = skill_path / "knowledge"
        knowledge_dir.mkdir()
        for topic in ["skill-anatomy.md", "progressive-disclosure.md", "mcp-integration.md",
                      "bundled-resources.md", "quality-standards.md"]:
            (knowledge_dir / topic).write_text(f"# {topic.replace('.md', '').replace('-', ' ').title()}\n\n[TODO: Add content]\n")
            files_created.append(f"knowledge/{topic}")

        docs_dir = skill_path / "docs"
        docs_dir.mkdir()
        for doc in ["migration-guide.md", "mode-comparison.md", "complexity-tuning.md",
                    "troubleshooting.md", "advanced-patterns.md"]:
            (docs_dir / doc).write_text(f"# {doc.replace('.md', '').replace('-', ' ').title()}\n\n[TODO: Add content]\n")
            files_created.append(f"docs/{doc}")

    next_steps = [
        "Edit SKILL.md to complete TODO items",
        "Update description in YAML frontmatter",
        "Implement scripts in scripts/ directory",
    ]

    if complexity in ["medium", "complex"]:
        next_steps.extend([
            "Fill in reference.md with detailed workflows",
            "Add 5-10 examples to examples.md",
        ])

    if complexity == "complex":
        next_steps.extend([
            "Complete knowledge/ deep-dive topics",
            "Write docs/ guides (migration, troubleshooting, etc.)",
        ])

    return {
        "skill_path": str(skill_path),
        "files_created": files_created,
        "next_steps": next_steps
    }


def main():
    parser = argparse.ArgumentParser(description="Generate skill directory structure")
    parser.add_argument("--name", required=True, help="Skill name (hyphen-case)")
    parser.add_argument("--complexity", required=True, choices=["simple", "medium", "complex"])
    parser.add_argument("--path", required=True, help="Output directory path")
    args = parser.parse_args()

    path = Path(args.path)
    result = generate_structure(args.name, args.complexity, path)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
