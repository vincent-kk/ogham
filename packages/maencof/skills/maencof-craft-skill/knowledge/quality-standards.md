# Quality Standards - Quality Metrics and Best Practices

## Skill Quality Assessment System

Skills are evaluated on a 0-100 point scale across four major areas.

---

## Quality Score Formula

```python
def calculate_quality_score(skill: Skill) -> float:
    """
    Calculate skill quality score (0-100)

    Components:
    - Validation (40%): Automated validation pass rate
    - Documentation (25%): Documentation completeness and clarity
    - Usability (20%): Ease of use
    - Maintainability (15%): Code quality and organization
    """
    validation_score = run_validation_checks(skill)      # 0-100
    documentation_score = assess_documentation(skill)     # 0-100
    usability_score = measure_usability(skill)           # 0-100
    maintainability_score = assess_maintainability(skill) # 0-100

    total = (
        validation_score * 0.40 +
        documentation_score * 0.25 +
        usability_score * 0.20 +
        maintainability_score * 0.15
    )

    return round(total, 1)
```

**Quality Grades:**
- **90-100**: Excellent
- **80-89**: Good
- **70-79**: Acceptable
- **60-69**: Needs Improvement
- **<60**: Poor

---

## 1. Validation Quality (40%)

### Metadata Validation

#### Name Requirements (10 points)

✅ **Perfect (10 points):**
```yaml
name: pdf-generator
name: api-client-builder
name: test-automation-framework
```

**Criteria:**
- Hyphen-case (lowercase, hyphens only)
- Descriptive and specific
- 3-40 characters
- Matches directory name
- No leading/trailing/consecutive hyphens

⚠️ **Partial (5 points):**
```yaml
name: pdf-gen        # Too abbreviated
name: my-skill       # Too generic
```

❌ **Fail (0 points):**
```yaml
name: PDFGenerator   # CamelCase
name: pdf_generator  # underscore
name: -pdf-gen       # starts with hyphen
```

---

#### Description Requirements (15 points)

✅ **Perfect (15 points):**
```yaml
description: >
  Use this skill when converting Markdown documentation to styled PDF reports.
  It provides template-based PDF generation with custom CSS styling,
  table of contents generation, and syntax highlighting for code blocks.
  Typical scenarios: Technical documentation, project reports, user manuals.
  Triggers: "convert to PDF", "generate PDF report", "create printable docs"
```

**Criteria:**
- Minimum 50 words (recommended 100-150 words)
- USE CASE specified ("Use this skill when...")
- CAPABILITIES explained ("It provides...")
- SCENARIOS listed ("Typical scenarios:")
- TRIGGERS included ("Triggers:")
- No angle brackets (`<`, `>`)
- Third-person perspective

⚠️ **Partial (8 points):**
```yaml
description: >
  Converts Markdown to PDF with custom styling and templates.
```
- Less than 50 words
- Missing trigger scenarios

❌ **Fail (0 points):**
```yaml
description: This skill helps with PDF tasks.
description: <Generate PDFs>  # angle brackets
```

---

#### Version & Complexity Requirements (5 points)

✅ **Perfect (5 points):**
```yaml
version: 1.0.0       # Semantic versioning
complexity: medium   # Matches actual complexity
created: 2026-02-12
updated: 2026-02-12
```

⚠️ **Partial (3 points):**
```yaml
version: 1.0         # Missing patch version
complexity: simple   # Mismatch with actual
```

❌ **Fail (0 points):**
```yaml
version: v1          # Invalid format
# complexity field missing
```

---

### File Structure Validation (10 points)

✅ **Perfect (10 points):**
- SKILL.md exists
- SKILL.md size < 5k words
- scripts/ directory exists (or justified absence)
- Scripts have executable permissions (`chmod +x`)
- All referenced files exist
- Directory structure matches complexity

**Validation Script:**
```bash
# Run enhanced_validator.py
python scripts/enhanced_validator.py /path/to/skill

# 10 points if all checks pass
```

---

## 2. Documentation Quality (25%)

### SKILL.md Quality (15 points)

#### Structure Completeness (7 points)

