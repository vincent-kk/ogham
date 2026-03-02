#!/usr/bin/env python3
"""
Intelligent Deployment Helper - Assists with skill deployment decisions

Usage:
    deployment_helper.py <skill-path> [--scope project|global]
    deployment_helper.py --analyze <package.zip>

Features:
- Intelligent deployment location detection
- Project-specific vs global skill recommendations
- Symlink creation support
- Dependency checking
"""

import argparse
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Dict, Optional


def get_claude_skills_dir() -> Path:
    """Get the global Claude skills directory"""
    home = Path.home()
    return home / ".claude" / "skills"


def get_project_skills_dir() -> Optional[Path]:
    """Get the project-specific skills directory if in a project"""
    cwd = Path.cwd()

    # Look for .claude directory in current or parent directories
    current = cwd
    for _ in range(5):  # Check up to 5 levels up
        claude_dir = current / ".claude"
        if claude_dir.exists():
            skills_dir = claude_dir / "skills"
            return skills_dir

        if current.parent == current:  # Reached root
            break
        current = current.parent

    return None


def analyze_deployment_location(skill_name: str, is_generic: bool = None) -> Dict:
    """Analyze and recommend deployment location"""
    global_dir = get_claude_skills_dir()
    project_dir = get_project_skills_dir()

    recommendations = {
        "skill_name": skill_name,
        "global_location": str(global_dir / skill_name),
        "project_location": str(project_dir / skill_name) if project_dir else None,
        "in_project": project_dir is not None,
        "recommendation": None,
        "reasons": []
    }

    # Determine recommendation
    if is_generic is True:
        # Explicitly marked as generic
        recommendations["recommendation"] = "global"
        recommendations["reasons"].append("Skill is marked as generic/reusable")
    elif is_generic is False:
        # Explicitly marked as project-specific
        recommendations["recommendation"] = "project"
        recommendations["reasons"].append("Skill is marked as project-specific")
    elif project_dir:
        # Auto-detect: if in a project, default to project
        recommendations["recommendation"] = "project"
        recommendations["reasons"].append("Currently in a project directory")
    else:
        # Not in a project, use global
        recommendations["recommendation"] = "global"
        recommendations["reasons"].append("Not in a project directory")

    # Check for existing installations
    if (global_dir / skill_name).exists():
        recommendations["existing_global"] = True
        recommendations["reasons"].append(f"⚠️  Skill already exists in global location")

    if project_dir and (project_dir / skill_name).exists():
        recommendations["existing_project"] = True
        recommendations["reasons"].append(f"⚠️  Skill already exists in project location")

    return recommendations


def check_dependencies() -> Dict:
    """Check Python version and common dependencies"""
    import sys

    checks = {
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "python_ok": sys.version_info >= (3, 8),
        "dependencies": {}
    }

    # Check for common packages
    common_packages = ["requests", "jinja2", "pyyaml"]

    for package in common_packages:
        try:
            __import__(package)
            checks["dependencies"][package] = "installed"
        except ImportError:
            checks["dependencies"][package] = "not installed"

    return checks


def extract_package(zip_path: Path, output_dir: Path) -> Path:
    """Extract skill package and return skill directory"""
    print(f"📦 Extracting package: {zip_path}")

    with zipfile.ZipFile(zip_path, 'r') as zipf:
        zipf.extractall(output_dir)

    # Find the skill directory (should be the only directory in the zip)
    skill_dirs = [d for d in output_dir.iterdir() if d.is_dir()]

    if len(skill_dirs) != 1:
        raise ValueError(f"Expected 1 skill directory, found {len(skill_dirs)}")

    return skill_dirs[0]


def deploy_skill(skill_path: Path, target_dir: Path, use_symlink: bool = False) -> bool:
    """Deploy skill to target directory"""
    skill_name = skill_path.name
    target_path = target_dir / skill_name

    # Check if target already exists
    if target_path.exists():
        response = input(f"⚠️  {target_path} already exists. Overwrite? (yes/no): ")
        if response.lower() != "yes":
            print("❌ Deployment cancelled")
            return False

        # Remove existing
        if target_path.is_symlink():
            target_path.unlink()
        else:
            shutil.rmtree(target_path)

    # Create target directory if needed
    target_dir.mkdir(parents=True, exist_ok=True)

    # Deploy
    if use_symlink:
        print(f"🔗 Creating symlink: {target_path} -> {skill_path}")
        target_path.symlink_to(skill_path.resolve())
    else:
        print(f"📁 Copying skill: {skill_path} -> {target_path}")
        shutil.copytree(skill_path, target_path)

    print(f"✅ Deployed to: {target_path}")
    return True


