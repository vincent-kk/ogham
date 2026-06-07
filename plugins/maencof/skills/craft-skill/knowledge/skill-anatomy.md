# Skill Anatomy - Structural Theory

## Core Principles of Effective Skills

An effective skill goes beyond simply performing tasks—it functions as a reusable, maintainable knowledge module.

### Fundamental Design Principles

#### 1. Modularity
Skills should be self-contained functional units.
- **Independent Execution**: Minimize external dependencies
- **Clear Boundaries**: Apply single responsibility principle
- **Reusable**: Applicable across various contexts

#### 2. Progressive Disclosure
Organize information in a 3-layer hierarchy to maximize context efficiency:
- **Layer 1 (Metadata)**: Skill discovery and matching (~100 words)
- **Layer 2 (SKILL.md)**: Execution guide (<5k words)
- **Layer 3 (Deep Resources)**: Detailed documentation and resources (unlimited)

#### 3. Actionability
Provide procedural knowledge for immediate execution:
- **Imperative Style**: Use "To do X, ..." format
- **Specific Steps**: Clear, unambiguous instructions
- **Example-Driven**: Explain through real use cases

#### 4. Maintainability
Enable easy updates and extensions through clear structure:
- **Logical Organization**: Separate files by function
- **Version Control**: Apply semantic versioning
- **Documentation**: Track changes (CHANGELOG.md)

---

## Anatomical Components of a Skill

### 1. Metadata (YAML Frontmatter)

Defines skill identity and discoverability.

**Example:**
```yaml
---
name: skill-name
description: >
  Use this skill when you need to [specific trigger].
  It provides [specific capabilities] by [method].
  Typical scenarios: [examples].
user-invocable: true
allowed-tools: "Bash,Read,Write"
---
```

#### Field Reference

**Identity Fields (recommended):**

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | No | directory name | Skill display name. Lowercase, digits, hyphens only. Max 64 characters. |
| `description` | Recommended | — | What the skill does and when to trigger it. Claude uses this to decide auto-activation. Descriptions over 250 characters are auto-truncated in the skill list. |

**Visibility & Invocation Fields:**

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `user-invocable` | No | `true` | Whether the skill appears in the `/` menu. Set to `false` for background knowledge skills that users should not invoke directly. |
| `disable-model-invocation` | No | `false` | When `true`, prevents Claude from auto-loading this skill. Use for manual-only workflows that should only trigger via `/name`. |
| `argument-hint` | No | — | Hint shown during autocomplete to indicate expected arguments. Example: `"[issue-number]"`, `"[filename] [format]"`. |

**Execution Control Fields:**

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `allowed-tools` | No | — | Comma-separated list of tools Claude can use without permission prompt when this skill is active. Example: `"Bash,Read,Write"`. |
| `model` | No | session model | Model override when this skill is active. Example: `sonnet`, `opus`, `haiku`. |
| `effort` | No | session effort | Effort level override. Options: `low`, `medium`, `high`, `max` (max is Opus 4.6 only). |
| `shell` | No | `bash` | Shell for inline `!command` blocks. Options: `bash`, `powershell`. PowerShell requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`. |

**Context & Delegation Fields:**

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `context` | No | — | Set to `fork` to run the skill in a forked subagent context with isolated conversation. |
| `agent` | No | — | Subagent type to use when `context: fork` is set. |

**Scope & Filtering Fields:**

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `paths` | No | — | Glob patterns to restrict when Claude auto-activates this skill. Comma-separated string or YAML list. When set, skill only auto-loads when working with files matching the patterns. Example: `"src/**/*.ts,lib/**"`. |

**Lifecycle Fields:**

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `hooks` | No | — | Lifecycle hooks scoped to this skill. Same structure as settings.json hooks but only active when the skill is loaded. See [Hooks in skills and agents](https://docs.anthropic.com/en/docs/hooks#hooks-in-skills-and-agents). |

**String Substitutions (available in skill body):**

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking the skill |
| `$ARGUMENTS[N]` | Access specific argument by 0-based index |
| `$N` | Shorthand for `$ARGUMENTS[N]` (e.g., `$0`, `$1`) |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Directory containing the skill's SKILL.md file |

**Naming Rules:**
- ✅ **Correct**: `pdf-generator`, `api-client-builder`, `test-runner`
- ❌ **Wrong**: `PDFGenerator`, `api_client`, `Test Runner`, `skill-name-`

**Description Guidelines:**
- **Specificity**: "helps with tasks" → "generates PDF reports from Markdown with custom templates"
- **Trigger Scenarios**: "Use when converting documentation to printable format"
- **Length**: 20-250 characters recommended (>250 auto-truncated in skill list)
- **Forbidden Characters**: No angle brackets (`<`, `>`)

---

### 2. Core Instructions (SKILL.md Body)

The core content providing procedural workflows.

**Standard Structure:**
```markdown
# Skill Name

