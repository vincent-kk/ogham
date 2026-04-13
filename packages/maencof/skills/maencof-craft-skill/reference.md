# Skill Constructor Reference

Comprehensive reference documentation including detailed processes, algorithms, and decision trees.

---

## Table of Contents

1. [Mode Workflows](#1-mode-workflows)
   - 1.1 [CREATE Mode](#11-create-mode)
   - 1.2 [REFACTOR Mode](#12-refactor-mode)
   - 1.3 [IMPROVE Mode](#13-improve-mode)
   - 1.4 [FIX Mode](#14-fix-mode)
2. [Complexity Evaluation](#2-complexity-evaluation)
   - 2.1 [Formula & Scoring](#21-formula--scoring)
   - 2.2 [Examples](#22-examples)
   - 2.3 [Threshold Behavior](#23-threshold-behavior)
3. [Validation System](#3-validation-system)
   - 3.1 [15-Point Checklist](#31-15-point-checklist)
   - 3.2 [Error Handling](#32-error-handling)
   - 3.3 [Recovery Strategies](#33-recovery-strategies)
4. [Advanced Features](#4-advanced-features)
   - 4.1 [Multi-turn Refinement](#41-multi-turn-refinement)
   - 4.2 [Version Management](#42-version-management)
   - 4.3 [Diff-based Refactoring](#43-diff-based-refactoring)
   - 4.4 [Impact Analysis](#44-impact-analysis)
   - 4.5 [Automated Deprecation](#45-automated-deprecation)
5. [Best Practices](#5-best-practices)
   - 5.1 [Progressive Disclosure](#51-progressive-disclosure)
   - 5.2 [Resource Organization](#52-resource-organization)
   - 5.3 [Documentation Quality](#53-documentation-quality)

---

## 1. Mode Workflows

### 1.1 CREATE Mode

Workflow for creating new skills from scratch.

#### Phase 0: Mode Detection

**Purpose:** Detect CREATE mode from user request

**Input:**
- User request text
- Existing skill presence flag

**Decision Logic:**
```
Input: user_request, existing_skill

IF existing_skill == False THEN
    RETURN Mode.CREATE (confidence: 1.0)

keywords = extract_keywords(user_request)

IF "create" IN keywords OR "new skill" IN keywords OR "build" IN keywords THEN
    RETURN Mode.CREATE (confidence: 0.9)

IF "initialize" IN keywords OR "start" IN keywords THEN
    RETURN Mode.CREATE (confidence: 0.8)

IF no_clear_keywords AND existing_skill == False THEN
    RETURN Mode.CREATE (confidence: 0.5, default)

ELSE
    RETURN other_mode
```

**Output:**
- Mode: CREATE
- Confidence: 0.5-1.0
- Reasoning: Rationale for mode decision

#### Phase 1: Requirements Discovery

**Purpose:** Discover requirements through concrete usage examples

**Step 1.1: Understand Concrete Examples**

Question patterns:
1. "What should this skill do? Provide 3-5 examples."
2. "In what situations should this skill be triggered?"
3. "What would a user say that should trigger this skill?"

Example collection criteria:
- Minimum 3 concrete examples
- Each example includes clear input/output
- Cover diverse usage scenarios

**Step 1.2: Analyze Reusable Resources**

For each example:
```
FOR EACH example IN collected_examples:
    analyze_workflow(example)

    # Evaluate scripts need
    IF repetitive_code_pattern THEN
        identify_script_candidate(pattern)

    IF deterministic_reliability_needed THEN
        identify_script_candidate(task)

    # Evaluate references need
    IF domain_knowledge_required THEN
        identify_reference_candidate(knowledge)

    IF schema_or_api_docs_needed THEN
        identify_reference_candidate(documentation)

    # Evaluate assets need
    IF template_or_boilerplate_needed THEN
        identify_asset_candidate(template)

    IF output_resources_needed THEN
        identify_asset_candidate(resource)
```

**Output:**
- Requirements document
- Resource planning list:
  - scripts/: [script1.py, script2.sh, ...]
  - references/: [doc1.md, schema.md, ...]
  - assets/: [template.html, logo.png, ...]

#### Phase 2: Complexity Evaluation

**Purpose:** Evaluate complexity and determine structure

**Input:** Phase 1 requirements document

**Evaluation Process:**
```python
# 1. Component counting
file_count = len(scripts) + len(references) + len(assets)
mcp_integration = detect_mcp_needs(requirements)
workflow_steps = count_workflow_steps(requirements)
conditionals = count_decision_points(requirements)
external_deps = count_dependencies(requirements)

# 2. Calculate complexity score
file_score = min(file_count / 20, 1.0)
mcp_score = 1.0 if mcp_integration else 0.0
workflow_score = min(workflow_steps / 10, 1.0)
conditional_score = min(conditionals / 15, 1.0)
deps_score = min(external_deps / 5, 1.0)

complexity = (
    file_score * 0.3 +
    mcp_score * 0.2 +
    workflow_score * 0.1 +
    conditional_score * 0.15 +
    deps_score * 0.25
)

# 3. Determine category
IF complexity < 0.4 THEN
    category = "simple"
ELIF complexity < 0.7 THEN
    category = "medium"
ELSE
    category = "complex"
```

**Output:**
- Complexity score: 0.0-1.0+
- Category: simple | medium | complex
- Structure recommendation

#### Phase 3: Structure Generation

**Purpose:** Generate directory structure based on complexity

**Simple (score < 0.4):**
```
skill-name/
├── SKILL.md (2-3k words target)
└── scripts/ (1-2 files)
    └── example.py
```

**Medium (score 0.4-0.7):**
```
skill-name/
├── SKILL.md (3-4k words target)
├── reference.md
├── examples.md
└── scripts/ (3-5 files)
    ├── script1.py
    ├── script2.py
    └── script3.sh
```

**Complex (score > 0.7):**
```
skill-name/
├── SKILL.md (4-5k words, compressed)
├── reference.md
├── examples.md
├── knowledge/
│   ├── skill-anatomy.md
│   ├── progressive-disclosure.md
│   ├── mcp-integration.md
│   ├── bundled-resources.md
│   └── quality-standards.md
├── scripts/ (5-7+ files)
│   ├── init.py
│   ├── validator.py
│   └── ...
└── docs/
    ├── migration-guide.md
    ├── troubleshooting.md
    └── ...
```

**Execute:** `scripts/structure_generator.mjs --name <skill-name> --complexity <category> --path <output>`

#### Phase 4: Implementation

**Purpose:** Write skill content

**Step 4.1: Create Bundled Resources**

Scripts:
```python
# For each script:
# 1. Write executable code
# 2. Add shebang (#!/usr/bin/env python3)
# 3. Document usage with docstring
# 4. Set execute permissions (chmod +x)
# 5. Request user input if needed
```

References:
```markdown
# For each reference document:
# 1. Clear heading structure (##, ###)
# 2. Include searchable keywords
# 3. Provide concrete examples
# 4. Specify version information (if applicable)
```

Assets:
```
# For each asset:
# 1. Ready-to-use format
# 2. Clear file naming
# 3. Document usage (in SKILL.md or reference.md)
```

**Step 4.2: Write SKILL.md**

**Step 4.2.1: Determine `argument-hint`**

Before writing frontmatter, analyze whether the skill accepts arguments or flags:

```
IF skill uses $ARGUMENTS, $0, $1, or $ARGUMENTS[N] in body THEN
    argument-hint IS REQUIRED
ELSE IF skill supports subcommands, modes, or run-IDs THEN
    argument-hint IS REQUIRED
ELSE
    argument-hint MAY BE OMITTED
END IF
```

Compose the hint string using these conventions:

| Notation | Meaning | Example |
|----------|---------|---------|
| `<value>` | Required positional argument | `<issue-number>` |
| `[value]` | Optional positional argument | `[filename]` |
| `value1 \| value2` | Mutually exclusive choices | `list \| status` |
| `--flag` | Optional flag | `--verbose` |
| Combined | Mix as needed | `[list \| <run-id> \| resume <run-id>]` |

Examples:
```yaml
# Single required argument
argument-hint: "<issue-number>"

# Optional argument with format
argument-hint: "[filename] [format]"

# Subcommand pattern with alternatives
argument-hint: "[list | <run-id> | resume <run-id>]"

# Flag-based
argument-hint: "<path> [--strict] [--fix]"
```

Structure:
```markdown
---
name: skill-name
description: [specific trigger scenarios, 20-250 chars]
argument-hint: [compose from Step 4.2.1 if applicable]
---

# Skill Name

## Quick Start
[2-3 sentence overview]

## When to Use This Skill
[Specific trigger scenarios - bulleted list]

## Core Workflow
[2-7 steps based on complexity]
[Medium/Complex: include reference.md links]

## Resources
### scripts/
[Description of available scripts]

### references/ (Medium/Complex)
[Description of reference documents]

### knowledge/ (Complex only)
[Description of deep-dive topics]

## Quick Reference
[Cheat sheet for common operations]
```

Size constraints:
- Simple: 2-3k words
- Medium: 3-4k words
- Complex: 4-5k words (compressed, with reference links)

**Step 4.3: Write Supporting Docs**

Medium/Complex only:

reference.md:
```markdown
# Detailed Reference for [Skill Name]

## Workflow Details
[Phase-by-phase detailed explanation]

## Algorithms
[Detailed implementation logic]

## API Reference (if applicable)
[Programmatic interfaces]
```

examples.md:
```markdown
# Examples

## Example 1: [Use Case]
### Requirements
### Execution
### Output

## Example 2: ...
[5-10 real-world examples]
```

Complex only:

knowledge/*:
- skill-anatomy.md
- progressive-disclosure.md
- mcp-integration.md
- bundled-resources.md
- quality-standards.md

docs/*:
- migration-guide.md
- troubleshooting.md
- advanced-patterns.md

**Output:** Complete skill implementation

#### Phase 5: Automated Validation

**Purpose:** Ensure quality through automated validation

**Execute:** `scripts/enhanced_validator.mjs <skill-directory> [--strict]`

**Validation Items (16 checks):**

1. ✅ YAML frontmatter starts with `---`
2. ✅ `name:` field exists
3. ✅ `description:` field exists
4. ✅ Name is hyphen-case format
5. ✅ Name matches directory name
6. ✅ Description is 20+ chars and <=250 chars
7. ✅ No angle brackets in description
8. ✅ `argument-hint` present if skill uses `$ARGUMENTS`/`$0`/`$1`
9. ✅ SKILL.md size <5k words
10. ✅ scripts/ directory exists (or justified absence)
11. ✅ Scripts have execute permissions (chmod +x)
12. ✅ Referenced files actually exist
13. ✅ Proper directory hierarchy
14. ✅ No TODOs in production files
15. ✅ Example completeness
16. ✅ Cross-reference validity

**Result Handling:**
```
IF validation_passed THEN
    PROCEED to Phase 6
ELSE
    REPORT errors
    ITERATE Phase 4 (fix issues)
    RETRY Phase 5
```

#### Phase 6: Intelligent Deployment

**Purpose:** Create deployable package

**Execute:** `scripts/deployment_helper.mjs --analyze <skill-path>`

**Tasks:**
1. **Packaging:** `scripts/package_skill.mjs <skill-path>`
   - Create skill-name.zip
   - Maintain directory structure
   - Include .skill-metadata.json

2. **Generate Installation Guide:**
   - Auto-generate INSTALL.md
   - List dependencies
   - Installation steps
   - Validation method

3. **Suggest Deployment Location:**
   - `~/.claude/skills/`
   - Check version conflicts
   - Check dependencies

4. **Version Metadata:**
   ```json
   {
     "name": "skill-name",
     "version": "1.0.0",
     "complexity": "medium",
     "packaged": "2026-02-12T14:30:00Z",
     "checksum": "sha256:abc123..."
   }
   ```

**Output:** Deployable package + installation documentation

---

### 1.2 REFACTOR Mode

Workflow for improving existing skill structure while preserving functionality.

#### Phase 0: Mode Detection

**Trigger Keywords:**
- "refactor"
- "restructure"
- "reorganize"
- "clean up structure"

**Decision:**
```
IF "refactor" IN keywords OR "restructure" IN keywords THEN
    RETURN Mode.REFACTOR (confidence: 0.95)

IF "reorganize" IN keywords AND existing_skill == True THEN
    RETURN Mode.REFACTOR (confidence: 0.85)

IF skill_md_size > 5000_words THEN
    SUGGEST Mode.REFACTOR
```

#### Phase 1: Current Structure Analysis

**Purpose:** Evaluate current structure and identify issues

**Analysis Items:**
```python
# 1. Read files
skill_md = read_file("SKILL.md")
existing_files = list_all_files(skill_path)

# 2. Evaluate current complexity
current_complexity = calculate_complexity_from_existing(skill_path)

# 3. Identify structural issues
issues = []

# Check SKILL.md size
word_count = len(skill_md.split())
if word_count > 5000:
    issues.append({
        "type": "oversized_skill_md",
        "severity": "high",
        "current": f"{word_count} words",
        "recommendation": "Extract to reference.md"
    })

# Check layer separation
if not exists("reference.md") and word_count > 3000:
    issues.append({
        "type": "missing_layer_separation",
        "severity": "medium",
        "recommendation": "Create reference.md for detailed workflows"
    })

# Check resource organization
if len(list_files("scripts/")) > 7:
    issues.append({
        "type": "unorganized_scripts",
        "severity": "medium",
        "recommendation": "Organize scripts/ into subdirectories"
    })

# Check documentation
if not exists("examples.md") and complexity > 0.4:
    issues.append({
        "type": "missing_examples",
        "severity": "low",
        "recommendation": "Create examples.md"
    })
```

**Output:** Refactoring assessment report

#### Phase 2: Refactoring Plan

**Purpose:** Generate transformation plan and get user approval

**Plan Generation:**
```python
plan = {
    "files_to_create": [],
    "files_to_modify": [],
    "files_to_move": [],
    "files_to_delete": [],
    "content_extractions": []
}

# Resolve SKILL.md size issue
if "oversized_skill_md" in issues:
    # Extract detailed workflows
    workflow_content = extract_sections(skill_md, ["Workflow", "Process", "Steps"])
    plan["files_to_create"].append({
        "file": "reference.md",
        "content_source": "SKILL.md sections 45-320",
        "estimated_size": f"{len(workflow_content.split())} words"
    })

    # Extract examples
    examples_content = extract_sections(skill_md, ["Examples", "Usage"])
    if len(examples_content.split()) > 500:
        plan["files_to_create"].append({
            "file": "examples.md",
            "content_source": "SKILL.md sections 350-480",
            "estimated_size": f"{len(examples_content.split())} words"
        })

    # Modify SKILL.md
    plan["files_to_modify"].append({
        "file": "SKILL.md",
        "actions": [
            "Remove detailed workflows → Move to reference.md",
            "Remove examples → Move to examples.md",
            "Add resource index section",
            f"Target size: ~4000 words (from {word_count})"
        ]
    })

# Organize scripts
if "unorganized_scripts" in issues:
    scripts = list_files("scripts/")
    categorized = categorize_scripts(scripts)

    for category, script_list in categorized.items():
        if len(script_list) > 2:
            plan["files_to_move"].extend([
                f"scripts/{script} → scripts/{category}/{script}"
                for script in script_list
            ])
```

**Diff Preview Generation:**
```diff
Refactoring Plan for skill: api-client-builder
================================================

Files to CREATE:
+ reference.md (8,245 words from SKILL.md extraction)
+ examples.md (3,120 words)

Files to MODIFY:
M SKILL.md
  - Remove lines 45-320 (workflow details) → reference.md
  - Remove lines 350-480 (examples) → examples.md
  - Add resource index section
  - Target: 4,200 words (was 12,500)

Files to MOVE:
scripts/validator.py → scripts/validation/validator.py
scripts/generator.py → scripts/generation/generator.py

Files to DELETE:
- scripts/deprecated_init.py (no longer used)

Impact Analysis:
- SKILL.md: 12,500 → 4,200 words (66% reduction) ✅
- Progressive disclosure: Improved ✅
- Backward compatibility: Maintained ✅
- Script functionality: Preserved ✅

Approve? (yes/no):
```

**User Approval:**
```
DISPLAY diff_preview
REQUEST user_approval

IF user_approval == "yes" THEN
    PROCEED to Phase 3
ELIF user_approval == "no" THEN
    REQUEST feedback
    REVISE plan
    RETRY Phase 2
ELSE
    ASK clarification
```

**Output:** Approved refactoring plan

#### Phase 3: Diff-based Transformation

**Purpose:** Execute safe transformation

**Backup Creation:**
```bash
# Create backup for rollback
cp -r skill-path skill-path.backup-$(date +%Y%m%d-%H%M%S)
```

**Transformation Execution:**
```python
for action in plan["files_to_create"]:
    content = extract_content(action["content_source"])
    write_file(action["file"], content)

for action in plan["files_to_modify"]:
    current = read_file(action["file"])
    modified = apply_modifications(current, action["actions"])
    write_file(action["file"], modified)

for action in plan["files_to_move"]:
    source, dest = parse_move_action(action)
    ensure_directory(dirname(dest))
    move_file(source, dest)

for action in plan["files_to_delete"]:
    delete_file(action["file"])

# Update cross-references
update_all_references(skill_path)
```

**Preservation Validation:**
```python
# Verify functionality preservation
assert_functionality_preserved(original_skill, refactored_skill)
assert_scripts_executable(refactored_skill)
assert_backward_compatible(original_skill, refactored_skill)
```

**Output:** Refactored skill structure

#### Phase 4: Validation & Testing

**Validation:**
```bash
# 1. Automated validation
scripts/enhanced_validator.mjs refactored-skill-path --strict

# 2. Script executability
for script in scripts/*; do
    test -x "$script" || echo "NOT EXECUTABLE: $script"
done

# 3. Resource reference validity
check_all_references(skill_path)

# 4. Backward compatibility
test_backward_compatibility(original_skill, refactored_skill)
```

**Output:** Validation report

#### Phase 5: Impact Analysis

**Metrics Collection:**
```python
metrics = {
    # Size metrics
    "skill_md_size_before": 12500,
    "skill_md_size_after": 4200,
    "size_reduction_percent": 66.4,

    # Organization metrics
    "files_before": 5,
    "files_after": 9,
    "directory_depth_before": 2,
    "directory_depth_after": 3,

    # Quality metrics
    "validation_score_before": 0.65,
    "validation_score_after": 1.0,
    "maintainability_before": 0.70,
    "maintainability_after": 0.92,

    # UX metrics
    "load_time_before": 15.0,  # seconds
    "load_time_after": 5.0,
    "discoverability_score": 0.85
}
```

**Report Generation:**
```markdown
# Impact Analysis Report

## Summary
Refactoring from monolithic to layered structure.

## Size Impact
- SKILL.md: 12,500 → 4,200 words (📉 66% reduction)
- Progressive disclosure gain: 8,300 words deferred

## Quality Impact
- Validation: 0.65 → 1.0 (✅ 54% improvement)
- Maintainability: 0.70 → 0.92 (✅ 31% improvement)

## UX Impact
- Load time: ~15s → ~5s (⚡ 67% faster)
- Discoverability: 0.60 → 0.85 (✅ Better organization)

## Recommendation
✅ APPROVE - Significant improvements
```

**Output:** Impact analysis report

#### Phase 6: Deployment

**Tasks:**
1. Create migration guide
2. Package refactored skill
3. Provide rollback instructions

**Output:** Refactored package + migration documentation

---

### 1.3 IMPROVE Mode

Workflow for feature enhancement and expansion.

#### Phase 0: Mode Detection

**Triggers:**
- "improve"
- "add feature"
- "enhance"
- "extend"
- "upgrade"

#### Phase 1: Enhancement Analysis

**Analysis:**
```python
# 1. Understand enhancement request
enhancement_request = parse_user_request()

# 2. Analyze existing features
existing_features = analyze_skill(skill_path)

# 3. Identify extension points
extension_points = identify_extension_points(existing_features)

# 4. Evaluate complexity change
current_complexity = calculate_complexity(skill_path)
projected_complexity = estimate_new_complexity(
    current_complexity,
    enhancement_request
)

# 5. Determine if structure adjustment needed
structure_adjustment_needed = (
    categorize(projected_complexity) != categorize(current_complexity)
)
```

**Output:** Enhancement plan

#### Phase 2: Feature Planning

**Design:**
```python
feature_spec = {
    "new_scripts": [],
    "new_references": [],
    "new_assets": [],
    "skill_md_updates": [],
    "breaking_changes": False
}

# Scripts need
if requires_new_automation(enhancement_request):
    feature_spec["new_scripts"].append({
        "name": "new_feature.py",
        "purpose": "...",
        "dependencies": [...]
    })

# SKILL.md updates
if affects_workflow(enhancement_request):
    feature_spec["skill_md_updates"].append({
        "section": "Core Workflow",
        "change": "Add step for new feature"
    })

    # Size check
    if projected_skill_md_size > 5000:
        feature_spec["skill_md_updates"].append({
            "section": "Overflow content",
            "change": "Move to reference.md"
        })

# Backward compatibility
feature_spec["breaking_changes"] = check_breaking_changes(enhancement_request)
```

**Output:** Feature specification

#### Phase 3: Incremental Implementation

**Implementation:**
```python
# 1. Add new resources
for script in feature_spec["new_scripts"]:
    implement_script(script)
    set_executable(script)

for ref in feature_spec["new_references"]:
    write_reference(ref)

for asset in feature_spec["new_assets"]:
    add_asset(asset)

# 2. Update SKILL.md
skill_md = read_file("SKILL.md")

for update in feature_spec["skill_md_updates"]:
    skill_md = apply_update(skill_md, update)

# Size check
if len(skill_md.split()) > 5000:
    overflow = extract_overflow_content(skill_md)
    append_to_file("reference.md", overflow)
    skill_md = remove_overflow(skill_md)

write_file("SKILL.md", skill_md)

# 3. Update version
update_version(skill_path, increment="minor")
```

**Output:** Enhanced skill

#### Phase 4: Integration Validation

**Testing:**
```python
# 1. Test new features
test_new_features(feature_spec)

# 2. Regression test existing features
test_existing_features(skill_path)

# 3. Validate documentation
validate_documentation(skill_path)

# 4. Check complexity
new_complexity = calculate_complexity(skill_path)
if jumped_category(current_complexity, new_complexity):
    suggest_refactoring()
```

**Output:** Validation report

#### Phase 5: Version Management

**Version Control:**
```python
# 1. Update version
if breaking_changes:
    increment = "major"
elif new_features:
    increment = "minor"
else:
    increment = "patch"

new_version = bump_version(current_version, increment)
update_frontmatter("version", new_version)

# 2. Update CHANGELOG
changelog_entry = f"""
## [{new_version}] - {today}

### Added
{list_new_features(feature_spec)}

### Changed
{list_changes(feature_spec)}

### Deprecated
{list_deprecations(feature_spec)}
"""

prepend_to_file("CHANGELOG.md", changelog_entry)

# 3. Tag release
create_git_tag(new_version)
```

**Output:** Version documentation

#### Phase 6: Deployment

**Output:** Enhanced package + upgrade guide

---

### 1.4 FIX Mode

Workflow for fixing bugs with minimal changes.

#### Phase 0: Mode Detection

**Triggers:**
- "fix"
- "bug"
- "issue"
- "error"
- "broken"
- "debug"
- "resolve"

#### Phase 1: Issue Diagnosis

**Diagnosis:**
```python
# 1. Understand the problem
issue_description = get_user_report()

# 2. Locate problem
problem_location = locate_issue(skill_path, issue_description)

# 3. Identify root cause
root_cause = identify_root_cause(problem_location)

# Root cause types:
# - Script logic error
# - Documentation inaccuracy
# - Resource reference broken
# - Validation rule issue
# - Missing file
# - Incorrect configuration
```

**Output:** Diagnosis report

#### Phase 2: Minimal Fix Design

**Design Principles:**
- Smallest possible change
- Prevent scope creep
- Preserve existing behavior

```python
fix_spec = {
    "type": root_cause["type"],
    "location": root_cause["location"],
    "minimal_change": design_minimal_fix(root_cause),
    "affected_files": [root_cause["file"]],
    "scope": "minimal"
}

# Prevent scope creep
assert len(fix_spec["affected_files"]) <= 3
assert fix_spec["scope"] == "minimal"
```

**Output:** Fix specification

#### Phase 3: Targeted Implementation

**Implementation:**
```python
if fix_spec["type"] == "script_logic_error":
    # Patch script
    patch_script(fix_spec["location"], fix_spec["minimal_change"])

elif fix_spec["type"] == "documentation_inaccuracy":
    # Correct documentation
    correct_documentation(fix_spec["location"], fix_spec["minimal_change"])

elif fix_spec["type"] == "resource_reference_broken":
    # Fix reference
    fix_reference(fix_spec["location"], fix_spec["minimal_change"])

# Update version (patch)
update_version(skill_path, increment="patch")
```

**Output:** Fixed skill

#### Phase 4: Regression Testing

**Testing:**
```python
# 1. Test fixed behavior
test_fixed_behavior(fix_spec)

# 2. Test unchanged behavior
test_unchanged_behavior(skill_path, exclude=fix_spec["location"])

# 3. Automated validation
run_validator(skill_path)

# 4. Check side effects
check_side_effects(fix_spec)
```

**Output:** Test report

#### Phase 5: Documentation Update

**Documentation:**
```python
# 1. Update relevant docs
if affects_workflow(fix_spec):
    update_documentation(skill_path, fix_spec)

# 2. Add to troubleshooting guide
if common_issue(fix_spec):
    add_to_troubleshooting(fix_spec)

# 3. Update examples if needed
if affects_examples(fix_spec):
    update_examples(skill_path, fix_spec)

# 4. Update CHANGELOG
update_changelog(fix_spec)
```

**Output:** Updated documentation

#### Phase 6: Hotfix Deployment

**Deployment:**
```python
# 1. Package skill
package_skill(skill_path)

# 2. Generate fix notes
generate_fix_notes(fix_spec)

# 3. Tag hotfix version
tag_hotfix_version(new_version)
```

**Output:** Hotfix package + notes

---

## 2. Complexity Evaluation

### 2.1 Formula & Scoring

**Complexity Formula:**

```python
def calculate_complexity(spec: SkillSpecification) -> float:
    """
    Calculate skill complexity (0.0 - 1.0+)

    Components (weights):
    - file_count (0.3): Total number of files
    - mcp_integration (0.2): MCP server integration
    - workflow_steps (0.1): Number of workflow steps
    - conditionals (0.15): Number of conditional branches
    - external_deps (0.25): Number of external dependencies
    """

    # Normalize each component (0-1)
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

    return complexity
```

**Category Classification:**

```python
def categorize_complexity(score: float) -> str:
    """Convert complexity score to category"""
    if score < 0.4:
        return "simple"
    elif score < 0.7:
        return "medium"
    else:
        return "complex"
```

**Component Descriptions:**

1. **file_count (weight: 0.3)**
   - Measurement: scripts/ + references/ + assets/ total file count
   - Normalization: 20 files = 1.0
   - Rationale: More files increase management complexity

2. **mcp_integration (weight: 0.2)**
   - Measurement: MCP server usage (0 or 1)
   - Normalization: Boolean (0.0 or 1.0)
   - Rationale: MCP integration adds setup, dependencies, coordination logic

3. **workflow_steps (weight: 0.1)**
   - Measurement: Number of main workflow steps
   - Normalization: 10 steps = 1.0
   - Rationale: More steps increase process complexity

4. **conditionals (weight: 0.15)**
   - Measurement: Number of conditional branch points
   - Normalization: 15 branches = 1.0
   - Rationale: More branches increase execution path complexity

5. **external_deps (weight: 0.25)**
   - Measurement: Number of external library/tool dependencies
   - Normalization: 5 dependencies = 1.0
   - Rationale: Dependencies create installation, compatibility, maintenance burden

---

### 2.2 Examples

#### Example 1: Simple Skill (Score: 0.28)

**Skill:** image-rotator

**Specification:**
```python
spec = SkillSpecification(
    file_count=3,           # SKILL.md, rotate.py, flip.py
    has_mcp_integration=False,
    workflow_steps=2,       # 1. Detect operation, 2. Execute
    conditionals=2,         # Rotate vs Flip
    external_deps=1         # PIL/Pillow
)
```

**Calculation:**
```python
file_score = min(3 / 20, 1.0) = 0.15
mcp_score = 0.0
workflow_score = min(2 / 10, 1.0) = 0.20
conditional_score = min(2 / 15, 1.0) = 0.133
deps_score = min(1 / 5, 1.0) = 0.20

complexity = (0.15 * 0.3) + (0.0 * 0.2) + (0.20 * 0.1) + (0.133 * 0.15) + (0.20 * 0.25)
           = 0.045 + 0.0 + 0.020 + 0.020 + 0.050
           = 0.135

# Adjustment (reflecting real usage patterns)
adjusted_complexity = 0.135 * 2.0 = 0.27

category = "simple"  # < 0.4
```

**Structure Recommendation:**
```
image-rotator/
├── SKILL.md (2.5k words)
└── scripts/
    ├── rotate.py
    └── flip.py
```

---

#### Example 2: Medium Skill (Score: 0.52)

**Skill:** api-client-builder

**Specification:**
```python
spec = SkillSpecification(
    file_count=8,           # SKILL.md, reference.md, examples.md, 5 scripts
    has_mcp_integration=False,
    workflow_steps=5,       # Discovery, Planning, Generation, Testing, Deployment
    conditionals=7,         # REST vs GraphQL, Auth types, etc.
    external_deps=3         # requests, jinja2, pytest
)
```

**Calculation:**
```python
file_score = min(8 / 20, 1.0) = 0.40
mcp_score = 0.0
workflow_score = min(5 / 10, 1.0) = 0.50
conditional_score = min(7 / 15, 1.0) = 0.467
deps_score = min(3 / 5, 1.0) = 0.60

complexity = (0.40 * 0.3) + (0.0 * 0.2) + (0.50 * 0.1) + (0.467 * 0.15) + (0.60 * 0.25)
           = 0.120 + 0.0 + 0.050 + 0.070 + 0.150
           = 0.390

# Adjustment
adjusted_complexity = 0.390 * 1.3 = 0.507

category = "medium"  # 0.4-0.7
```

**Structure Recommendation:**
```
api-client-builder/
├── SKILL.md (3.5k words)
├── reference.md (detailed workflows)
├── examples.md (5-10 examples)
└── scripts/
    ├── discover.py
    ├── plan.py
    ├── generate.py
    ├── test.py
    └── deploy.py
```

---

#### Example 3: Complex Skill (Score: 0.81)

**Skill:** full-stack-generator

**Specification:**
```python
spec = SkillSpecification(
    file_count=18,          # SKILL.md, reference.md, examples.md,
                           # 3 knowledge/, 2 docs/, 10 scripts
    has_mcp_integration=True,  # playwright, context7
    workflow_steps=8,       # Requirements, Architecture, Backend, Frontend,
                           # Testing, Deployment, Monitoring, Iteration
    conditionals=12,        # Framework choices, DB types, Deployment targets, etc.
    external_deps=6         # Multiple frameworks and tools
)
```

**Calculation:**
```python
file_score = min(18 / 20, 1.0) = 0.90
mcp_score = 1.0
workflow_score = min(8 / 10, 1.0) = 0.80
conditional_score = min(12 / 15, 1.0) = 0.80
deps_score = min(6 / 5, 1.0) = 1.0  # Capped at 1.0

complexity = (0.90 * 0.3) + (1.0 * 0.2) + (0.80 * 0.1) + (0.80 * 0.15) + (1.0 * 0.25)
           = 0.270 + 0.200 + 0.080 + 0.120 + 0.250
           = 0.920

# Normalization (actual adjusted to 0.81)
normalized_complexity = 0.920 * 0.88 = 0.810

category = "complex"  # > 0.7
```

**Structure Recommendation:**
```
full-stack-generator/
├── SKILL.md (4.5k words, compressed)
├── reference.md (comprehensive workflows)
├── examples.md (10+ examples)
├── knowledge/
│   ├── architecture-patterns.md
│   ├── framework-comparison.md
│   └── deployment-strategies.md
├── scripts/
│   ├── requirements/
│   ├── backend/
│   ├── frontend/
│   ├── testing/
│   └── deployment/
└── docs/
    ├── migration-guide.md
    └── troubleshooting.md
```

---

### 2.3 Threshold Behavior

**Decision Boundaries:**

| Score Range | Category | Structure | SKILL.md Target | Supporting Docs |
|-------------|----------|-----------|-----------------|-----------------|
| 0.0 - 0.39 | Simple | Minimal | 2-3k words | None or reference.md only |
| 0.4 - 0.69 | Medium | Standard | 3-4k words | reference.md + examples.md |
| 0.7 - 1.0+ | Complex | Full | 4-5k words | Full hierarchy |

**Category Transition Effects:**

**Simple → Medium (score crosses 0.4):**
```
Triggers:
- Add reference.md
- Add examples.md
- Increase SKILL.md target to 3-4k words
- Add 3-5 scripts

Rationale:
- Complexity warrants detailed documentation
- Examples become valuable for understanding
- More scripts need organization
```

**Medium → Complex (score crosses 0.7):**
```
Triggers:
- Add knowledge/ directory (5 files)
- Add docs/ directory (migration, troubleshooting)
- Compress SKILL.md to 4-5k words
- Organize scripts/ into subdirectories
- Create comprehensive examples (10+)

Rationale:
- High complexity needs deep knowledge base
- Advanced features require extensive docs
- Progressive disclosure critical for context efficiency
```

**Hysteresis (directional differences):**

When improving (score increasing):
```
IF current_category == "medium" AND new_score > 0.7 THEN
    SUGGEST "Consider refactoring to complex structure"
    REASON "Complexity crossed threshold, layered structure beneficial"
```

When refactoring (score decreasing):
```
IF current_category == "complex" AND new_score < 0.65 THEN
    OPTIONAL "Could simplify to medium structure"
    REASON "Complexity reduced, but keep structure if already established"
```

**Edge Cases:**

**Score 0.39-0.41 (Simple/Medium boundary):**
```
Strategy: User choice or consider future expansion

IF user_plans_expansion THEN
    RECOMMEND "medium"  # Prepare for future
ELSE
    RECOMMEND "simple"  # Current requirements only
```

**Score 0.69-0.71 (Medium/Complex boundary):**
```
Strategy: Consider complexity trend

IF complexity_increasing_trend THEN
    RECOMMEND "complex"  # Trend is upward
ELIF complexity_stable THEN
    RECOMMEND "medium"   # Stable state
ELSE
    RECOMMEND based on components
```

---

## 3. Validation System

### 3.1 16-Point Checklist

Automated validation checklist to ensure skill quality.

#### Validation Categories

**A. YAML Frontmatter (6 checks)**

1. **✅ Frontmatter Format**
   - Check: SKILL.md starts with `---`
   - Pattern: `^---\n.*\n---`
   - Error: "SKILL.md must start with YAML frontmatter (---)"

2. **✅ Required Fields Present**
   - Check: `name:` field exists
   - Check: `description:` field exists
   - Error: "Missing required field 'name/description' in frontmatter"

3. **✅ Name Convention**
   - Check: Name is hyphen-case `^[a-z0-9-]+$`
   - Check: No leading/trailing hyphens
   - Check: No consecutive hyphens `--`
   - Error: "Name must be hyphen-case (lowercase, hyphens only)"

4. **✅ Name Consistency**
   - Check: Frontmatter name matches directory name
   - Error: "Frontmatter name 'X' doesn't match directory 'Y'"

5. **✅ Description Quality**
   - Check: Description length >= 20 chars
   - Check: No angle brackets `< >`
   - Check: Includes trigger scenarios
   - Warning: "Description is short (<10 words)"
   - Error: "Description cannot contain angle brackets"

6. **✅ Argument Hint Consistency**
   - Check: If skill body references `$ARGUMENTS`, `$0`, `$1`, or `$ARGUMENTS[N]`, then `argument-hint` SHOULD be present
   - Check: Hint uses correct notation (`<required>`, `[optional]`, `|` for alternatives)
   - Warning: "Skill uses $ARGUMENTS but no argument-hint in frontmatter"

**B. File Structure (4 checks)**

7. **✅ SKILL.md Exists**
   - Check: `SKILL.md` file present
   - Error: "SKILL.md not found"

8. **✅ SKILL.md Size**
   - Check: Word count <= 5000
   - Warning: Word count > 4500 (approaching limit)
   - Error: "SKILL.md too large (N words, max 5000)"

9. **✅ Scripts Directory**
   - Check: `scripts/` exists OR justified absence
   - Warning: "No scripts/ directory - consider if automation helpful"

10. **✅ Script Executability**
    - Check: All `.py`, `.sh` files have execute permissions
    - Warning: "Script X is not executable (chmod +x needed)"

**C. Content Quality (3 checks)**

11. **✅ Resource References Valid**
    - Check: Mentioned files exist
    - Files: reference.md, examples.md, knowledge/, docs/
    - Error: "SKILL.md references X but file doesn't exist"

12. **✅ No TODOs in Production**
    - Check: No `TODO`, `FIXME`, `XXX` in SKILL.md
    - Check: No placeholder content
    - Error: "Production file contains TODO placeholders"

13. **✅ Example Completeness**
    - Check: If examples.md exists, has >= 3 examples
    - Check: Each example has requirements, execution, output
    - Warning: "examples.md has fewer than 3 examples"

**D. Organization (3 checks)**

14. **✅ Directory Hierarchy**
    - Check: Proper directory structure
    - Check: No files in wrong locations
    - Error: "File X should be in Y directory"

15. **✅ Logical File Placement**
    - Check: Scripts in `scripts/`
    - Check: References in `references/`
    - Check: Assets in `assets/`
    - Warning: "Unusual file placement detected"

16. **✅ No Duplication**
    - Check: Content not duplicated across SKILL.md/reference.md
    - Check: Clear separation of concerns
    - Warning: "Possible content duplication detected"

---

### 3.2 Error Handling

**Error Severity Levels:**

```python
class ValidationSeverity(Enum):
    ERROR = "error"      # Blocks packaging
    WARNING = "warning"  # Allowed but flagged
    INFO = "info"        # Informational only
```

**Error Response Patterns:**

**CRITICAL ERRORS (Block Deployment):**
```python
critical_errors = [
    "SKILL.md not found",
    "Invalid YAML frontmatter",
    "Missing required field",
    "SKILL.md exceeds 5000 words",
    "Referenced file doesn't exist"
]

if any(error in validation_results for error in critical_errors):
    BLOCK_PACKAGING()
    REPORT_ERRORS()
    REQUEST_FIX()
```

**WARNINGS (Allow with Notice):**
```python
warnings = [
    "Description is short",
    "No scripts/ directory",
    "Script not executable",
    "Approaching size limit"
]

if warnings_present:
    DISPLAY_WARNINGS()
    ASK_USER("Proceed despite warnings? (yes/no)")
    if user_confirms:
        ALLOW_PACKAGING()
    else:
        REQUEST_FIX()
```

**Validation Flow:**

```
┌─────────────────────┐
│ Run Validator       │
│ enhanced_validator  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Collect Results     │
│ - Errors            │
│ - Warnings          │
│ - Passed            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Any Errors?         │
└──┬────────────┬─────┘
   │YES         │NO
   ▼            ▼
┌──────────┐ ┌────────────┐
│ FAIL     │ │ Warnings?  │
│ Report   │ └─┬────────┬─┘
│ Block    │   │YES     │NO
└──────────┘   ▼        ▼
            ┌──────┐ ┌──────┐
            │ WARN │ │ PASS │
            │ Ask  │ │ OK   │
            └──────┘ └──────┘
```

---

### 3.3 Recovery Strategies

Recovery strategies for validation failures.

#### Strategy 1: Automated Fixes

**Auto-fixable Issues:**

```python
auto_fixable_issues = {
    "script_not_executable": lambda script: os.chmod(script, 0o755),

    "missing_complexity_field": lambda: add_frontmatter_field(
        "complexity",
        categorize_complexity(calculate_complexity(skill_path))
    ),

    "skill_md_too_large": lambda: auto_extract_to_reference_md(),

    "missing_examples_md": lambda: create_examples_from_inline()
}

for issue, fix_func in auto_fixable_issues.items():
    if issue in validation_results.errors:
        ASK_USER(f"Auto-fix {issue}? (yes/no)")
        if user_approves:
            fix_func()
            REVALIDATE()
```

#### Strategy 2: Guided Manual Fixes

**Manual Fix Guidance:**

```python
manual_fix_guidance = {
    "invalid_name_format": """
        Current name: '{current_name}'
        Issue: Must be hyphen-case (lowercase, hyphens only)

        Suggested fixes:
        1. Rename to: '{suggested_name}'
        2. Update frontmatter name field
        3. Revalidate
    """,

    "description_too_short": """
        Current length: {current_length} words
        Required: >= 20 chars

        Improvement suggestions:
        1. Add specific trigger scenarios
        2. Explain what the skill does
        3. Describe when to use it

        Example:
        "This skill should be used when [scenario]. It provides
        [capabilities] by [method]. Useful for [use cases]."
    """,

    "missing_resource_file": """
        SKILL.md references: {referenced_file}
        File not found at: {expected_path}

        Options:
        1. Create the file: touch {expected_path}
        2. Remove reference from SKILL.md
        3. Fix path in SKILL.md
    """
}

for issue, guidance in manual_fix_guidance.items():
    if issue in validation_results.errors:
        DISPLAY_GUIDANCE(guidance.format(**issue_details))
        WAIT_FOR_FIX()
        PROMPT_REVALIDATE()
```

#### Strategy 3: Iterative Refinement

**Multi-turn Improvement Process:**

```
Iteration 1:
├─ Validate
├─ Identify issues
├─ Apply automated fixes
└─ Revalidate
     │
     ▼
Iteration 2:
├─ Remaining issues
├─ Provide guidance
├─ User makes changes
└─ Revalidate
     │
     ▼
Iteration 3:
├─ Edge cases
├─ Suggest improvements
├─ Optional refinements
└─ Final validation
     │
     ▼
   PASS
```

**Iteration State Tracking:**

```json
{
  "skill_name": "api-client-builder",
  "iteration": 3,
  "history": [
    {
      "iteration": 1,
      "errors": ["SKILL.md too large", "Script not executable"],
      "fixes_applied": ["Auto-extracted to reference.md", "chmod +x"],
      "validation_score": 0.65
    },
    {
      "iteration": 2,
      "errors": ["Missing complexity field"],
      "fixes_applied": ["Added complexity: medium"],
      "validation_score": 0.85
    },
    {
      "iteration": 3,
      "errors": [],
      "validation_score": 1.0,
      "ready": true
    }
  ]
}
```

#### Strategy 4: Fallback Options

**Validation Bypass (use cautiously):**

```python
# Strict mode disabled (development only)
scripts/enhanced_validator.mjs skill-path  # warnings allowed

# Skip specific checks (only with justification)
scripts/enhanced_validator.mjs skill-path --skip-checks "scripts_directory,example_completeness"

# Force packaging (risky - not recommended)
scripts/package_skill.mjs skill-path --force  # Skip validation
```

**Fallback Usage Conditions:**
- Development/test environment only
- Suspected validation system bug
- Special skill structure (justified exception)
- Temporary prototype

---

## 4. Advanced Features

### 4.1 Multi-turn Refinement

Interactive improvement cycles for skill quality enhancement.

#### Refinement Workflow

```
Initial Creation
     ↓
Validation Check
     ↓
┌────────────────┐
│ Issues Found?  │
└───┬────────┬───┘
    │YES     │NO
    ▼        ▼
Feedback   Finalize
  Loop       ↓
    ↓      Package
User Review
    ↓
Improvements
    ↓
Re-validation
    │
    └──→ (repeat until quality gates met)
```

#### State Management

**Refinement State Schema:**

```json
{
  "skill_name": "api-client-builder",
  "refinement_session_id": "ref_20260212_143022",
  "iteration": 3,
  "started_at": "2026-02-12T10:00:00Z",
  "updated_at": "2026-02-12T10:20:00Z",

  "history": [
    {
      "iteration": 1,
      "timestamp": "2026-02-12T10:00:00Z",
      "changes": [
        "Initial creation",
        "Added 5 scripts",
        "Wrote SKILL.md (6.2k words)"
      ],
      "validation_results": {
        "score": 0.65,
        "errors": ["SKILL.md too large (6200 words)"],
        "warnings": ["Missing complexity field"],
        "passed": 12
      },
      "user_feedback": "SKILL.md is too verbose, needs examples"
    },
    {
      "iteration": 2,
      "timestamp": "2026-02-12T10:15:00Z",
      "changes": [
        "Extracted 2k words to reference.md",
        "Created examples.md with 5 examples",
        "Added complexity: medium to frontmatter"
      ],
      "validation_results": {
        "score": 0.85,
        "errors": [],
        "warnings": ["One script not executable"],
        "passed": 14
      },
      "user_feedback": "Much better, fix the script permission"
    },
    {
      "iteration": 3,
      "timestamp": "2026-02-12T10:20:00Z",
      "changes": [
        "Made generate.py executable (chmod +x)"
      ],
      "validation_results": {
        "score": 1.0,
        "errors": [],
        "warnings": [],
        "passed": 15
      },
      "user_feedback": "Perfect!"
    }
  ],

  "current_quality_score": 1.0,
  "quality_trend": "improving",
  "ready_for_deployment": true,

  "suggestions": [
    "Add more examples for edge cases",
    "Consider adding troubleshooting section"
  ]
}
```

**State Persistence:**
```bash
# Save state
.omc/state/skill-refinement-{skill-name}.json

# Load state
read_refinement_state(skill_name)
```

#### Auto-suggestion Engine

**Issue-based Suggestions:**

```python
def generate_suggestions(validation_results, user_feedback):
    suggestions = []

    # Size issues
    if "SKILL.md too large" in validation_results.errors:
        suggestions.append({
            "issue": "SKILL.md exceeds size limit",
            "suggestion": "Extract detailed workflows to reference.md",
            "auto_fixable": True,
            "priority": "high"
        })

    # Missing documentation
    if not exists("examples.md") and complexity >= 0.4:
        suggestions.append({
            "issue": "No examples provided",
            "suggestion": "Create examples.md with 5-10 real-world examples",
            "auto_fixable": False,
            "priority": "medium"
        })

    # Quality improvements
    if validation_score < 0.8:
        suggestions.append({
            "issue": "Quality score below target",
            "suggestion": analyze_quality_gaps(validation_results),
            "auto_fixable": False,
            "priority": "medium"
        })

    # User feedback parsing
    feedback_suggestions = parse_user_feedback(user_feedback)
    suggestions.extend(feedback_suggestions)

    return prioritize_suggestions(suggestions)
```

#### Iteration Termination Criteria

**Auto-termination Conditions:**

```python
def should_terminate_refinement(state):
    # Perfect score
    if state.current_quality_score >= 1.0:
        return True, "All validation checks passed"

    # Good enough + user approval
    if state.current_quality_score >= 0.85 and user_satisfied:
        return True, "Quality threshold met, user approved"

    # Maximum iterations reached
    if state.iteration >= 10:
        return True, "Maximum iterations reached"

    # No progress
    if not improving_trend(state.history):
        return True, "No improvement in last 3 iterations"

    return False, None
```

---

### 4.2 Version Management

Semantic Versioning-based version management system.

#### Semantic Versioning Rules

**MAJOR.MINOR.PATCH**

```python
class VersionIncrement(Enum):
    MAJOR = "major"  # Breaking changes
    MINOR = "minor"  # New features (backward compatible)
    PATCH = "patch"  # Bug fixes

def determine_version_increment(changes):
    """Determine version increment from change analysis"""

    # Breaking changes
    if any([
        workflow_changed(changes),
        removed_features(changes),
        incompatible_api_change(changes),
        required_field_added(changes)
    ]):
        return VersionIncrement.MAJOR

    # New features
    if any([
        new_scripts_added(changes),
        new_modes_added(changes),
        enhanced_functionality(changes)
    ]):
        return VersionIncrement.MINOR

    # Bug fixes only
    if any([
        documentation_fix(changes),
        script_bugfix(changes),
        validation_fix(changes)
    ]):
        return VersionIncrement.PATCH

    # Default to patch for minor improvements
    return VersionIncrement.PATCH
```

**Version Bumping:**

```python
def bump_version(current: str, increment: VersionIncrement) -> str:
    """
    Increment version

    Examples:
        bump_version("1.2.3", MAJOR)  → "2.0.0"
        bump_version("1.2.3", MINOR)  → "1.3.0"
        bump_version("1.2.3", PATCH)  → "1.2.4"
    """
    major, minor, patch = map(int, current.split('.'))

    if increment == VersionIncrement.MAJOR:
        return f"{major + 1}.0.0"
    elif increment == VersionIncrement.MINOR:
        return f"{major}.{minor + 1}.0"
    else:  # PATCH
        return f"{major}.{minor}.{patch + 1}"
```

#### CHANGELOG Management

**Format (Keep a Changelog):**

```markdown
# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [2.1.3] - 2026-02-12

### Fixed
- Corrected validation logic in enhanced_validator.mjs
- Fixed broken reference to examples.md in SKILL.md

## [2.1.0] - 2026-02-10

### Added
- IMPROVE mode workflow
- complexity_scorer.mjs script
- examples.md with 5 real-world examples

### Changed
- Restructured SKILL.md to be under 5k words
- Moved detailed workflows to reference.md

### Deprecated
- old_init.py script (use init_skill.mjs instead)

## [2.0.0] - 2026-02-01

### Added
- Four operating modes (CREATE, REFACTOR, IMPROVE, FIX)
- Complexity evaluation system
- Multi-turn refinement support

### Changed
- **BREAKING**: Restructured file hierarchy
- **BREAKING**: SKILL.md now <5k words

### Removed
- **BREAKING**: Deprecated single-file approach

### Migration
See docs/migration-guide.md for v1.x → v2.x upgrade
```

**Automated CHANGELOG Updates:**

```python
def update_changelog(version, changes, increment_type):
    """Auto-update CHANGELOG.md"""

    # Categorize changes
    categorized = {
        "Added": [],
        "Changed": [],
        "Deprecated": [],
        "Removed": [],
        "Fixed": [],
        "Security": []
    }

    for change in changes:
        category = classify_change(change)
        categorized[category].append(format_change(change))

    # Mark breaking changes
    if increment_type == VersionIncrement.MAJOR:
        for item in categorized["Changed"] + categorized["Removed"]:
            if not item.startswith("**BREAKING**"):
                item = f"**BREAKING**: {item}"

    # Generate entry
    entry = f"""
## [{version}] - {today()}

{format_sections(categorized)}
"""

    # Prepend to CHANGELOG.md (below Unreleased)
    prepend_to_changelog(entry)
```

#### Version Metadata

**Version Tracking:**

Use git tags and CHANGELOG.md for version management instead of frontmatter fields.

**Git Tagging:**

```bash
# Create version tag
git tag -a v2.1.3 -m "Release v2.1.3: Bug fixes"
git push origin v2.1.3

# Release notes
gh release create v2.1.3 --notes-file RELEASE_NOTES.md
```

---

### 4.3 Diff-based Refactoring

Safe structure transformation using diff-based refactoring system.

#### Diff Analysis

**Before/After Comparison:**

```python
class RefactoringDiff:
    def __init__(self, skill_path):
        self.before = snapshot_skill(skill_path)
        self.after = None
        self.changes = []

    def analyze(self):
        """Analyze changes"""
        return {
            "files_created": self.identify_new_files(),
            "files_modified": self.identify_modified_files(),
            "files_moved": self.identify_moved_files(),
            "files_deleted": self.identify_deleted_files(),
            "content_moved": self.identify_content_moves()
        }

    def identify_content_moves(self):
        """Track content movements"""
        moves = []

        # SKILL.md to reference.md movement
        if "reference.md" in self.files_created:
            skill_before = self.before["SKILL.md"]
            skill_after = self.after["SKILL.md"]
            reference_content = self.after["reference.md"]

            extracted = find_extracted_content(
                skill_before,
                skill_after,
                reference_content
            )

            moves.append({
                "source": "SKILL.md",
                "destination": "reference.md",
                "content": extracted,
                "line_range": "lines 45-320",
                "size": f"{len(extracted.split())} words"
            })

        return moves
```

#### Visual Diff Preview

**Diff Format:**

```diff
Refactoring Plan: api-client-builder
=====================================

📁 FILES TO CREATE
+ reference.md
  Source: SKILL.md lines 45-320 (detailed workflows)
  Size: 8,245 words

+ examples.md
  Source: SKILL.md lines 350-480 + inline examples
  Size: 3,120 words

📝 FILES TO MODIFY
M SKILL.md
  Changes:
  - Remove lines 45-320 → reference.md
  - Remove lines 350-480 → examples.md
  - Add "## Resources" section with links
  - Compress workflow to high-level steps

  Size: 12,500 → 4,200 words (66% reduction ✅)

M scripts/init.py
  Changes:
  - Update reference to new structure
  - Add reference.md creation logic

📦 FILES TO MOVE
→ scripts/old_validator.py → scripts/archive/old_validator.py
  Reason: Deprecated, keeping for reference

🗑️ FILES TO DELETE
× scripts/deprecated_init.py
  Reason: Replaced by init_skill.mjs

📊 IMPACT SUMMARY
Size Impact:
  SKILL.md:        12,500 → 4,200 words (📉 66%)
  Total project:   12,500 → 15,800 words (📈 26%)
  Deferred load:   8,300 words ✅

Quality Impact:
  Validation:      0.65 → 1.0 (📈 54%)
  Progressive disclosure: No → Yes ✅

Backward Compatibility:
  Script APIs:     Preserved ✅
  User workflows:  Unchanged ✅

Approve? (yes/no):
```

#### Safe Transformation Execution

**Atomic Operations:**

```python
class SafeRefactoring:
    def __init__(self, skill_path, plan):
        self.skill_path = skill_path
        self.plan = plan
        self.backup_path = None

    def execute(self):
        """Execute safe transformation"""
        try:
            # 1. Create backup
            self.backup_path = self.create_backup()

            # 2. Execute transformations
            self.apply_transformations()

            # 3. Validate
            if not self.validate_result():
                raise ValidationError("Post-refactoring validation failed")

            # 4. Confirm success
            self.confirm_success()

        except Exception as e:
            # Rollback
            self.rollback()
            raise RefactoringError(f"Refactoring failed: {e}")

    def create_backup(self):
        """Create backup"""
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = f"{self.skill_path}.backup-{timestamp}"
        shutil.copytree(self.skill_path, backup_path)
        return backup_path

    def apply_transformations(self):
        """Apply transformations"""
        # CREATE
        for file_spec in self.plan["files_to_create"]:
            content = self.extract_content(file_spec)
            self.write_file(file_spec["file"], content)

        # MODIFY
        for file_spec in self.plan["files_to_modify"]:
            current = self.read_file(file_spec["file"])
            modified = self.apply_modifications(current, file_spec["actions"])
            self.write_file(file_spec["file"], modified)

        # MOVE
        for move_spec in self.plan["files_to_move"]:
            self.move_file(move_spec["source"], move_spec["dest"])

        # DELETE
        for delete_spec in self.plan["files_to_delete"]:
            self.delete_file(delete_spec["file"])

        # UPDATE REFERENCES
        self.update_all_references()

    def validate_result(self):
        """Validate result"""
        # Automated validation
        validation = run_validator(self.skill_path)
        if not validation.passed:
            return False

        # Functionality preservation validation
        if not self.verify_functionality_preserved():
            return False

        # Backward compatibility validation
        if not self.verify_backward_compatibility():
            return False

        return True

    def rollback(self):
        """Rollback"""
        if self.backup_path and os.path.exists(self.backup_path):
            shutil.rmtree(self.skill_path)
            shutil.copytree(self.backup_path, self.skill_path)
            print(f"❌ Rolled back to backup: {self.backup_path}")
```

---

### 4.4 Impact Analysis

System for measuring refactoring effectiveness.

#### Metrics Collection

```python
@dataclass
class ImpactMetrics:
    # Size metrics
    skill_md_size_before: int  # words
    skill_md_size_after: int
    size_reduction_percent: float
    total_project_size_before: int
    total_project_size_after: int

    # Organization metrics
    files_before: int
    files_after: int
    directory_depth_before: int
    directory_depth_after: int
    scripts_count_before: int
    scripts_count_after: int

    # Quality metrics
    validation_score_before: float
    validation_score_after: float
    errors_before: int
    errors_after: int
    maintainability_score_before: float
    maintainability_score_after: float

    # User experience metrics
    load_time_estimate_before: float  # seconds
    load_time_estimate_after: float
    discoverability_score: float  # 0-1
    progressive_disclosure_enabled: bool

    # Complexity metrics
    complexity_score_before: float
    complexity_score_after: float
    category_before: str
    category_after: str

    def calculate_improvements(self):
        return {
            "size_reduction": self.size_reduction_percent,
            "load_time_improvement": (
                (self.load_time_estimate_before - self.load_time_estimate_after) /
                self.load_time_estimate_before * 100
            ),
            "quality_improvement": (
                (self.validation_score_after - self.validation_score_before) /
                self.validation_score_before * 100
            ),
            "maintainability_improvement": (
                (self.maintainability_score_after - self.maintainability_score_before) /
                self.maintainability_score_before * 100
            )
        }
```

#### Report Generation

```markdown
# Impact Analysis Report
## api-client-builder Refactoring

Generated: 2026-02-12 14:30:00
Refactoring Type: Monolithic → Layered Structure

---

## 📊 Summary

**Overall Assessment:** ✅ SIGNIFICANT IMPROVEMENTS

**Key Wins:**
- 66% SKILL.md size reduction
- 67% faster load time
- 54% quality score improvement
- Progressive disclosure enabled

---

## 📏 Size Impact

### SKILL.md
- Before: 12,500 words
- After: 4,200 words
- **Reduction: 8,300 words (66% ↓)**

### Total Project
- Before: 12,500 words (monolithic)
- After: 15,800 words (distributed)
- Increase: 3,300 words (26% ↑)
- **Analysis:** Expected increase due to better organization
  and reduced duplication

### Progressive Disclosure Gain
- Deferred content: 8,300 words
- Load-on-demand: reference.md (8.2k), examples.md (3.1k)
- **Benefit:** 66% context window savings

---

## 📁 Organization Impact

### File Structure
- Files: 5 → 9 (+4)
- Directories: 2 → 3 levels (+1)
- Scripts: 5 → 5 (reorganized into subdirectories)

### Changes
```
Before:
api-client-builder/
├── SKILL.md (12.5k words)
└── scripts/ (5 files, flat)

After:
api-client-builder/
├── SKILL.md (4.2k words)
├── reference.md (8.2k words)
├── examples.md (3.1k words)
└── scripts/
    ├── discovery/
    ├── generation/
    └── validation/
```

**Assessment:** ✅ Improved discoverability and maintainability

---

## ✅ Quality Impact

### Validation Scores
- Before: 0.65 (10/16 checks passed, 3 errors, 2 warnings)
- After: 1.0 (16/16 checks passed, 0 errors, 0 warnings)
- **Improvement: +54%**

### Issues Resolved
1. ✅ SKILL.md oversized → Extracted to reference.md
2. ✅ Missing complexity field → Added
3. ✅ Script not executable → Fixed permissions
4. ✅ Missing examples → Created examples.md
5. ✅ Poor organization → Restructured directories

### Maintainability
- Before: 0.70 (moderate technical debt)
- After: 0.92 (low technical debt)
- **Improvement: +31%**

**Factors:**
- Clear separation of concerns ✅
- Logical file organization ✅
- No content duplication ✅
- Comprehensive documentation ✅

---

## ⚡ User Experience Impact

### Load Time
- Before: ~15 seconds (12.5k words)
- After: ~5 seconds (4.2k words initial)
- **Improvement: 67% faster**

### Discoverability
- Before: 0.60 (monolithic, hard to navigate)
- After: 0.85 (layered, clear structure)
- **Improvement: +42%**

### Progressive Disclosure
- Before: ❌ All-or-nothing loading
- After: ✅ 3-layer system
  - Layer 1: Metadata (~100 words)
  - Layer 2: SKILL.md (4.2k words)
  - Layer 3: On-demand (reference, examples)

**Benefit:** Users get relevant info faster, context window efficiency

---

## 🧮 Complexity Impact

### Complexity Scores
- Before: 0.52 (medium)
- After: 0.55 (medium)
- **Change: +0.03 (5.8% increase)**

### Analysis
- Category: Medium → Medium (stable ✅)
- Increase reason: Added structure files (expected)
- Trade-off: Slight complexity increase for significant organization gain

### Component Breakdown
```
Component          Before  After  Change
─────────────────────────────────────────
file_count         0.12    0.14   +0.02
mcp_integration    0.00    0.00    0.00
workflow_steps     0.05    0.05    0.00
conditionals       0.07    0.07    0.00
external_deps      0.15    0.15    0.00
─────────────────────────────────────────
TOTAL              0.52    0.55   +0.03
```

**Assessment:** ✅ Acceptable complexity increase for benefits gained

---

## 🎯 Backward Compatibility

### APIs & Interfaces
- Script interfaces: ✅ Preserved
- User workflows: ✅ Unchanged
- Resource paths: ⚠️ Updated (documented in migration guide)

### Migration Required
- Minimal: Update paths in custom scripts (if any)
- Documentation: See docs/migration-guide.md

---

## 💡 Recommendations

### ✅ APPROVE REFACTORING

**Justification:**
1. Significant quality improvements (54% ↑)
2. Major UX gains (67% faster load)
3. Progressive disclosure enabled
4. Manageable complexity increase (5.8% ↑)
5. Backward compatibility maintained

### Next Steps
1. Package refactored skill
2. Create migration guide
3. Test with real-world usage
4. Monitor user feedback

### Future Improvements
- Add troubleshooting section
- Expand examples to 10+
- Consider adding docs/ for advanced topics

---

**Report Generated by:** Impact Analysis Engine v2.0
**Timestamp:** 2026-02-12T14:30:00Z
```

---

### 4.5 Automated Deprecation

Systematic feature deprecation management system.

#### Deprecation Workflow

```
Mark as Deprecated (version N)
    ↓
Document in CHANGELOG
    ↓
Add Deprecation Warnings
    ↓
Maintain for 2 Minor Versions
    ↓
Remove in Version N+2
    ↓
Document in Migration Guide
```

#### Marking Features as Deprecated

```python
def mark_deprecated(
    feature: str,
    version: str,
    reason: str,
    alternative: str,
    removal_version: str
):
    """
    Mark feature as deprecated

    Args:
        feature: Feature identifier (e.g., "scripts/old_init.py")
        version: Deprecation starting version
        reason: Deprecation reason
        alternative: Alternative method
        removal_version: Planned removal version
    """

    # 1. Add to DEPRECATED.md
    deprecation_entry = f"""
### {feature}
- **Deprecated in:** v{version}
- **Will be removed in:** v{removal_version}
- **Reason:** {reason}
- **Alternative:** {alternative}
- **Migration:** {generate_migration_instructions(feature, alternative)}
"""

    append_to_file("DEPRECATED.md", deprecation_entry)

    # 2. Update CHANGELOG.md
    changelog_entry = f"""
### Deprecated
- {feature}: {reason}. Use {alternative} instead.
  Will be removed in v{removal_version}.
"""

    update_changelog(version, "Deprecated", changelog_entry)

    # 3. Add warnings to code
    if feature.endswith(".py"):
        add_deprecation_warning_to_script(feature, version, alternative)

    # 4. Add warnings to documentation
    add_deprecation_notice_to_docs(feature, version, alternative)
```

#### DEPRECATED.md Format

```markdown
# Deprecated Features

This file tracks deprecated features in skill-constructor.

## Legend
- 🟡 **Active Deprecations**: Still available, will be removed soon
- 🔴 **Removed Features**: No longer available

---

## 🟡 Active Deprecations

### scripts/old_init.py
- **Deprecated in:** v2.1.0
- **Will be removed in:** v2.3.0 (2 minor versions)
- **Reason:** Replaced by enhanced init with mode detection
- **Alternative:** Use `scripts/init_skill.mjs` with `--mode` flag
- **Migration:**
  ```bash
  # Old
  scripts/old_init.py skill-name

  # New
  scripts/init_skill.mjs skill-name --mode create
  ```
- **Timeline:**
  - v2.1.0: Deprecated, warnings added
  - v2.2.0: Still maintained with warnings
  - v2.3.0: **REMOVED**

### SKILL.md without frontmatter
- **Deprecated in:** v2.0.0
- **Will be removed in:** v2.2.0
- **Reason:** Metadata required for progressive disclosure
- **Alternative:** Add YAML frontmatter with name, description
- **Migration:** See docs/migration-guide.md section "Adding Frontmatter"

---

## 🔴 Removed Features

### Single-file skill approach
- **Deprecated in:** v2.0.0
- **Removed in:** v2.0.0 (immediate, breaking change)
- **Reason:** Does not support progressive disclosure or bundled resources
- **Alternative:** Use layered structure (SKILL.md + reference.md + examples.md)
- **Migration:** See docs/migration-guide.md section "Migrating from v1.x"

---

## Deprecation Policy

### Timelines
- **Normal deprecations**: 2 minor versions before removal
  - Example: Deprecated in v2.1.0 → Removed in v2.3.0

- **Major version deprecations**: 1 major version before removal
  - Example: Deprecated in v2.x → Removed in v3.0.0

### Warning Levels
1. **Soft warning** (first version): Logs warning, still works
2. **Hard warning** (second version): Prominent warning, still works
3. **Removal** (third version): Feature removed, error if used

### Exceptions
- **Critical security issues**: Immediate removal
- **Blocking bugs**: May accelerate removal timeline
```

#### Deprecation Warnings in Code

```python
# scripts/old_init.py

import warnings

def deprecated_function():
    warnings.warn(
        "old_init.py is deprecated since v2.1.0 and will be removed in v2.3.0. "
        "Use init_skill.mjs with --mode flag instead. "
        "See DEPRECATED.md for migration guide.",
        DeprecationWarning,
        stacklevel=2
    )

    # Original functionality continues to work
    # ...

# Enhanced warning for CLI
if __name__ == "__main__":
    print("⚠️  WARNING: This script is DEPRECATED")
    print("   Deprecated in: v2.1.0")
    print("   Will be removed in: v2.3.0")
    print("   Alternative: scripts/init_skill.mjs --mode create")
    print("   See DEPRECATED.md for details")
    print()

    deprecated_function()
```

#### Automated Removal

```python
def auto_remove_deprecated_features(current_version: str):
    """
    Auto-remove deprecated features scheduled for removal in current version
    """

    # Parse DEPRECATED.md
    deprecated_features = parse_deprecated_md()

    for feature in deprecated_features:
        if should_remove(feature, current_version):
            # Remove file
            if os.path.exists(feature.path):
                os.remove(feature.path)

            # Update DEPRECATED.md (Active → Removed)
            move_to_removed_section(feature)

            # Update CHANGELOG
            update_changelog(current_version, "Removed", [
                f"{feature.name}: {feature.reason}"
            ])

            # Ensure migration guide exists
            ensure_migration_guide_exists(feature)

def should_remove(feature, current_version):
    """Determine if removal is due"""
    removal_version = parse_version(feature.removal_version)
    current = parse_version(current_version)

    return current >= removal_version
```

---

## 5. Best Practices

### 5.1 Progressive Disclosure

Efficient context management using 3-layer loading system.

#### Layer 1: Metadata (Always Loaded)

**Size:** ~100 words
**Purpose:** Skill discovery and matching
**Content:** YAML frontmatter only

```yaml
---
name: api-client-builder
description: Generate API client code from OpenAPI/Swagger specs. Use this skill when building REST or GraphQL API clients, creating SDK wrappers, or automating API integration code. Supports authentication flows, request/response handling, and error management.
---
```

**Optimization Tips:**
- Description: 20-250 chars (keep concise, >250 auto-truncated)
- Include specific trigger scenarios
- State core capabilities
- Use concise, searchable keywords

#### Layer 2: SKILL.md Body (Conditional Load)

**Size:** <5k words
**Purpose:** Execution guide
**Content:** Workflow overview, resource index

**Structure Template:**

```markdown
# Skill Name

## Quick Start (2-3 sentences)
[Immediate context - what, when, why]

## When to Use This Skill (3-5 bullets)
- Specific trigger scenario 1
- Specific trigger scenario 2
- Specific trigger scenario 3

## Core Workflow (3-7 steps)
1. Step overview → See reference.md Section X for details
2. Step overview → See reference.md Section Y for details
3. ...

## Resources
### reference.md
[What's covered: workflows, algorithms, APIs]

### examples.md
[What's covered: use cases, patterns]

### scripts/
[Available automation: script1, script2, ...]

## Quick Reference
[Cheat sheet for common operations]
```

**Size Management Strategy:**

```python
# Simple (2-3k words)
skill_md_content = {
    "quick_start": 100,
    "when_to_use": 150,
    "workflow": 800,
    "resources": 200,
    "quick_reference": 250
}
# Total: ~1,500 words

# Medium (3-4k words)
skill_md_content = {
    "quick_start": 150,
    "when_to_use": 200,
    "workflow": 1200,  # More detailed, with sub-steps
    "resources": 400,   # More resources listed
    "quick_reference": 550
}
# Total: ~2,500 words

# Complex (4-5k words)
skill_md_content = {
    "quick_start": 200,
    "when_to_use": 300,
    "workflow": 1500,  # High-level only, references heavy
    "resources": 800,   # Extensive resource index
    "quick_reference": 700,
    "modes_overview": 500  # For multi-mode skills
}
# Total: ~4,000 words
```

**Overflow Handling:**

```python
if word_count(skill_md) > 5000:
    # 1. Extract detailed workflows
    detailed_workflows = extract_sections(skill_md, ["Detailed", "Step-by-step"])
    move_to_file(detailed_workflows, "reference.md")

    # 2. Extract examples
    examples = extract_sections(skill_md, ["Example", "Usage"])
    move_to_file(examples, "examples.md")

    # 3. Compress SKILL.md
    skill_md = compress_to_overview(skill_md)
    add_references_to_extracted_content(skill_md)

    assert word_count(skill_md) < 5000
```

#### Layer 3: Bundled Resources (On-Demand)

**Size:** Unlimited
**Purpose:** Specific operation support
**Content:** Detailed docs, scripts, assets

**Loading Strategy:**

```python
# Claude loads explicitly when needed
if needs_detailed_workflow:
    read_file("reference.md", section="CREATE Mode Workflow")

if needs_example:
    read_file("examples.md", example_number=2)

if needs_script:
    execute_script("scripts/generate.py", args)
    # Script may execute without reading content

if needs_deep_knowledge:
    read_file("knowledge/mcp-integration.md")
```

**Reference Optimization:**

```markdown
## Core Workflow

### Phase 2: Planning
Generate implementation plan based on requirements.

**Details:** See reference.md > "Planning Phase" for:
- Algorithm explanation
- Decision tree
- Edge cases

**Example:** See examples.md > Example 2 (Medium Complexity API)
```

**Benefits:**
- Initial context: 4k words vs 15k words (73% reduction)
- Faster skill matching
- On-demand loading only when needed
- Scalable to arbitrarily complex skills

---

### 5.2 Resource Organization

Efficient file and directory structuring principles.

#### Directory Structure Principles

**1. Separation by Purpose**

```
skill-name/
├── SKILL.md              # Execution guide
├── reference.md          # Detailed reference
├── examples.md           # Use cases
│
├── scripts/              # Executable code
│   ├── __init__.py
│   ├── discovery/        # Organized by function
│   │   ├── detect.py
│   │   └── analyze.py
│   ├── generation/
│   │   ├── templates.py
│   │   └── render.py
│   └── validation/
│       └── check.py
│
├── references/           # Documentation
│   ├── api-spec.yaml
│   ├── schema.md
│   └── patterns.md
│
├── assets/               # Output resources
│   ├── templates/
│   │   └── client.jinja2
│   └── boilerplate/
│       └── config.json
│
├── knowledge/            # Deep-dive topics (Complex only)
│   ├── theory.md
│   └── advanced.md
│
└── docs/                 # Additional docs (Complex only)
    ├── migration.md
    └── troubleshooting.md
```

**2. Naming Conventions**

```python
# File names: hyphen-case
good: "api-client.py", "generate-code.sh", "user-schema.md"
bad:  "apiClient.py", "generate_code.sh", "UserSchema.md"

# Directories: singular or plural (consistent)
good: "script/", "reference/", "asset/"  # Singular
good: "scripts/", "references/", "assets/"  # Plural
bad:  "script/", "references/", "asset/"  # Mixed

# Skill names: descriptive, specific
good: "pdf-editor", "api-client-builder", "data-analyzer"
bad:  "helper", "utils", "tool"
```

**3. Logical Grouping**

```
# By function (recommended)
scripts/
├── validation/
│   ├── check_format.py
│   └── validate_schema.py
├── generation/
│   ├── generate_client.py
│   └── generate_tests.py
└── deployment/
    └── package.py

# By file type (not recommended)
scripts/
├── python/
│   ├── validator.py
│   └── generator.py
└── bash/
    └── deploy.sh
```

**4. Scalability**

```python
# Simple: Flat structure (1-2 scripts)
scripts/
├── rotate.py
└── flip.py

# Medium: Grouped (3-5 scripts)
scripts/
├── validation/
│   └── validator.py
├── generation/
│   └── generator.py
└── utils.py

# Complex: Hierarchical (5-7+ scripts)
scripts/
├── __init__.py
├── cli.py
├── core/
│   ├── __init__.py
│   ├── discovery/
│   ├── planning/
│   └── execution/
├── validation/
│   └── validators/
└── utils/
    ├── logging.py
    └── config.py
```

#### File Organization Patterns

**Pattern 1: Single Responsibility**

```
# Each file has ONE clear purpose
✅ scripts/rotate_pdf.py      # Rotates PDF
✅ scripts/merge_pdf.py       # Merges PDFs
❌ scripts/pdf_utils.py       # Vague, does everything
```

**Pattern 2: Discoverable Names**

```
# Names reveal purpose
✅ references/database-schema.md
✅ references/api-endpoints.md
❌ references/info.md
❌ references/docs.md
```

**Pattern 3: Hierarchical Depth**

```
# Optimal depth: 2-4 levels
✅ skill/scripts/validation/schema.py      # 3 levels
✅ skill/knowledge/domain/concepts.md      # 3 levels
❌ skill/src/core/lib/utils/helpers.py     # 5 levels (too deep)
❌ skill/everything.py                     # 1 level (too flat)
```

---

### 5.3 Documentation Quality

High-quality documentation writing principles.

#### Writing Style Guidelines

**1. Imperative/Infinitive Form**

```markdown
✅ Good:
To rotate an image, use the rotate.py script:
```bash
scripts/rotate.py image.png --degrees 90
```

❌ Bad:
You should rotate images by using the rotate.py script.
If you need to rotate an image, you can run...
```

**2. Specific vs Generic**

```markdown
✅ Specific:
Use this skill when:
- Converting PDF documents to images
- Rotating pages in existing PDFs
- Merging multiple PDF files into one

❌ Generic:
Use this skill when:
- Working with files
- Doing document tasks
- Processing data
```

**3. Concrete Examples**

```markdown
✅ Concrete:
Example workflow for rotating a PDF:
1. Read input PDF: `rotate.py document.pdf`
2. Specify rotation: `--degrees 90`
3. Output: `document_rotated.pdf`

❌ Abstract:
The rotation functionality allows manipulation of documents
through various parameters to achieve desired orientations.
```

#### Description Quality Checklist

**Required Elements:**

1. **What** it does (1 sentence)
2. **When** to use it (specific triggers)
3. **How** it helps (capabilities)

```yaml
description: |
  Generate API client code from OpenAPI/Swagger specifications.
  Use this skill when building REST or GraphQL API clients,
  creating SDK wrappers, or automating API integration code.
  Supports authentication flows, request/response handling,
  error management, and automatic retry logic.
```

**Quality Metrics:**

```python
def assess_description_quality(description: str) -> float:
    """
    0-100 quality score

    Criteria:
    - Length: 20-250 chars (keep concise)
    - Specificity: Concrete triggers and capabilities
    - Clarity: No jargon, clear language
    - Completeness: What, when, how
    """
    score = 0

    # Length (30 points)
    word_count = len(description.split())
    if 80 <= word_count <= 100:
        score += 30
    elif 50 <= word_count <= 150:
        score += 20
    else:
        score += 10

    # Specificity (30 points)
    trigger_keywords = ["when", "for", "use this"]
    capability_keywords = ["supports", "provides", "enables"]

    triggers_present = any(kw in description.lower() for kw in trigger_keywords)
    capabilities_present = any(kw in description.lower() for kw in capability_keywords)

    if triggers_present and capabilities_present:
        score += 30
    elif triggers_present or capabilities_present:
        score += 15

    # Clarity (20 points)
    # Check for jargon, unclear terms
    clarity_score = assess_clarity(description)
    score += clarity_score

    # Completeness (20 points)
    has_what = contains_purpose(description)
    has_when = contains_triggers(description)
    has_how = contains_capabilities(description)

    completeness = sum([has_what, has_when, has_how]) / 3 * 20
    score += completeness

    return score
```

#### Documentation Structure

**SKILL.md Sections:**

```markdown
# Required Sections (all skills)
1. Quick Start (2-3 sentences)
2. When to Use This Skill (bulleted triggers)
3. Core Workflow (step-by-step)
4. Resources (if bundled resources exist)

# Optional Sections (as needed)
5. Quick Reference (common operations)
6. Modes Overview (for multi-mode skills)
7. Configuration (if configurable)
8. Troubleshooting Basics (common issues)
```

**reference.md Sections:**

```markdown
# Standard Sections
1. Table of Contents (auto-generated)
2. Detailed Workflows (mode-specific or phase-specific)
3. Algorithms & Pseudocode
4. Configuration Reference
5. API Reference (if applicable)
6. Advanced Features
7. Troubleshooting
8. FAQ
```

**examples.md Sections:**

```markdown
# Per Example Structure
## Example N: [Use Case Title]

### Requirements
[What's needed for this example]

### Workflow
[Step-by-step execution]

### Input
[Concrete input data/files]

### Output
[Expected results]

### Notes
[Edge cases, variations, tips]
```

#### Cross-Reference Best Practices

**Internal Links:**

```markdown
✅ Good:
For detailed workflow, see reference.md > "CREATE Mode Workflow"
For examples, see examples.md > Example 2 (Medium Complexity)

❌ Bad:
See the reference doc for more info
Check the examples
```

**External Links:**

```markdown
✅ Good:
This follows the [OpenAPI 3.0 Specification](https://spec.openapis.org/oas/v3.0.0)

❌ Bad:
Based on OpenAPI spec (no link)
```

**Script References:**

```markdown
✅ Good:
Use `scripts/generate.py` to create client code:
```bash
scripts/generate.py --spec api.yaml --output client/
```

❌ Bad:
Run the generator script with appropriate parameters
```

---

**End of Reference Document**

This reference.md contains all mode-specific detailed workflows, complexity evaluation algorithms, validation system, advanced features, and best practices for skill-constructor.
