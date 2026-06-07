# Advanced Patterns and Anti-Patterns

## Overview

This guide presents **proven patterns** for effective skill design and **anti-patterns** to avoid. Learn from real-world examples and best practices.

---

## Part 1: Advanced Design Patterns

### Pattern 1: Progressive Disclosure Hierarchy

**Intent:** Minimize initial context load while maintaining deep resource availability

**Structure:**
```
skill/
├── SKILL.md (Layer 1: Quick reference, always loaded)
├── reference.md (Layer 2: Detailed processes, on-demand)
├── examples.md (Layer 2: Usage examples, on-demand)
└── knowledge/ (Layer 3: Deep theory, selective loading)
    ├── fundamentals.md
    ├── advanced.md
    └── expert.md
```

**Implementation:**
```markdown
# SKILL.md - Layer 1
## Quick Start
[2-3 sentences]

## Core Workflow
1. Phase 1 overview
2. Phase 2 overview
3. Phase 3 overview

See `reference.md` for detailed workflows.

## Resources
- reference.md: Detailed procedures and algorithms
- examples.md: 10 real-world usage examples
- knowledge/: Deep-dive theoretical topics

# reference.md - Layer 2
## Phase 1: Detailed Workflow
[Comprehensive step-by-step instructions]
[Algorithm pseudocode]
[Edge case handling]

For theoretical foundation, see `knowledge/fundamentals.md`

# knowledge/fundamentals.md - Layer 3
[Deep theoretical content]
[Research papers]
[Mathematical proofs]
```

**Benefits:**
- Initial load: <5k words (SKILL.md only)
- On-demand detail: 20-50k words available
- Context-efficient: Load only what's needed

**Use When:**
- Skill complexity >0.7
- Rich documentation needed
- Multiple expertise levels

**Real Example:** skill-constructor itself uses this pattern
- SKILL.md: 4.5k words (quick reference)
- reference.md: 12k words (detailed processes)
- knowledge/: 5 files × 3k words (theory)

---

### Pattern 2: Mode-Based Workflows

**Intent:** Single skill handles multiple related operations with distinct workflows

**Structure:**
```python
# Mode detection
mode = detect_mode(user_request, context)

# Dispatch to mode-specific workflow
workflows = {
    "CREATE": create_workflow,
    "REFACTOR": refactor_workflow,
    "IMPROVE": improve_workflow,
    "FIX": fix_workflow
}

workflow = workflows[mode]
workflow.execute()
```

**SKILL.md Organization:**
```markdown
# SKILL.md
## Mode Detection
When to use each mode:
- CREATE: [triggers]
- REFACTOR: [triggers]
- IMPROVE: [triggers]
- FIX: [triggers]

## Quick Reference by Mode
[Decision tree diagram]

See `reference.md` for detailed mode-specific workflows.

# reference.md
## CREATE Mode Workflow
[6 phases detailed]

## REFACTOR Mode Workflow
[6 phases detailed]

## IMPROVE Mode Workflow
[6 phases detailed]

## FIX Mode Workflow
[6 phases detailed]
```

**Benefits:**
- Single skill, multiple purposes
- Clear separation of concerns
- Reduced skill proliferation
- Consistent interface

**Use When:**
- Related operations with different goals
- Shared infrastructure across modes
- Context-dependent behavior needed

**Real Example:** skill-constructor's 4 modes (CREATE/REFACTOR/IMPROVE/FIX)

---

### Pattern 3: Bundled Resource Optimization

**Intent:** Package reusable code/templates/docs to reduce LLM generation

**Structure:**
```
skill/
├── SKILL.md
├── scripts/
│   ├── template_renderer.py (reusable code)
│   ├── validator.py (deterministic checks)
│   └── packager.py (file operations)
├── references/
│   ├── api_schema.json (structured data)
│   ├── best_practices.md (domain knowledge)
│   └── migration_guide.md (procedures)
└── assets/
    ├── template.html (output template)
    ├── style.css (styling)
    └── config.example.yaml (configuration)
```

**Decision Matrix:**

| Resource Type | Bundle When | Generate When |
|--------------|-------------|---------------|
| **Deterministic code** | Formatting, validation, parsing | Business logic with context |
| **Templates** | Standard HTML, CSS, configs | Dynamic content generation |
| **Documentation** | API specs, schemas, standards | Explanations, tutorials |
| **Data structures** | JSON schemas, regexes | Custom data models |