✅ **Perfect (7 points):**
```markdown
# Skill Name

## Quick Start
[2-3 sentence overview]

## When to Use This Skill
[Specific trigger scenarios - bullet points]

## Core Workflow
[Step-by-step process]

## Resources
[Resource index]

## Quick Reference
[Cheat sheet]
```

**Required Sections:**
- Quick Start ✅
- When to Use ✅
- Core Workflow ✅
- Resources ✅
- Quick Reference ✅

⚠️ **Partial (4 points):**
- 1-2 sections missing

❌ **Fail (0 points):**
- 3+ sections missing
- No structure

---

#### Writing Style (5 points)

✅ **Perfect (5 points):**
- Imperative/infinitive form ("To do X, ..." / "Do X")
- Specific and actionable
- Clear workflow
- Concrete examples included

**Example:**
```markdown
## Phase 1: Input Preparation

To prepare input files:
1. Gather all Markdown files from the target directory
2. Validate file format using scripts/validate_input.py
3. Review validation report

See reference.md Section 2.1 for detailed validation rules.
```

⚠️ **Partial (3 points):**
- Some vague expressions
- Insufficient examples

❌ **Fail (0 points):**
- "You should..." style (second person)
- Vague instructions
- Not actionable

---

#### Resource References (3 points)

✅ **Perfect (3 points):**
```markdown
## Resources

### reference.md
- Section 2: Detailed Workflows
- Section 3: API Reference
- Section 6: Troubleshooting

### examples.md
5 real-world examples covering simple to complex scenarios.

### scripts/
- generate.py: Main generation script
- validate.py: Input validation
```

**Criteria:**
- All resources listed
- Section numbers/names specified
- Brief descriptions

---

### Supporting Documentation Quality (10 points)

#### reference.md (5 points)

✅ **Perfect (5 points):**
- TOC included
- Clear section divisions
- Detailed workflows
- Algorithms/formulas explained
- Examples throughout

#### examples.md (3 points)

✅ **Perfect (3 points):**
- 5-10 examples
- Simple/Medium/Complex coverage
- Scenario + Input + Output format
- Executable

#### knowledge/ & docs/ (2 points)

✅ **Perfect (2 points):**
- Present for Complex skills
- Comprehensive theoretical background
- Advanced guides provided

---

## 3. Usability Quality (20%)

### Ease of Use (10 points)

#### Clear Entry Point (4 points)

✅ **Perfect (4 points):**
```markdown
## Quick Start

1. Install dependencies: pip install -r requirements.txt
2. Run: scripts/generate.py input.md
3. Output: output.pdf

For advanced usage, see reference.md Section 3.
```

**Criteria:**
- Start possible within 3 steps
- Clear commands
- Expected results shown

---

#### Error Handling (3 points)

✅ **Perfect (3 points):**
- Scripts provide clear error messages
- Troubleshooting section exists
- Common problems solved

**Example:**
```python
# scripts/generate.py
if not input_path.exists():
    print(f"Error: {input_path} not found", file=sys.stderr)
    print("Tip: Check file path and permissions", file=sys.stderr)
    sys.exit(2)
```

---

#### Example Quality (3 points)

✅ **Perfect (3 points):**
- Real use cases
- Copy-pasteable code
- Expected output included

---

### Progressive Disclosure Efficiency (10 points)

✅ **Perfect (10 points):**
- Layer 1 (Metadata): 100-150 words
- Layer 2 (SKILL.md): < 5k words
- Layer 3: On-demand information only
- No duplicate information
- Clear reference links

**Measurement:**
```python
metadata_words = len(yaml_frontmatter.split())
skill_md_words = len(skill_md_body.split())
duplication = check_content_overlap(skill_md, reference_md)

if metadata_words <= 150 and skill_md_words <= 5000 and duplication < 10%:
    score = 10
```

---

## 4. Maintainability Quality (15%)

### Code Quality (10 points)

#### Script Code Style (5 points)

✅ **Perfect (5 points):**

**Python:**
- PEP 8 compliant
- Type hints (Python 3.6+)
- Docstrings (all functions)
- Proper error handling

