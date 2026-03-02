#!/usr/bin/env python3
"""
Enhanced Skill Initializer - Creates new skills with mode support

Usage:
    init_skill.py <skill-name> [--mode <create|refactor|improve|fix>] [--complexity <simple|medium|complex>]

Features:
- 4 mode support (CREATE/REFACTOR/IMPROVE/FIX)
- Complexity-based template selection
- Improved SKILL.md templates (v2.0 format)
- Auto-creation of knowledge/ and docs/ directories
"""

import argparse
import json
import subprocess
import sys
from datetime import date
from pathlib import Path
from typing import Optional


def detect_mode_auto(skill_name: str, base_path: Path) -> str:
    """Auto-detect mode based on skill existence"""
    skill_path = base_path / skill_name

    if skill_path.exists() and (skill_path / "SKILL.md").exists():
        # Existing skill - default to IMPROVE
        return "improve"
    else:
        # New skill - default to CREATE
        return "create"


def get_complexity_recommendation(skill_name: str, interactive: bool = True) -> str:
    """Get complexity level for the skill"""
    if interactive:
        print(f"\n=== Complexity Assessment for '{skill_name}' ===")
        print("1. simple   - Basic skill with minimal workflow (1-2 scripts)")
        print("2. medium   - Standard skill with multiple steps (3-5 scripts)")
        print("3. complex  - Advanced skill with MCP integration (5-7+ scripts)")

        choice = input("\nSelect complexity (1-3) or press Enter for auto-detect: ").strip()

        if choice == "1":
            return "simple"
        elif choice == "2":
            return "medium"
        elif choice == "3":
            return "complex"

    # Default to medium for general purpose
    return "medium"


def create_skill(skill_name: str, complexity: str, output_path: Path) -> bool:
    """Create new skill using structure_generator.py"""
    script_dir = Path(__file__).parent
    generator = script_dir / "structure_generator.py"

    if not generator.exists():
        print(f"❌ Error: structure_generator.py not found at {generator}")
        return False

    try:
        result = subprocess.run(
            [sys.executable, str(generator),
             "--name", skill_name,
             "--complexity", complexity,
             "--path", str(output_path)],
            capture_output=True,
            text=True,
            check=True
        )

        output = json.loads(result.stdout)

        print(f"\n✅ Skill '{skill_name}' created successfully!")
        print(f"📁 Location: {output['skill_path']}")
        print(f"\n📄 Files created:")
        for file in output['files_created']:
            print(f"  - {file}")

        print(f"\n📝 Next steps:")
        for i, step in enumerate(output['next_steps'], 1):
            print(f"  {i}. {step}")

        return True

    except subprocess.CalledProcessError as e:
        print(f"❌ Error creating skill: {e.stderr}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing output: {e}")
        return False


def refactor_skill(skill_path: Path) -> bool:
    """Refactor existing skill structure"""
    print(f"\n🔄 REFACTOR mode for: {skill_path}")
    print("This will reorganize the skill structure while preserving functionality.")

    # Analyze current structure
    script_dir = Path(__file__).parent
    analyzer = script_dir / "complexity_scorer.py"

    if analyzer.exists():
        try:
            result = subprocess.run(
                [sys.executable, str(analyzer), "--analyze", str(skill_path)],
                capture_output=True,
                text=True,
                check=True
            )

            analysis = json.loads(result.stdout)
            print(f"\n📊 Current complexity: {analysis['category']} (score: {analysis['score']})")

        except Exception as e:
            print(f"⚠️  Could not analyze complexity: {e}")

    print("\n⚠️  Refactoring is a manual process. Recommendations:")
    print("  1. Back up the current skill")
    print("  2. Review SKILL.md size (should be <5k words)")
    print("  3. Extract content to reference.md if needed")
    print("  4. Create examples.md from inline examples")
    print("  5. Run enhanced_validator.py to verify")

    return True


def improve_skill(skill_path: Path) -> bool:
    """Add features to existing skill"""
    print(f"\n📈 IMPROVE mode for: {skill_path}")
    print("This will help you add new features to the existing skill.")

    print("\n📝 Improvement checklist:")
    print("  1. Identify the feature to add")
    print("  2. Update SKILL.md workflow section")
    print("  3. Add new scripts if needed")
    print("  4. Update examples.md with new use cases")
    print("  5. Run enhanced_validator.py")
    print("  6. Update version number in frontmatter")

    return True


def fix_skill(skill_path: Path) -> bool:
    """Fix bugs in existing skill"""
    print(f"\n🔧 FIX mode for: {skill_path}")
    print("This will help you fix bugs in the skill.")

    # Run validator first to identify issues
    script_dir = Path(__file__).parent
    validator = script_dir / "enhanced_validator.py"

    if validator.exists():
        print("\n🔍 Running validation to identify issues...")
        subprocess.run([sys.executable, str(validator), str(skill_path)])

    print("\n📝 Fix workflow:")
    print("  1. Identify the specific bug")
    print("  2. Make minimal changes to fix it")
    print("  3. Test the fix")
    print("  4. Run enhanced_validator.py")
    print("  5. Update version (patch number)")

    return True


def main():
    parser = argparse.ArgumentParser(description="Initialize or modify a skill")
    parser.add_argument("skill_name", help="Name of the skill (hyphen-case)")
    parser.add_argument("--mode", choices=["create", "refactor", "improve", "fix"],
                       help="Operation mode (auto-detected if not specified)")
    parser.add_argument("--complexity", choices=["simple", "medium", "complex"],
                       help="Skill complexity (for CREATE mode)")
    parser.add_argument("--path", default=".", help="Output path (default: current directory)")
    parser.add_argument("--non-interactive", action="store_true",
                       help="Non-interactive mode (use defaults)")

    args = parser.parse_args()

    base_path = Path(args.path).resolve()
    skill_path = base_path / args.skill_name

    # Detect mode if not specified
    mode = args.mode or detect_mode_auto(args.skill_name, base_path)

    print(f"🎯 Mode: {mode.upper()}")

    # Execute based on mode
    if mode == "create":
        if args.complexity:
            complexity = args.complexity
        else:
            complexity = get_complexity_recommendation(args.skill_name,
                                                     not args.non_interactive)

        success = create_skill(args.skill_name, complexity, base_path)

    elif mode == "refactor":
        if not skill_path.exists():
            print(f"❌ Error: Skill not found at {skill_path}")
            sys.exit(1)
        success = refactor_skill(skill_path)

    elif mode == "improve":
        if not skill_path.exists():
            print(f"❌ Error: Skill not found at {skill_path}")
            sys.exit(1)
        success = improve_skill(skill_path)

    elif mode == "fix":
        if not skill_path.exists():
            print(f"❌ Error: Skill not found at {skill_path}")
            sys.exit(1)
        success = fix_skill(skill_path)

    else:
        print(f"❌ Unknown mode: {mode}")
        sys.exit(1)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