**Implementation:**
```python
# scripts/template_renderer.py
def render_template(template_path, context):
    """Reusable rendering - no need to regenerate"""
    template = load_template(template_path)
    return template.render(context)

# In skill workflow
# GOOD: Use bundled script
output = run_script("scripts/template_renderer.py", context)

# BAD: Ask LLM to generate renderer each time
# "Generate a template renderer that..."
```

**Benefits:**
- Faster execution (no generation time)
- Consistent output (deterministic)
- Token efficient (no generation)
- Version controlled (scripts in git)

**Use When:**
- Operation is deterministic
- Output format is standardized
- Performance matters
- Consistency is critical

**Real Example:** PDF skill bundles:
- `scripts/pdf_merger.py` (deterministic operation)
- `assets/template.html` (standard structure)
- `references/pdf_spec.md` (documentation)

---

### Pattern 4: Complexity-Driven Structure

**Intent:** Structure adapts to skill's inherent complexity

**Decision Algorithm:**
```python
complexity_score = calculate_complexity(skill)

if complexity_score < 0.4:  # Simple
    structure = {
        "SKILL.md": "2-3k words, all content",
        "scripts/": "1-2 scripts",
        "reference.md": False,
        "knowledge/": False
    }

elif complexity_score < 0.7:  # Medium
    structure = {
        "SKILL.md": "3-4k words, high-level",
        "reference.md": "5-10k words, details",
        "examples.md": "3-5k words",
        "scripts/": "3-5 scripts",
        "knowledge/": False
    }

else:  # Complex
    structure = {
        "SKILL.md": "<5k words, compressed",
        "reference.md": "10-20k words, comprehensive",
        "examples.md": "5-10k words, diverse",
        "knowledge/": "5 files, theory",
        "docs/": "5 files, guides",
        "scripts/": "5-7+ scripts, organized"
    }
```

**Benefits:**
- Right structure for the job
- No over-engineering simple skills
- Adequate support for complex skills
- Clear expectations

**Use When:**
- Creating new skills (always assess complexity first)
- Refactoring existing skills
- Planning skill expansion

**Real Example:**
- Simple: image-rotator (score 0.28) → SKILL.md only
- Medium: api-client (score 0.52) → + reference.md + examples.md
- Complex: skill-constructor (score 0.81) → Full hierarchy

---

### Pattern 5: Multi-Turn Refinement

**Intent:** Iteratively improve skill quality through feedback cycles

**Workflow:**
```
Initial Creation (Iteration 0)
    ↓
Validation Check
    ↓
┌─→ [Issues Found?] ─→ Yes ─┐
│       ↓ No                 │
│   Quality Gate Met         │
│       ↓                    │
│   Finalize                 │
│                            ↓
│                    Get Feedback
│                            ↓
│                    Identify Improvements
│                            ↓
│                    Apply Changes (Iteration N+1)
│                            ↓
│                    Re-validate
└────────────────────────────┘
```

**State Tracking:**
```json
{
  "skill_name": "api-client",
  "iteration": 3,
  "history": [
    {
      "iteration": 1,
      "validation_score": 0.65,
      "issues": ["SKILL.md too large", "missing examples"],
      "changes": ["Initial creation"]
    },
    {
      "iteration": 2,
      "validation_score": 0.85,
      "issues": ["description too short"],
      "changes": ["Extracted to reference.md", "Added examples"]
    },
    {
      "iteration": 3,
      "validation_score": 1.0,
      "issues": [],
      "changes": ["Expanded description"]
    }
  ],
  "ready": true
}
```

**Implementation:**
```python
# In skill creation flow
def multi_turn_refinement(skill):
    iteration = 0
    max_iterations = 5

    while iteration < max_iterations:
        validation_result = validate(skill)

        if validation_result.score >= 1.0:
            break  # Quality gate met

        feedback = analyze_issues(validation_result)
        improvements = suggest_improvements(feedback)

        apply_improvements(skill, improvements)
        iteration += 1

    return skill
```

**Benefits:**
- Higher quality output
- Systematic improvement
- Learning from validation
- Traceable evolution

**Use When:**
- Initial skill creation
- Major refactoring
- Quality is critical
- Time allows for iteration

---

### Pattern 6: Skill Composition

**Intent:** Build complex skills from simpler, reusable components

**Architecture:**
```
complex-skill/
├── SKILL.md (orchestrator)
├── components/
│   ├── parser/ (reusable component)
│   │   └── SKILL.md
│   ├── validator/ (reusable component)
│   │   └── SKILL.md
│   └── generator/ (reusable component)
│       └── SKILL.md
└── scripts/
    └── orchestrator.py
```

