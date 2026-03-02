#!/usr/bin/env python3
"""
Enhanced Skill Packager - Creates distributable skill packages

Usage:
    package_skill.py <skill-path> [output-dir]

Features:
- Integrated enhanced_validator.py validation
- Version metadata inclusion
- CHANGELOG.md auto-update support
- Detailed packaging logs
"""

import argparse
import hashlib
import json
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List


def calculate_checksum(file_path: Path) -> str:
    """Calculate SHA256 checksum of a file"""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def extract_metadata(skill_path: Path) -> Dict:
    """Extract metadata from SKILL.md frontmatter"""
    skill_md = skill_path / "SKILL.md"

    if not skill_md.exists():
        raise ValueError("SKILL.md not found")

    import re
    content = skill_md.read_text()

    match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
    if not match:
        raise ValueError("Invalid YAML frontmatter")

    frontmatter = match.group(1)

    metadata = {}
    for line in frontmatter.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            metadata[key.strip()] = value.strip()

    return metadata


def validate_skill(skill_path: Path) -> bool:
    """Run enhanced_validator.py on the skill"""
    script_dir = Path(__file__).parent
    validator = script_dir / "enhanced_validator.py"

    if not validator.exists():
        print("⚠️  Warning: enhanced_validator.py not found, skipping validation")
        return True

    print("🔍 Running validation...")
    result = subprocess.run(
        [sys.executable, str(validator), str(skill_path)],
        capture_output=True,
        text=True
    )

    print(result.stdout)

    return result.returncode == 0


def get_skill_structure_info(skill_path: Path) -> Dict:
    """Analyze skill structure"""
    info = {
        "has_reference_md": (skill_path / "reference.md").exists(),
        "has_examples_md": (skill_path / "examples.md").exists(),
        "has_knowledge": (skill_path / "knowledge").exists(),
        "has_docs": (skill_path / "docs").exists(),
        "scripts_count": len(list((skill_path / "scripts").glob("*.py"))) if (skill_path / "scripts").exists() else 0
    }
    return info


def create_install_instructions(metadata: Dict, structure: Dict, skill_name: str) -> str:
    """Generate INSTALL.md content"""
    version = metadata.get('version', '1.0.0')

    content = f"""# Installation Instructions for {skill_name} v{version}

## Quick Install

1. Extract the zip file:
   ```bash
   unzip {skill_name}.zip
   ```

2. Move to Claude Code skills directory:
   ```bash
   mv {skill_name} ~/.claude/skills/
   ```

3. Verify installation:
   ```bash
   python ~/.claude/skills/{skill_name}/scripts/enhanced_validator.py ~/.claude/skills/{skill_name}
   ```

## Structure

This skill includes:
"""

    if structure['has_reference_md']:
        content += "- ✅ reference.md - Detailed documentation\n"
    if structure['has_examples_md']:
        content += "- ✅ examples.md - Usage examples\n"
    if structure['has_knowledge']:
        content += "- ✅ knowledge/ - Deep-dive topics\n"
    if structure['has_docs']:
        content += "- ✅ docs/ - Additional guides\n"

    content += f"- ✅ {structure['scripts_count']} automation script(s)\n"

    content += """
## Dependencies

Check the skill's requirements.txt (if present) for dependencies:
```bash
cd ~/.claude/skills/{skill_name}
pip install -r requirements.txt  # if requirements.txt exists
```

## Verification

After installation, ask Claude:
> "Use the {skill_name} skill to [example task]"

Claude should recognize and use the skill automatically.

## Troubleshooting

If Claude doesn't recognize the skill:
1. Check file permissions: `ls -la ~/.claude/skills/{skill_name}`
2. Verify SKILL.md exists and has valid YAML frontmatter
3. Restart Claude Code application

## Uninstallation

To remove this skill:
```bash
rm -rf ~/.claude/skills/{skill_name}
```
"""

    return content.format(skill_name=skill_name)


def package_skill(skill_path: Path, output_dir: Path) -> bool:
    """Create skill package"""
    skill_name = skill_path.name

    print(f"📦 Packaging skill: {skill_name}")

    # Validate first
    if not validate_skill(skill_path):
        print("❌ Validation failed. Fix issues before packaging.")
        return False

    # Extract metadata
    try:
        metadata = extract_metadata(skill_path)
        print(f"📋 Version: {metadata.get('version', 'unknown')}")
    except Exception as e:
        print(f"❌ Error extracting metadata: {e}")
        return False

    # Analyze structure
    structure = get_skill_structure_info(skill_path)

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create package metadata
    package_metadata = {
        "name": skill_name,
        "version": metadata.get('version', '1.0.0'),
        "complexity": metadata.get('complexity', 'unknown'),
        "created": metadata.get('created', ''),
        "packaged": datetime.now().isoformat(),
        "requires": {
            "claude_code_version": ">=1.0.0",
            "python_version": ">=3.8"
        },
        "structure": structure
    }

    # Create zip file
    zip_path = output_dir / f"{skill_name}.zip"

    print(f"🗜️  Creating package: {zip_path}")

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add all skill files
        for file in skill_path.rglob('*'):
            if file.is_file():
                arcname = f"{skill_name}/{file.relative_to(skill_path)}"
                zipf.write(file, arcname)
                print(f"  + {file.relative_to(skill_path)}")

        # Add metadata
        metadata_json = json.dumps(package_metadata, indent=2)
        zipf.writestr(f"{skill_name}/.skill-metadata.json", metadata_json)
        print(f"  + .skill-metadata.json")

        # Add INSTALL.md
        install_content = create_install_instructions(metadata, structure, skill_name)
        zipf.writestr("INSTALL.md", install_content)
        print(f"  + INSTALL.md")

    # Calculate checksum
    checksum = calculate_checksum(zip_path)
    package_metadata['checksum'] = f"sha256:{checksum}"

    # Save metadata separately
    metadata_path = output_dir / f"{skill_name}.metadata.json"
    with open(metadata_path, 'w') as f:
        json.dump(package_metadata, f, indent=2)

    print(f"\n✅ Package created successfully!")
    print(f"📦 Package: {zip_path}")
    print(f"📋 Metadata: {metadata_path}")
    print(f"🔐 Checksum: {checksum[:16]}...")

    return True


def main():
    parser = argparse.ArgumentParser(description="Package a skill for distribution")
    parser.add_argument("skill_path", help="Path to skill directory")
    parser.add_argument("output_dir", nargs='?', default="./dist",
                       help="Output directory (default: ./dist)")

    args = parser.parse_args()

    skill_path = Path(args.skill_path).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not skill_path.exists():
        print(f"❌ Error: Skill path not found: {skill_path}")
        sys.exit(1)

    success = package_skill(skill_path, output_dir)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