## Quick Start
[2-3 sentence overview]

## When to Use This Skill
[Specific trigger scenarios - bullet points]
- When converting Markdown to PDF with custom styling
- When batch processing multiple documents
- When generating reports with consistent formatting

## Core Workflow
[High-level process - details in reference.md]

**Phase 1: Input Preparation**
- Gather Markdown files
- Define styling requirements
- See reference.md for detailed styling options

**Phase 2: Generation**
- Execute scripts/generate_pdf.py
- Review output
- See reference.md for troubleshooting

**Phase 3: Validation**
- Check formatting
- Verify content integrity

## Resources
### reference.md
Detailed workflows, styling options, troubleshooting guide.

### examples.md
5 real-world examples covering common use cases.

### scripts/
- generate.py: Main generation script
- validate.py: Input validation

## Quick Reference
[Cheat sheet for common operations]
```

**Size Limits:**
- Simple skills: 2-3k words
- Medium skills: 3-4k words
- Complex skills: 4-5k words (compressed, with references)

**Actions When Exceeding 5k Words:**
1. Move detailed workflows → reference.md
2. Extract inline examples → examples.md
3. Separate theoretical background → knowledge/
4. Move advanced features → docs/

---

### 3. Bundled Resources

Bundle executable code and reference materials.

#### scripts/ - Executable Code

**When to Include Scripts:**
- Deterministic operations (PDF manipulation, image processing)
- Repetitive code patterns (API clients, data parsing)
- Performance-critical tasks (faster than LLM generation)

**Design Principles:**
- **Single Responsibility**: Each script has one clear function
- **Clear Interfaces**: CLI arguments, return codes
- **Executable Permissions**: Apply `chmod +x`
- **Error Handling**: Proper exception handling and user feedback

**Example Structure:**
```python
#!/usr/bin/env python3
"""
PDF Generator - Convert Markdown to styled PDF

Usage:
    generate_pdf.py <input.md> [--style <style.css>] [--output <output.pdf>]

Exit Codes:
    0: Success
    1: Input file not found
    2: Conversion failed
"""

import argparse
import sys
from pathlib import Path