**SKILL.md Pattern:**
```markdown
# Complex Skill

## Architecture
This skill orchestrates three components:
1. Parser component: Handles input parsing
2. Validator component: Validates parsed data
3. Generator component: Generates output

## Workflow
1. Use parser component to parse input
2. Use validator component to check data
3. Use generator component to create output

See individual component SKILL.md files for details.

## Components
- components/parser/SKILL.md
- components/validator/SKILL.md
- components/generator/SKILL.md
```

**Benefits:**
- Reusable components
- Clear separation of concerns
- Testable in isolation
- Mix and match capabilities

**Use When:**
- Multiple skills share logic
- Complex skill can be decomposed
- Flexibility in composition needed

**Example:** Full-stack generator composed of:
- backend-generator component
- frontend-generator component
- database-schema component
- deployment-config component

---

### Pattern 7: Version Evolution Strategy

**Intent:** Systematic skill evolution with clear migration paths

**Versioning:**
```
v1.0.0 → v1.1.0 → v1.2.0 → v2.0.0
 │         │         │         │
 │         │         │         └─ Breaking: Structure change
 │         │         └─ Minor: Added feature
 │         └─ Minor: Enhanced existing
 └─ Major: Initial release
```

**CHANGELOG Pattern:**
```markdown
# Changelog

## [2.0.0] - 2026-02-12
### Breaking Changes
- Restructured to layered hierarchy
- SKILL.md reduced from 15k to 4.5k words
- Moved detailed content to reference.md

### Migration
1. Backup existing skill
2. Run `migrate_to_v2.py --migrate skill/`
3. Verify with `enhanced_validator.py skill/`

### Added
- reference.md with detailed workflows
- knowledge/ with 5 deep-dive topics
- Advanced validation pipeline

## [1.2.0] - 2026-01-20
### Added
- JSON schema validation support
- New example for schema validation

### Changed
- Improved error messages in scripts

## [1.1.0] - 2026-01-10
### Added
- Support for custom templates
- Template gallery in assets/

## [1.0.0] - 2026-01-01
### Added
- Initial release with core functionality
```

**Benefits:**
- Clear version semantics
- Migration guidance
- Change tracking
- Rollback capability

**Use When:**
- Skill is actively maintained
- Breaking changes planned
- Multiple users depend on skill

---

## Part 2: Anti-Patterns to Avoid

### Anti-Pattern 1: Monolithic SKILL.md

**Problem:**
```
skill/
└── SKILL.md (15,000 words - everything in one file)
```

**Issues:**
- ❌ Slow to load (20+ seconds)
- ❌ Hard to navigate (overwhelming)
- ❌ Poor progressive disclosure
- ❌ High context window usage
- ❌ Difficult to maintain

**Solution: Extract to Reference**
```
skill/
├── SKILL.md (4,500 words - overview)
├── reference.md (8,000 words - details)
└── examples.md (2,500 words - examples)
```

**Load time: 20s → 5s (75% reduction)**

---

### Anti-Pattern 2: No Resource Bundling

**Problem:**
```markdown
# SKILL.md
To convert PDF to text:
1. Install pdftotext
2. Run command: pdftotext input.pdf output.txt
3. Handle errors manually
4. Parse output format

[Asks LLM to generate extraction code each time]
```

**Issues:**
- ❌ Slow (LLM generation each time)
- ❌ Inconsistent (different code each time)
- ❌ Token waste (repeated generation)
- ❌ Error-prone (manual error handling)

**Solution: Bundle Script**
```python
# scripts/pdf_to_text.py
#!/usr/bin/env python3
"""Reliable PDF to text extraction"""

def extract_text(pdf_path):
    """Extract text with error handling"""
    try:
        result = subprocess.run(
            ["pdftotext", pdf_path, "-"],
            capture_output=True,
            check=True
        )
        return result.stdout.decode()
    except subprocess.CalledProcessError as e:
        raise ExtractionError(f"Failed: {e}")
```

```markdown
# SKILL.md
To convert PDF to text:
Run: `python scripts/pdf_to_text.py input.pdf`

[Deterministic, fast, consistent]
```

---

### Anti-Pattern 3: Flat Script Organization

**Problem:**
```
scripts/
├── init.py
├── validate.py
├── generate.py
├── package.py
├── deploy.py
├── test.py
├── helper.py
├── util.py
├── config.py
├── parser.py
├── renderer.py
└── checker.py (12 files in flat structure)
```