def analyze_package(zip_path: Path) -> Dict:
    """Analyze a skill package"""
    import tempfile

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = Path(tmpdir)

        # Extract to temp
        with zipfile.ZipFile(zip_path, 'r') as zipf:
            zipf.extractall(tmpdir_path)

        # Find metadata
        metadata_files = list(tmpdir_path.rglob(".skill-metadata.json"))

        if metadata_files:
            with open(metadata_files[0]) as f:
                metadata = json.load(f)
        else:
            metadata = {"error": "No metadata found"}

        # Find skill directory
        skill_dirs = [d for d in tmpdir_path.iterdir() if d.is_dir()]
        skill_name = skill_dirs[0].name if skill_dirs else "unknown"

        # Get deployment recommendation
        deployment_rec = analyze_deployment_location(skill_name)

        # Check dependencies
        dep_checks = check_dependencies()

        return {
            "metadata": metadata,
            "deployment": deployment_rec,
            "dependencies": dep_checks
        }


def main():
    parser = argparse.ArgumentParser(description="Deploy skills intelligently")
    parser.add_argument("skill_path", nargs='?', help="Path to skill directory or package")
    parser.add_argument("--scope", choices=["project", "global"],
                       help="Deployment scope")
    parser.add_argument("--symlink", action="store_true",
                       help="Create symlink instead of copying")
    parser.add_argument("--analyze", help="Analyze a package without deploying")

    args = parser.parse_args()

    # Analyze mode
    if args.analyze:
        zip_path = Path(args.analyze)
        if not zip_path.exists():
            print(f"❌ Package not found: {zip_path}")
            sys.exit(1)

        print("🔍 Analyzing package...")
        analysis = analyze_package(zip_path)

        print("\n" + "=" * 60)
        print("DEPLOYMENT ANALYSIS")
        print("=" * 60)
        print(json.dumps(analysis, indent=2))

        sys.exit(0)

    # Deploy mode
    if not args.skill_path:
        parser.print_help()
        sys.exit(1)

    skill_path = Path(args.skill_path)

    # Handle zip files
    if skill_path.suffix == '.zip':
        import tempfile
        tmpdir = tempfile.mkdtemp()
        skill_path = extract_package(skill_path, Path(tmpdir))

    if not skill_path.exists():
        print(f"❌ Skill path not found: {skill_path}")
        sys.exit(1)

    skill_name = skill_path.name

    # Get deployment recommendation
    recommendations = analyze_deployment_location(skill_name)

    print("\n" + "=" * 60)
    print(f"DEPLOYMENT PLANNING: {skill_name}")
    print("=" * 60)

    print(f"\n📍 Recommended scope: {recommendations['recommendation']}")
    for reason in recommendations['reasons']:
        print(f"  • {reason}")

    # Determine target
    if args.scope:
        scope = args.scope
    else:
        scope = recommendations['recommendation']

    if scope == "global":
        target_dir = get_claude_skills_dir()
    else:
        target_dir = get_project_skills_dir()
        if not target_dir:
            print("❌ Not in a project directory. Use --scope global")
            sys.exit(1)

    print(f"\n📁 Target: {target_dir}")

    # Check dependencies
    dep_checks = check_dependencies()
    print(f"\n🐍 Python {dep_checks['python_version']}: {'✅' if dep_checks['python_ok'] else '❌'}")

    # Deploy
    print(f"\n🚀 Deploying...")
    success = deploy_skill(skill_path, target_dir, args.symlink)

    if success:
        print(f"\n✅ Deployment complete!")
        print(f"\n📝 Test the skill by asking Claude:")
        print(f'   "Use the {skill_name} skill to [your task]"')

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
