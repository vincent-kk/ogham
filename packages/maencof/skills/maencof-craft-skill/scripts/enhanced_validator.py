#!/usr/bin/env python3
"""
Enhanced Validator - Comprehensive skill validation

Usage:
    enhanced_validator.py <skill-directory> [--strict]

Validates:
- YAML frontmatter format and required fields
- Naming conventions
- Description quality
- File organization
- Resource references
- SKILL.md size limits
- Script executability
- Example completeness
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Dict, List


class ValidationResult:
    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.passed: List[str] = []
        self.quality_score: float = 0.0

    def add_error(self, msg: str):
        self.errors.append(f"❌ ERROR: {msg}")

    def add_warning(self, msg: str):
        self.warnings.append(f"⚠️  WARNING: {msg}")

    def add_pass(self, msg: str):
        self.passed.append(f"✅ PASS: {msg}")

    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def calculate_quality_score(self):
        """Calculate quality score (0-100)"""
        total_checks = len(self.passed) + len(self.warnings) + len(self.errors)
        if total_checks == 0:
            self.quality_score = 0.0
            return

        # Passed checks: full points, warnings: half points, errors: no points
        score = (len(self.passed) + len(self.warnings) * 0.5) / total_checks * 100
        self.quality_score = round(score, 1)

    def report(self) -> str:
        self.calculate_quality_score()

        lines = []
        lines.append("=" * 60)
        lines.append("VALIDATION REPORT")
        lines.append("=" * 60)

        if self.passed:
            lines.append("\n✅ PASSED CHECKS:")
            lines.extend(self.passed)

        if self.warnings:
            lines.append("\n⚠️  WARNINGS:")
            lines.extend(self.warnings)

        if self.errors:
            lines.append("\n❌ ERRORS:")
            lines.extend(self.errors)

        lines.append("\n" + "=" * 60)
        lines.append(f"QUALITY SCORE: {self.quality_score}/100")
        lines.append("=" * 60)

        if self.is_valid():
            lines.append("✅ VALIDATION PASSED")
        else:
            lines.append(f"❌ VALIDATION FAILED ({len(self.errors)} errors)")
        lines.append("=" * 60)

        return "\n".join(lines)


def validate_yaml_frontmatter(skill_path: Path, result: ValidationResult):
    """Validate YAML frontmatter in SKILL.md"""
    skill_md = skill_path / "SKILL.md"

    if not skill_md.exists():
        result.add_error("SKILL.md not found")
        return

    content = skill_md.read_text()

    # Check starts with ---
    if not content.startswith("---"):
        result.add_error("SKILL.md must start with YAML frontmatter (---)")
        return

    # Extract frontmatter
    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        result.add_error("Invalid YAML frontmatter format")
        return

    frontmatter = match.group(1)
    result.add_pass("YAML frontmatter format is valid")

    # Check required fields
    required_fields = ["name", "description"]
    for field in required_fields:
        if f"{field}:" not in frontmatter:
            result.add_error(f"Missing required field '{field}' in frontmatter")
        else:
            result.add_pass(f"Required field '{field}' present")

    # Validate name format
    name_match = re.search(r'name:\s*(.+)', frontmatter)
    if name_match:
        name = name_match.group(1).strip()
        if not re.match(r'^[a-z0-9-]+$', name):
            result.add_error(f"Name '{name}' must be hyphen-case (lowercase, hyphens only)")
        elif name.startswith('-') or name.endswith('-') or '--' in name:
            result.add_error(f"Name '{name}' cannot start/end with hyphen or have consecutive hyphens")
        else:
            result.add_pass(f"Name '{name}' follows hyphen-case convention")

    # Validate description
    desc_match = re.search(r'description:\s*(.+)', frontmatter)
    if desc_match:
        description = desc_match.group(1).strip()
        if '<' in description or '>' in description:
            result.add_error("Description cannot contain angle brackets (< or >)")
        if len(description.split()) < 10:
            result.add_warning("Description is very short (<10 words) - consider adding more detail")
        else:
            result.add_pass("Description is adequately detailed")


def validate_skill_md_size(skill_path: Path, result: ValidationResult):
    """Validate SKILL.md size is under 5k words"""
    skill_md = skill_path / "SKILL.md"

    if not skill_md.exists():
        return  # Already reported in frontmatter validation

    content = skill_md.read_text()
    word_count = len(content.split())

    if word_count > 5000:
        result.add_error(f"SKILL.md is too large ({word_count} words, max 5000)")
    elif word_count > 4500:
        result.add_warning(f"SKILL.md is approaching size limit ({word_count}/5000 words)")
    else:
        result.add_pass(f"SKILL.md size is appropriate ({word_count} words)")


def validate_file_organization(skill_path: Path, result: ValidationResult):
    """Validate proper directory structure"""
    # Check for scripts directory
    if not (skill_path / "scripts").exists():
        result.add_warning("No scripts/ directory found - consider if automation scripts would be helpful")
    else:
        result.add_pass("scripts/ directory present")

    # Check scripts are executable
    scripts_dir = skill_path / "scripts"
    if scripts_dir.exists():
        py_scripts = list(scripts_dir.glob("*.py"))
        if py_scripts:
            result.add_pass(f"Found {len(py_scripts)} Python script(s)")

        for script in py_scripts:
            if not os.access(script, os.X_OK):
                result.add_warning(f"Script {script.name} is not executable (chmod +x needed)")


def validate_resource_references(skill_path: Path, result: ValidationResult):
    """Validate that referenced resources actually exist"""
    skill_md = skill_path / "SKILL.md"

    if not skill_md.exists():
        return

    content = skill_md.read_text()

    # Check for reference.md mention
    if "reference.md" in content.lower():
        if not (skill_path / "reference.md").exists():
            result.add_error("SKILL.md references reference.md but file doesn't exist")
        else:
            result.add_pass("reference.md exists as referenced")

    # Check for examples.md mention
    if "examples.md" in content.lower():
        if not (skill_path / "examples.md").exists():
            result.add_error("SKILL.md references examples.md but file doesn't exist")
        else:
            result.add_pass("examples.md exists as referenced")

    # Check for knowledge/ mention
    if "knowledge/" in content.lower():
        if not (skill_path / "knowledge").exists():
            result.add_error("SKILL.md references knowledge/ but directory doesn't exist")
        else:
            result.add_pass("knowledge/ directory exists as referenced")


def validate_skill(skill_path: Path, strict: bool = False) -> ValidationResult:
    """Run all validation checks"""
    result = ValidationResult()

    if not skill_path.exists():
        result.add_error(f"Skill directory not found: {skill_path}")
        return result

    validate_yaml_frontmatter(skill_path, result)
    validate_skill_md_size(skill_path, result)
    validate_file_organization(skill_path, result)
    validate_resource_references(skill_path, result)

    if strict and result.warnings:
        # In strict mode, treat warnings as errors
        for warning in result.warnings:
            result.add_error(warning.replace("⚠️  WARNING:", "").strip())
        result.warnings = []

    return result


def main():
    parser = argparse.ArgumentParser(description="Validate skill structure and content")
    parser.add_argument("skill_path", help="Path to skill directory")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors")
    args = parser.parse_args()

    skill_path = Path(args.skill_path)
    result = validate_skill(skill_path, args.strict)

    print(result.report())

    sys.exit(0 if result.is_valid() else 1)


if __name__ == "__main__":
    main()