```python
#!/usr/bin/env python3
"""Module docstring"""

from pathlib import Path
from typing import Tuple

def validate_pdf(pdf_path: Path, strict: bool = False) -> Tuple[bool, str]:
    """
    Validate PDF file integrity.

    Args:
        pdf_path: Path to PDF file
        strict: Enable strict validation

    Returns:
        (is_valid, error_message)

    Raises:
        FileNotFoundError: If PDF file doesn't exist
    """
    if not pdf_path.exists():
        raise FileNotFoundError(f"{pdf_path} not found")

    # Validation logic
    return True, ""
```

**JavaScript/Bash:**
- ESLint/ShellCheck passing
- Consistent style
- Comments and documentation

---

#### Error Handling (3 points)

✅ **Perfect (3 points):**
```python
try:
    result = risky_operation()
except SpecificError as e:
    log_error(e)
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Unexpected error: {e}", file=sys.stderr)
    sys.exit(1)
```

**Criteria:**
- Specific exception handling
- Clear error messages
- Appropriate exit codes
- Logging

---

#### Testability (2 points)

✅ **Perfect (2 points):**
- Function-level separation
- Dependency injection possible
- Side effects minimized

```python
# ✅ Testable
def parse_markdown(content: str) -> dict:
    """Pure function - easy to test"""
    return parsed_data

# ❌ Hard to test
def parse_markdown_from_file():
    """File read, parse, write all included"""
    content = open("input.md").read()
    parsed = parse(content)
    open("output.json", "w").write(json.dumps(parsed))
```

---

### Organization (5 points)

#### File Placement (3 points)

✅ **Perfect (3 points):**
- Logical directory structure
- Grouped by functionality
- Clear naming

```
skill/
├── SKILL.md
├── reference.md
├── examples.md
├── scripts/
│   ├── validation/
│   │   ├── check_input.py
│   │   └── validate_output.py
│   └── generation/
│       ├── generate_code.py
│       └── generate_docs.py
└── assets/
    ├── templates/
    └── styles/
```

---

#### Documentation Organization (2 points)

✅ **Perfect (2 points):**
- Separation of concerns (SKILL.md vs reference.md)
- No duplication
- Clear references

---

## Best Practices Checklist

### Metadata Best Practices

✅ **Name:**
- [ ] Hyphen-case (lowercase, hyphens only)
- [ ] Descriptive and specific (3-40 chars)
- [ ] Matches directory name
- [ ] No leading/trailing/consecutive hyphens

✅ **Description:**
- [ ] 50+ words (recommended 100-150)
- [ ] USE CASE: "Use this skill when..."
- [ ] CAPABILITIES: "It provides..."
- [ ] SCENARIOS: "Typical scenarios:"
- [ ] TRIGGERS: "Triggers: ..."
- [ ] No angle brackets (`<`, `>`)
- [ ] Third-person perspective

✅ **Version:**
- [ ] Semantic versioning (MAJOR.MINOR.PATCH)
- [ ] Matches CHANGELOG.md

✅ **Complexity:**
- [ ] Matches calculated complexity score
- [ ] simple (< 0.4) | medium (0.4-0.7) | complex (> 0.7)

---

### SKILL.md Best Practices

✅ **Structure:**
- [ ] Quick Start section (2-3 sentences)
- [ ] When to Use section (specific triggers)
- [ ] Core Workflow section (step-by-step)
- [ ] Resources section (index)
- [ ] Quick Reference section (cheat sheet)

✅ **Style:**
- [ ] Imperative/infinitive form ("To do X, ..." / "Do X")
- [ ] Specific and actionable
- [ ] Clear workflow
- [ ] Concrete examples
- [ ] No "You should..." (avoid 2nd person)

✅ **Size:**
- [ ] Simple: 2-3k words
- [ ] Medium: 3-4k words
- [ ] Complex: 4-5k words (compressed)
- [ ] Never exceed 5k words

✅ **References:**
- [ ] All referenced files exist
- [ ] Section numbers/names specified
- [ ] Brief description of each resource

---

### Scripts Best Practices

✅ **Interface:**
- [ ] Clear docstring (usage, args, exit codes, examples)
- [ ] argparse for CLI
- [ ] Executable permission (`chmod +x`)
- [ ] Shebang (`#!/usr/bin/env python3`)