def generate_pdf(input_path: Path, style: Path, output: Path) -> int:
    """Generate PDF from Markdown with custom styling"""
    try:
        # Implementation
        return 0
    except FileNotFoundError:
        print(f"Error: {input_path} not found", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Conversion failed: {e}", file=sys.stderr)
        return 2

def main():
    parser = argparse.ArgumentParser(description="Convert Markdown to PDF")
    parser.add_argument("input", help="Input Markdown file")
    parser.add_argument("--style", help="Custom CSS stylesheet")
    parser.add_argument("--output", help="Output PDF path")
    args = parser.parse_args()

    sys.exit(generate_pdf(Path(args.input), args.style, args.output))

if __name__ == "__main__":
    main()
```

#### references/ - Documentation

**When to Include References:**
- API documentation
- Database schemas
- Domain knowledge
- Detailed procedures

**Design Principles:**
- **Grep-Friendly**: Clear structure for large files
- **Clear Headings**: Hierarchical TOC
- **Example-Driven**: Concrete examples over explanations
- **Version Information**: Specify framework/library versions

#### assets/ - Output Resources

**When to Include Assets:**
- Templates (PowerPoint, HTML boilerplate)
- Brand resources (logos, fonts)
- Sample data
- Configuration files

**Design Principles:**
- **Ready-to-Use**: Minimal modification needed
- **Clear Structure**: Logical directory organization
- **Naming Conventions**: Consistent file names
- **Usage Documentation**: Explain each resource

---

## Design Patterns

### Pattern 1: Simple Execution Skill

**Characteristics:**
- Complexity < 0.4
- SKILL.md sufficient
- 1-2 scripts

**Example:**
```
image-rotator/
├── SKILL.md (2.5k words)
└── scripts/
    ├── rotate.py
    └── flip.py
```

**Use Cases:**
- Image manipulation tools
- File format converters
- Simple data processing

---

### Pattern 2: Layered Documentation Skill

**Characteristics:**
- Complexity 0.4-0.7
- SKILL.md + reference.md + examples.md
- 3-5 scripts

**Example:**
```
api-client-builder/
├── SKILL.md (3.5k words)
├── reference.md (7k words)
├── examples.md (2.5k words)
└── scripts/
    ├── discover_api.py
    ├── generate_client.py
    ├── test_client.py
    └── deploy.py
```

**Use Cases:**
- API client generation
- Code generators
- Test frameworks

---

### Pattern 3: Enterprise Skill

**Characteristics:**
- Complexity > 0.7
- Full hierarchy
- 5-7+ scripts
- MCP integration

**Example:**
```
full-stack-generator/
├── SKILL.md (4.5k words, compressed)
├── reference.md (10k words)
├── examples.md (4k words)
├── knowledge/
│   ├── architecture-patterns.md
│   ├── security-best-practices.md
│   └── deployment-strategies.md
├── scripts/
│   ├── analyze_requirements.py
│   ├── generate_backend.py
│   ├── generate_frontend.py
│   ├── setup_database.py
│   ├── run_tests.py
│   └── deploy.py
└── docs/
    ├── migration-guide.md
    ├── troubleshooting.md
    └── advanced-patterns.md
```

**Use Cases:**
- Full-stack app generation
- Microservices architecture building
- Complex workflow automation

---

## Anti-Patterns (What to Avoid)

### ❌ Anti-Pattern 1: Monolithic SKILL.md

**Problem:**
```
skill/
└── SKILL.md (15k words - too large!)
```

**Symptoms:**
- Loading time 20+ seconds
- Context window waste
- Hard to find information

**Solution:**
```
skill/
├── SKILL.md (4k words - high-level index)
├── reference.md (8k words - detailed content)
└── examples.md (3k words - concrete examples)
```

---

### ❌ Anti-Pattern 2: Duplicate Information

**Problem:**
- Same content repeated in SKILL.md and reference.md
- Must update both during maintenance

**Solution:**
- SKILL.md = High-level overview + references to reference.md
- reference.md = Detailed implementation content

**Correct Separation:**
```markdown
# SKILL.md
## Workflow
**Phase 1: Analysis**
Analyze input requirements and constraints.
See reference.md Section 2.1 for detailed analysis algorithms.

# reference.md
## 2.1 Detailed Analysis Algorithms
### Complexity Evaluation
[Detailed algorithms, formulas, examples]
```

---

### ❌ Anti-Pattern 3: Disorganized Scripts

**Problem:**
```
scripts/
├── script1.py
├── script2.py
├── script3.py
... (10+ files, flat structure)
```

**Solution:**
```
scripts/
├── validation/
│   ├── check_input.py
│   └── validate_output.py
├── generation/
│   ├── generate_code.py
│   └── generate_docs.py
└── deployment/
    ├── package.py
    └── deploy.py
```

---

### ❌ Anti-Pattern 4: Missing Examples

**Problem:**
- Only theoretical explanations
- Users struggle to understand practical application

**Solution:**
- Always include examples.md (complexity >= 0.4)
- Provide 5-10 real scenarios
- Include code + explanation + output

---

### ❌ Anti-Pattern 5: Vague Description

**Problem:**
```yaml
description: This skill helps with tasks
```

**Solution:**
```yaml
description: >
  Use this skill when converting Markdown documentation to styled PDF reports.
  It provides template-based PDF generation with custom CSS styling,
  table of contents generation, and syntax highlighting for code blocks.
  Typical scenarios: Technical documentation, project reports, user manuals.
  Triggers: "convert to PDF", "generate PDF report", "create printable docs"
```

---

## Quality Checklist

Verify anatomical structure is correct:

✅ **Metadata Quality**
- [ ] Name follows hyphen-case rules
- [ ] Description with specific triggers (20-250 chars)
- [ ] Version follows semantic versioning
- [ ] Complexity matches actual complexity

✅ **SKILL.md Structure**
- [ ] Quick Start section exists
- [ ] When to Use section has specific scenarios
- [ ] Core Workflow is clear and step-by-step
- [ ] Resources section indexes all resources
- [ ] Size limit adhered to (<5k words)

✅ **Bundled Resources**
- [ ] scripts/ has executable scripts
- [ ] Scripts have execute permissions (chmod +x)
- [ ] Scripts have docstrings and usage
- [ ] references/ logically organized
- [ ] assets/ ready-to-use

✅ **Progressive Disclosure**
- [ ] Layer 1 (Metadata): Discoverable
- [ ] Layer 2 (SKILL.md): Execution guide
- [ ] Layer 3 (Deep): Detailed content separated

✅ **No Anti-Patterns**
- [ ] SKILL.md size appropriate (< 5k)
- [ ] No duplicate information
- [ ] Scripts organized
- [ ] Examples sufficient
- [ ] Description specific

---

## Conclusion

Effective skill anatomy ensures:

1. **Efficiency**: Progressive disclosure saves context window
2. **Discoverability**: Clear metadata and description
3. **Actionability**: Concrete workflows and scripts
4. **Maintainability**: Logical structure and documentation
5. **Scalability**: Structure evolves with complexity

Following these principles creates high-quality skills that users can easily understand and effectively utilize.