**Issues:**
- ❌ Hard to find scripts
- ❌ Unclear relationships
- ❌ Name collisions risk
- ❌ Poor discoverability

**Solution: Organize by Function**
```
scripts/
├── core/
│   ├── generate.py
│   ├── package.py
│   └── deploy.py
├── validation/
│   ├── validate.py
│   ├── checker.py
│   └── test.py
├── utils/
│   ├── helper.py
│   ├── util.py
│   ├── config.py
│   └── parser.py
└── rendering/
    └── renderer.py
```

---

### Anti-Pattern 4: Duplicate Information

**Problem:**
```markdown
# SKILL.md
## Workflow
1. Parse input data
   - Use JSON parser
   - Validate schema
   - Handle errors
2. Transform data...
[500 words of details]

# reference.md
## Detailed Workflow
1. Parse input data
   - Use JSON parser
   - Validate schema
   - Handle errors
2. Transform data...
[Same 500 words repeated]
```

**Issues:**
- ❌ Maintenance burden (update twice)
- ❌ Inconsistency risk (forget one)
- ❌ Token waste (loading twice)
- ❌ Confusion (which is authoritative?)

**Solution: Reference, Don't Duplicate**
```markdown
# SKILL.md
## Workflow
1. Parse input (see reference.md § Data Parsing)
2. Transform data (see reference.md § Transformation)
3. Generate output (see reference.md § Output Generation)

# reference.md
## Data Parsing
[Comprehensive 500-word section]

## Transformation
[Detailed procedures]

## Output Generation
[Complete specifications]
```

---

### Anti-Pattern 5: Vague Descriptions

**Problem:**
```yaml
---
name: data-processor
description: This skill helps with data processing tasks
---
```

**Issues:**
- ❌ Not discoverable (too generic)
- ❌ Unclear when to use
- ❌ No trigger scenarios
- ❌ Missing capabilities

**Solution: Specific, Concrete Description**
```yaml
---
name: csv-data-analyzer
description: >
  Analyzes CSV datasets to generate statistical summaries,
  data quality reports, and visualization recommendations.
  Use when processing tabular data for exploratory analysis.
  Triggers: "analyze CSV", "data quality report", "dataset summary".
  Capabilities: missing value detection, outlier identification,
  correlation analysis, distribution plotting, data profiling.
  Requires: pandas, numpy, matplotlib dependencies.
---
```

**Checklist for Good Descriptions:**
- [ ] WHAT it does (specific capabilities)
- [ ] WHEN to use (trigger scenarios)
- [ ] WHO it's for (target users)
- [ ] KEY features (main capabilities)
- [ ] DEPENDENCIES (if any)
- [ ] 20-250 chars (concise and specific)

---

### Anti-Pattern 6: Over-Engineering Simple Skills

**Problem:**
```
# Simple skill (complexity 0.25) with full complex structure
simple-skill/
├── SKILL.md (2k words - appropriate)
├── reference.md (unnecessary)
├── examples.md (unnecessary)
├── knowledge/ (over-engineering)
│   ├── theory.md
│   ├── advanced.md
│   └── expert.md
├── docs/ (premature)
│   ├── troubleshooting.md
│   └── migration.md
└── scripts/ (good, minimal)
    └── script.py
```

**Issues:**
- ❌ Maintenance overhead
- ❌ Confusing structure
- ❌ Violates YAGNI principle
- ❌ Harder to navigate

**Solution: Match Structure to Complexity**
```
simple-skill/
├── SKILL.md (2k words - all content here)
└── scripts/
    └── script.py
```

**Rule:** Don't create files "for the future"—create them when needed.

---

### Anti-Pattern 7: Ignoring Complexity Signals

**Problem:**
```python
# Complexity score: 0.75 (Complex)
# But using Simple structure

skill/
└── SKILL.md (8k words - trying to fit everything)
```

**Issues:**
- ❌ SKILL.md too large
- ❌ Missing progressive disclosure
- ❌ Poor user experience
- ❌ Fails validation

**Solution: Follow Complexity Recommendations**
```python
# Score 0.75 → Complex structure required

skill/
├── SKILL.md (<5k words)
├── reference.md (details)
├── examples.md (examples)
├── knowledge/ (theory)
└── docs/ (guides)
```

**Rule:** Trust the complexity score—it's based on objective factors.

---

### Anti-Pattern 8: No Examples

**Problem:**
```markdown
# SKILL.md
This skill processes data using advanced algorithms.

## Workflow
1. Input data
2. Process
3. Output results

[No concrete examples anywhere]
```

