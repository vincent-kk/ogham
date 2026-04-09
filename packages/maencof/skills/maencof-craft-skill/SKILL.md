---
name: maencof-craft-skill
user_invocable: true
description: "[maencof:maencof-craft-skill] Creates, refactors, improves, or fixes Claude Code skills. Supports four modes: CREATE with complexity-aware scaffolding, REFACTOR, IMPROVE, and FIX with automated validation."
argument-hint: "[request describing what to create/refactor/improve/fix]"
version: "2.0.0"
complexity: complex
context_layers: []
orchestrator: configurator
plugin: maencof
---

# Skill Constructor

## When to Use

### Auto-trigger Conditions

Claude automatically invokes this skill when:

- The user mentions creating a new skill or building a skill from scratch (CREATE)
- An existing skill needs structural reorganization or simplification (REFACTOR)
- A skill needs new features, capabilities, or enhancements added (IMPROVE)
- A skill has bugs, validation failures, or behavioral issues to fix (FIX)

### Manual Invocation

```
/maencof:maencof-craft-skill [request describing what to create/refactor/improve/fix]
```

## Overview

Intelligent skill engineering system that transforms skill creation from manual scaffolding into a systematic workflow with mode-based operation, complexity-aware structuring, and automated validation.

## Four Operating Modes

### CREATE Mode

**Triggers**: "create new skill", "build skill", "initialize"

Build new skills through systematic requirements discovery, complexity evaluation, and automated structure generation.

**Quick Process**:

1. Requirements Discovery → Gather concrete examples and identify reusable resources
2. Complexity Evaluation → Calculate score and recommend structure
3. Structure Generation → Create directory hierarchy based on complexity
4. Implementation → Build SKILL.md, scripts, references, examples
5. Automated Validation → Run comprehensive checks
6. Intelligent Deployment → Package and distribute

### REFACTOR Mode

**Triggers**: "refactor skill", "restructure", "reorganize"

Transform existing skills to improved structure while preserving functionality.

**Quick Process**:

1. Current Structure Analysis → Assess issues and complexity
2. Refactoring Plan → Generate diff preview and get approval
3. Diff-based Transformation → Execute structural changes
4. Validation & Testing → Verify correctness
5. Impact Analysis → Measure improvements
6. Deployment → Package with migration guide

### IMPROVE Mode

**Triggers**: "improve skill", "add feature", "enhance"

Extend skills with new capabilities while maintaining backward compatibility.

**Quick Process**:

1. Enhancement Analysis → Understand request and assess complexity change
2. Feature Planning → Design integration approach
3. Incremental Implementation → Add resources and update documentation
4. Integration Validation → Test new and existing features
5. Version Management → Update version and changelog
6. Deployment → Package with upgrade guide

### FIX Mode

**Triggers**: "fix bug", "resolve issue", "debug"

Repair skill issues with minimal changes and comprehensive testing.

**Quick Process**:

1. Issue Diagnosis → Locate root cause
2. Minimal Fix Design → Plan smallest possible fix
3. Targeted Implementation → Apply fix
4. Regression Testing → Verify fix and unchanged behavior
5. Documentation Update → Update docs and troubleshooting
6. Hotfix Deployment → Package and distribute

## Core Workflow

All modes follow a consistent 6-phase pattern:

**Phase 0: Mode Detection**

- Analyze user request and context
- Select appropriate mode (CREATE/REFACTOR/IMPROVE/FIX)
- Clarify if ambiguous

**Phases 1-6: Mode-Specific Execution**

- Each mode implements its specialized workflow
- Complexity evaluation guides structure decisions
- Automated validation ensures quality
- Deployment helpers package and distribute

See **reference.md** for detailed phase-by-phase workflows for each mode.

## Complexity Evaluation

Skills are automatically categorized by complexity score (0-1+):

### Formula

```
complexity = (file_count/20 × 0.3) + (mcp_integration × 0.2)
           + (workflow_steps/10 × 0.1) + (conditionals/15 × 0.15)
           + (external_deps/5 × 0.25)
```

### Categories

**Simple (< 0.4)**

- Structure: SKILL.md + basic scripts
- Size: 2-3k words
- Example: image-rotator, single-purpose tools

**Medium (0.4-0.7)**

- Structure: SKILL.md + reference.md + examples.md + scripts
- Size: 3-4k words SKILL.md
- Example: api-client-builder, multi-step workflows

**Complex (> 0.7)**

- Structure: Full hierarchy (SKILL.md + reference.md + examples.md + knowledge/ + docs/)
- Size: 4-5k words SKILL.md (compressed)
- Example: full-stack-generator, MCP-integrated skills

See **reference.md** for detailed complexity formula, examples, and tuning guidelines.

## Resources

### reference.md

Comprehensive reference documentation covering:

- Detailed Phase 0-6 workflows for all four modes
- Complexity evaluation formula with examples
- Validation rules and quality standards
- Advanced features (Multi-turn Refinement, Version Management, Diff-based Refactoring, Impact Analysis, Automated Deprecation)
- Algorithms and implementation details

Load reference.md when executing skill construction workflows or when detailed process guidance is needed.

### examples.md

Real-world skill creation examples:

- Simple skill: image-rotator (score 0.28)
- Medium skill: api-client-builder (score 0.52)
- Complex skill: full-stack-generator (score 0.81)
- REFACTOR mode: Slimming down large SKILL.md
- IMPROVE mode: Adding MCP integration
- FIX mode: Correcting validation logic

Load examples.md when learning skill construction patterns or seeking concrete implementation guidance.

### knowledge/

Deep-dive topics for advanced skill engineering:

- **skill-anatomy.md**: Structural theory and design patterns
- **progressive-disclosure.md**: 3-layer loading system principles
- **mcp-integration.md**: MCP server integration patterns
- **bundled-resources.md**: scripts/, references/, assets/ design
- **quality-standards.md**: Quality metrics and best practices

Load knowledge/ files when designing complex skills or establishing architectural patterns.

### scripts/

Automation tools for skill construction:

- **mode_detector.py**: Detect CREATE/REFACTOR/IMPROVE/FIX from context
- **complexity_scorer.py**: Calculate complexity and recommend structure
- **structure_generator.py**: Generate directory hierarchy
- **enhanced_validator.py**: Comprehensive validation checks
- **init_skill.py**: Enhanced skill initialization
- **package_skill.py**: Validation + packaging
- **deployment_helper.py**: Intelligent deployment support
- **quick_validate.py**: Quick validation shortcut

Execute scripts directly without loading into context for efficiency.

### docs/

Supplementary documentation:

- **migration-guide.md**: Migrating existing skills to v2.0
- **mode-comparison.md**: Detailed comparison of four modes
- **complexity-tuning.md**: Customizing complexity formula
- **troubleshooting.md**: Common issues and solutions
- **advanced-patterns.md**: Advanced techniques and anti-patterns

Load docs/ when handling special cases or troubleshooting.

## Quick Reference

### Starting a New Skill (CREATE Mode)

```
1. Gather 3-5 concrete usage examples
2. Run: scripts/complexity_scorer.py --interactive
3. Run: scripts/structure_generator.py --name <name> --complexity <level> --path ./
4. Implement: SKILL.md, scripts, references (based on complexity)
5. Validate: scripts/enhanced_validator.py <skill-path>
6. Package: scripts/package_skill.py <skill-path>
```

### Restructuring a Skill (REFACTOR Mode)

```
1. Analyze current structure and complexity
2. Generate refactoring plan with diff preview
3. Get user approval
4. Execute transformations
5. Validate and measure impact
6. Package with migration guide
```

### Adding Features (IMPROVE Mode)

```
1. Assess complexity impact
2. Plan feature integration
3. Implement incrementally
4. Validate (new + existing features)
5. Update version and changelog
6. Package with upgrade guide
```

### Fixing Issues (FIX Mode)

```
1. Diagnose root cause
2. Design minimal fix
3. Apply targeted changes
4. Regression test
5. Update documentation
6. Package hotfix
```

## Progressive Disclosure Design

Skills use a 3-layer loading system for context efficiency:

**Layer 1: Metadata** (Always loaded, ~100 words)

- name + description in YAML frontmatter
- Enables skill discovery and matching

**Layer 2: SKILL.md** (Loaded when triggered, <5k words)

- Core workflow and resource index
- Quick reference for execution

**Layer 3: Deep Resources** (On-demand, unlimited)

- reference.md, examples.md, knowledge/, scripts/, docs/
- Loaded selectively as needed

Keep SKILL.md under 5k words by moving detailed content to reference.md and examples.md.

## Validation Checklist

Before packaging, ensure:

- **YAML Frontmatter**: Starts with `---`, contains name (hyphen-case) and description (>50 words), no angle brackets in description
- **File Structure**: SKILL.md exists and is <5k words, referenced files exist, scripts are executable
- **Content Quality**: Imperative/infinitive writing style, clear workflow structure, valid resource references, complete examples
- **Organization**: Proper directory hierarchy, no duplicate information, clear separation of concerns

Run `scripts/enhanced_validator.py <skill-path>` for automated validation.

## Quality Standards

**SKILL.md Requirements**:

- Size: <5k words (strict limit)
- Style: Imperative/infinitive form ("To do X..." not "You should...")
- Structure: Clear sections with workflow guidance
- References: Index all bundled resources

**Script Requirements**:

- Executable permissions (chmod +x)
- Docstrings for all functions
- Error handling
- Type hints (Python 3.8+)

**Documentation Requirements**:

- Clear heading hierarchy
- Table of contents for long docs
- Inline examples
- No broken references

See **knowledge/quality-standards.md** for comprehensive standards.

## Support

**For detailed workflows**: Load reference.md
**For usage examples**: Load examples.md
**For architectural guidance**: Load knowledge/\*.md
**For troubleshooting**: Load docs/troubleshooting.md
**For migration help**: Load docs/migration-guide.md

**Automated assistance**:

- Mode detection: `scripts/mode_detector.py --request "<request>" [--skill-path <path>]`
- Complexity scoring: `scripts/complexity_scorer.py --interactive`
- Validation: `scripts/enhanced_validator.py <skill-path>`
- Packaging: `scripts/package_skill.py <skill-path>`

All scripts provide JSON output for programmatic use and human-readable reports for manual review.