✅ **Code Quality:**
- [ ] PEP 8 (Python) / ESLint (JS) / ShellCheck (Bash)
- [ ] Type hints (Python 3.6+)
- [ ] Docstrings for all functions
- [ ] No TODO in production code

✅ **Error Handling:**
- [ ] Specific exceptions
- [ ] Clear error messages (stderr)
- [ ] Appropriate exit codes (0=success, 1+=error)
- [ ] Logging

✅ **Organization:**
- [ ] Single responsibility per script
- [ ] Logical directory structure (for 4+ scripts)
- [ ] No duplicate code

---

### Documentation Best Practices

✅ **reference.md:**
- [ ] Table of contents
- [ ] Clear section markers (Grep-friendly)
- [ ] Detailed workflows
- [ ] Algorithms/pseudocode
- [ ] Examples throughout

✅ **examples.md:**
- [ ] 5-10 examples
- [ ] Cover simple/medium/complex cases
- [ ] Scenario + Input + Output format
- [ ] Runnable examples

✅ **knowledge/ (complex skills):**
- [ ] Independent topics (one per file)
- [ ] Theoretical background
- [ ] Design patterns
- [ ] Best practices

✅ **docs/ (complex skills):**
- [ ] Migration guides
- [ ] Troubleshooting
- [ ] Advanced patterns
- [ ] FAQ

---

## Anti-Pattern List

### ❌ Metadata Anti-Patterns

**AP-M1: Vague Description**
```yaml
❌ Bad: description: This skill helps with tasks.
✅ Good: description: Use this skill when converting Markdown to PDF...
```

**AP-M2: Wrong Naming**
```yaml
❌ Bad: name: PDFGenerator (CamelCase)
❌ Bad: name: pdf_gen (underscore)
✅ Good: name: pdf-generator
```

**AP-M3: Missing Triggers**
```yaml
❌ Bad: description: Generates PDFs from Markdown.
✅ Good: description: ... Triggers: "convert to PDF", "generate report"
```

---

### ❌ SKILL.md Anti-Patterns

**AP-S1: Too Large**
```markdown
❌ Bad: SKILL.md (12k words - too large!)
✅ Good: SKILL.md (4k words) + reference.md (8k words)
```

**AP-S2: Missing Structure**
```markdown
❌ Bad: Just paragraphs of text without sections
✅ Good: Clear sections (Quick Start, When to Use, Workflow, etc.)
```

**AP-S3: Second Person**
```markdown
❌ Bad: "You should first install dependencies..."
✅ Good: "To install dependencies, run: pip install -r requirements.txt"
```

**AP-S4: Duplicate Content**
```markdown
❌ Bad: Same workflow details in both SKILL.md and reference.md
✅ Good: SKILL.md: overview + "See reference.md Section 2.1"
         reference.md: detailed workflow
```

---

### ❌ Scripts Anti-Patterns

**AP-SC1: No Docstring**
```python
❌ Bad:
#!/usr/bin/env python3
def generate():
    pass

✅ Good:
#!/usr/bin/env python3
"""
PDF Generator

Usage:
    generate.py <input.md>
"""
```

**AP-SC2: Poor Error Messages**
```python
❌ Bad:
except Exception:
    print("Error")
    sys.exit(1)

✅ Good:
except FileNotFoundError as e:
    print(f"Error: {e}", file=sys.stderr)
    print("Tip: Check file path", file=sys.stderr)
    sys.exit(2)
```

**AP-SC3: No Executable Permission**
```bash
❌ Bad: scripts not executable (chmod missing)
✅ Good: chmod +x scripts/*.py
```

---

### ❌ Documentation Anti-Patterns

**AP-D1: No Examples**
```markdown
❌ Bad: Only theoretical explanations
✅ Good: 5-10 concrete examples with code + output
```

**AP-D2: Missing TOC (large files)**
```markdown
❌ Bad: reference.md (5000+ lines) without TOC
✅ Good: TOC at top for easy navigation
```

**AP-D3: Broken References**
```markdown
❌ Bad: "See reference.md Section 5.3" (but Section 5.3 doesn't exist)
✅ Good: Verify all references exist
```

---

## Code Style Guide

### Python Style