**Issues:**
- ❌ Users don't understand usage
- ❌ Abstract concepts unclear
- ❌ No validation of understanding
- ❌ Increased support burden

**Solution: Rich Examples**
```markdown
# examples.md

## Example 1: Basic Usage
### Input
```json
{"user": "john", "age": 30}
```

### Expected Output
```json
{"user": "john", "age": 30, "category": "adult"}
```

### Explanation
[Why this output, what happened]

## Example 2: Edge Case
[Another concrete example]

## Example 3: Complex Scenario
[Advanced usage]
```

**Rule:** 1 example per main capability, minimum 3 total.

---

### Anti-Pattern 9: Hardcoded Paths

**Problem:**
```python
# scripts/generate.py
def load_template():
    # Hardcoded absolute path
    with open("/Users/alice/skills/my-skill/assets/template.html") as f:
        return f.mcp_t_read()
```

**Issues:**
- ❌ Breaks on other systems
- ❌ Not portable
- ❌ Installation failures
- ❌ Hard to test

**Solution: Relative Paths**
```python
# scripts/generate.py
from pathlib import Path

def load_template():
    # Relative to script location
    script_dir = Path(__file__).parent
    skill_dir = script_dir.parent
    template_path = skill_dir / "assets" / "template.html"

    with open(template_path) as f:
        return f.mcp_t_read()
```

**Rule:** Always use relative paths or environment variables.

---

### Anti-Pattern 10: Missing Error Handling

**Problem:**
```python
# scripts/process.py
def process_file(path):
    data = json.load(open(path))  # No error handling
    result = transform(data)
    return result
```

**Issues:**
- ❌ Cryptic errors (file not found, invalid JSON)
- ❌ Poor user experience
- ❌ Hard to debug
- ❌ No recovery

**Solution: Graceful Error Handling**
```python
# scripts/process.py
def process_file(path):
    try:
        with open(path) as f:
            data = json.load(f)
    except FileNotFoundError:
        raise ProcessingError(f"File not found: {path}")
    except json.JSONDecodeError as e:
        raise ProcessingError(f"Invalid JSON: {e}")

    try:
        result = transform(data)
    except TransformError as e:
        raise ProcessingError(f"Transformation failed: {e}")

    return result
```

**Rule:** Handle expected errors gracefully, provide helpful messages.

---

## Pattern Selection Guide

**Simple Skill (Score <0.4):**
- ✅ Use: Basic structure (SKILL.md + scripts)
- ✅ Use: Bundled scripts for deterministic ops
- ❌ Avoid: Over-engineering, premature complexity

**Medium Skill (Score 0.4-0.7):**
- ✅ Use: Progressive disclosure (+ reference.md, examples.md)
- ✅ Use: Organized scripts (by function)
- ✅ Use: Rich examples (5+)
- ❌ Avoid: Monolithic SKILL.md, duplicate info

**Complex Skill (Score >0.7):**
- ✅ Use: Full hierarchy (knowledge/, docs/)
- ✅ Use: Mode-based workflows (if applicable)
- ✅ Use: Multi-turn refinement
- ✅ Use: Skill composition (if reusable components)
- ❌ Avoid: Flat structure, ignoring complexity

**All Skills:**
- ✅ Use: Specific descriptions with triggers
- ✅ Use: Error handling in scripts
- ✅ Use: Relative paths
- ✅ Use: Version management
- ❌ Avoid: Vague descriptions, hardcoded paths, no examples

---

## Checklist: Quality Skill Design

**Structure:**
- [ ] Complexity-appropriate file organization
- [ ] Progressive disclosure implemented
- [ ] No duplicate information
- [ ] Clear file naming and placement

**Documentation:**
- [ ] Specific, concrete description (20-250 chars)
- [ ] Trigger scenarios listed
- [ ] 5+ real examples provided
- [ ] SKILL.md <5k words

**Scripts:**
- [ ] Deterministic operations bundled
- [ ] Organized by function (if 8+ scripts)
- [ ] Relative paths used
- [ ] Error handling implemented
- [ ] Executable permissions set

**Versioning:**
- [ ] Semantic versioning used
- [ ] CHANGELOG maintained
- [ ] Migration guides for breaking changes

**Quality:**
- [ ] Multi-turn refinement applied
- [ ] Validation passes (score 1.0)
- [ ] All examples work
- [ ] No anti-patterns present

---

**Remember:** Patterns are guidelines, not rules. Use judgment based on your specific context and requirements.