```python
#!/usr/bin/env python3
"""
Module/Script docstring

Usage:
    script.py <arg> [options]
"""

from pathlib import Path
from typing import Optional, Tuple

# Constants
DEFAULT_OUTPUT = Path("output.pdf")
MAX_RETRIES = 3

class CustomError(Exception):
    """Custom exception with clear purpose"""
    pass

def function_name(
    arg1: str,
    arg2: Optional[int] = None
) -> Tuple[bool, str]:
    """
    Function docstring with clear explanation.

    Args:
        arg1: Description of arg1
        arg2: Description of arg2 (optional)

    Returns:
        (success, message)

    Raises:
        CustomError: When specific condition occurs
    """
    # Implementation with comments for complex logic
    result = process(arg1)

    if not result:
        raise CustomError("Processing failed")

    return True, "Success"

def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="Script description")
    parser.add_argument("arg1", help="Argument description")
    parser.add_argument("--arg2", type=int, help="Optional argument")

    args = parser.parse_args()

    try:
        success, message = function_name(args.arg1, args.arg2)
        if success:
            print(message)
            sys.exit(0)
        else:
            print(f"Error: {message}", file=sys.stderr)
            sys.exit(1)

    except CustomError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

---

### Bash Style

```bash
#!/bin/bash
#
# Script Name - Brief description
#
# Usage:
#   script.sh <arg1> [arg2]
#
# Exit codes:
#   0: Success
#   1: Error

set -euo pipefail  # Fail fast

# Constants
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly DEFAULT_OUTPUT="output.txt"

# Functions
function main() {
    local arg1="${1:-}"
    local arg2="${2:-$DEFAULT_OUTPUT}"

    if [[ -z "$arg1" ]]; then
        echo "Error: arg1 required" >&2
        echo "Usage: $0 <arg1> [arg2]" >&2
        exit 1
    fi

    # Main logic
    process_file "$arg1" "$arg2"

    echo "✓ Success"
}

function process_file() {
    local input="$1"
    local output="$2"

    if [[ ! -f "$input" ]]; then
        echo "Error: $input not found" >&2
        return 1
    fi

    # Processing logic
    cat "$input" > "$output"
}

# Run main
main "$@"
```

---

## Quality Verification Process

### Automated Validation
```bash
# 1. Structure validation
python scripts/enhanced_validator.py /path/to/skill

# 2. Code style (Python)
pylint scripts/*.py
black --check scripts/
mypy scripts/

# 3. Code style (Bash)
shellcheck scripts/*.sh

# 4. Documentation link checking
python scripts/check_references.py

# 5. Overall quality score
python scripts/quality_scorer.py /path/to/skill
```

### Manual Review

✅ **Functionality:**
- [ ] Skill solves stated problem
- [ ] Scripts execute without errors
- [ ] Examples work as documented
- [ ] MCP integration works (if applicable)

✅ **Documentation:**
- [ ] Description accurately describes skill
- [ ] Trigger scenarios are specific
- [ ] Workflow is clear and actionable
- [ ] Examples cover common use cases

✅ **Usability:**
- [ ] Easy to understand and use
- [ ] Progressive disclosure effective
- [ ] Resource organization aids discovery
- [ ] Quick reference actually helpful

✅ **Quality:**
- [ ] Naming conventions followed
- [ ] Code quality high
- [ ] Documentation clear
- [ ] No obvious bugs/issues

---

## Quality Targets

### Minimum Standards
- **Overall Score**: 70+
- **Validation**: 80+
- **Documentation**: 60+
- **Usability**: 60+
- **Maintainability**: 60+

### Recommended Targets
- **Overall Score**: 80+
- **All Categories**: 70+

### Excellence Standards
- **Overall Score**: 90+
- **All Categories**: 85+

---

## Conclusion

High-quality skills ensure:

1. **Verifiable**: Pass automated validation tools
2. **Well-Documented**: Clear and complete documentation
3. **Easy to Use**: Intuitive and efficient interface
4. **Maintainable**: Clean and organized code

**Core Principles:**
- Validation 40%: Automated checks ensure baseline quality
- Documentation 25%: Clear docs improve usability
- Usability 20%: Efficient interface maximizes productivity
- Maintainability 15%: Clean code enables long-term maintenance

Following these standards produces professional-grade skills that users can trust and effectively utilize.
