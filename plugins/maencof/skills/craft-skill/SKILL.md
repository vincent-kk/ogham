---
name: craft-skill
user_invocable: true
description: '[maencof:craft-skill] Creates, refactors, improves, or fixes Claude Code skills. Supports four modes: CREATE with complexity-aware scaffolding, REFACTOR, IMPROVE, and FIX with automated validation.'
argument-hint: '[request describing what to create/refactor/improve/fix]'
version: '2.0.0'
complexity: complex
context_layers: []
orchestrator: configurator
plugin: maencof
---

# Craft Skill

> Standalone adaptation of the skill-constructor concept. Mode detection, complexity scoring, and structure generation are performed inline by the model; `enhanced_validator.mjs` is the one bundled deterministic gate.

Intelligent skill engineering system that transforms skill creation from manual scaffolding into a systematic workflow with mode-based operation, complexity-aware structuring, and automated validation.

## When to Use

### Auto-trigger Conditions

Claude automatically invokes this skill when:

- The user mentions creating a new skill or building a skill from scratch (CREATE)
- An existing skill needs structural reorganization or simplification (REFACTOR)
- A skill needs new features, capabilities, or enhancements added (IMPROVE)
- A skill has bugs, validation failures, or behavioral issues to fix (FIX)

## Overview

craft-skill provides four specialized operating modes for different skill development scenarios:

- **CREATE**: Build new skills from requirements to deployment
- **REFACTOR**: Restructure existing skills for better organization
- **IMPROVE**: Add features and enhance capabilities
- **FIX**: Debug and repair skill issues

Each mode follows a 6-phase workflow optimized for its specific purpose, with automatic complexity evaluation and structure generation.

## Four Operating Modes

### CREATE Mode

**Triggers**: "create new skill", "build skill", "initialize"

Build new skills through systematic requirements discovery, complexity evaluation, and automated structure generation.

**Quick Process**:

1. Requirements Discovery → Gather concrete examples and identify reusable resources
2. Complexity Evaluation → Evaluate complexity inline and recommend structure
3. Structure Generation → Lay out the directory hierarchy inline based on complexity
4. Implementation → Build SKILL.md, scripts, references, examples
5. Automated Validation → Run `node scripts/enhanced_validator.mjs <skill-path>`
6. Finalize → Confirm the skill directory is complete (deploy by copying the directory)

### REFACTOR Mode

**Triggers**: "refactor skill", "restructure", "reorganize"

Transform existing skills to improved structure while preserving functionality.

**Quick Process**:

1. Current Structure Analysis → Assess issues and complexity
2. Refactoring Plan → Generate diff preview and get approval
3. Diff-based Transformation → Execute structural changes
4. Validation & Testing → Verify correctness with `enhanced_validator.mjs`
5. Impact Analysis → Measure improvements
6. Finalize → Summarize structural changes for the user

### IMPROVE Mode

**Triggers**: "improve skill", "add feature", "enhance"

Extend skills with new capabilities while maintaining backward compatibility.

**Quick Process**:

1. Enhancement Analysis → Understand request and assess complexity change
2. Feature Planning → Design integration approach
3. Incremental Implementation → Add resources and update documentation
4. Integration Validation → Test new and existing features
5. Version Management → Update version and changelog
6. Finalize → Note new capabilities and any backward-compatibility caveats

### FIX Mode

**Triggers**: "fix bug", "resolve issue", "debug"

Repair skill issues with minimal changes and comprehensive testing.

**Quick Process**:

1. Issue Diagnosis → Locate root cause
2. Minimal Fix Design → Plan smallest possible fix
3. Targeted Implementation → Apply fix
4. Regression Testing → Verify fix and unchanged behavior
5. Documentation Update → Update affected docs
6. Finalize → Confirm the fix and its narrow surface area

## Core Workflow

All modes follow a consistent 6-phase pattern:

**Phase 0: Mode Detection**

- Analyze user request and context inline
- Select appropriate mode (CREATE/REFACTOR/IMPROVE/FIX)
- Clarify if ambiguous

**Phases 1-6: Mode-Specific Execution**

- Each mode implements its specialized workflow
- Inline complexity evaluation guides structure decisions
- `enhanced_validator.mjs` provides the deterministic quality gate
- Skills deploy by copying their directory — no packaging step

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

- Structure: Full hierarchy (SKILL.md + reference.md + examples.md + scripts/; optionally deeper topic or supplementary docs)
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

### scripts/

The one bundled deterministic tool:

- **enhanced_validator.mjs**: Comprehensive validation checks for any skill directory

Run it with `node scripts/enhanced_validator.mjs <skill-path>` without loading it into context.

## Quick Reference

### Starting a New Skill (CREATE Mode)

```
1. Gather 3-5 concrete usage examples
2. Evaluate complexity inline (see Complexity Evaluation)
3. Lay out the directory structure inline based on complexity
4. Implement: SKILL.md, scripts, references (based on complexity)
5. Validate: node scripts/enhanced_validator.mjs <skill-path>
6. Deploy by copying the skill directory into place
```

### Restructuring a Skill (REFACTOR Mode)

```
1. Analyze current structure and complexity
2. Generate refactoring plan with diff preview
3. Get user approval
4. Execute transformations
5. Validate and measure impact
6. Summarize structural changes
```

### Adding Features (IMPROVE Mode)

```
1. Assess complexity impact
2. Plan feature integration
3. Implement incrementally
4. Validate (new + existing features)
5. Update version and changelog
6. Note new capabilities and caveats
```

### Fixing Issues (FIX Mode)

```
1. Diagnose root cause
2. Design minimal fix
3. Apply targeted changes
4. Regression test
5. Update documentation
6. Confirm the narrow fix surface
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

- reference.md, examples.md, scripts/
- Loaded selectively as needed

Keep SKILL.md under 5k words by moving detailed content to reference.md and examples.md.

## Validation Checklist

Before packaging, ensure:

✅ **YAML Frontmatter**

- Starts with `---`
- Contains name (hyphen-case) and description (>20 chars, <=250 chars recommended)
- No angle brackets in description
- `argument-hint` present if skill body references `$ARGUMENTS` or supports subcommands/flags

✅ **File Structure**

- SKILL.md exists and is <5k words
- Referenced files exist (reference.md, examples.md, etc.)
- Scripts run under Node (`.mjs`, ESM) with a `#!/usr/bin/env node` shebang

✅ **Content Quality**

- Imperative/infinitive writing style
- Clear workflow structure
- Valid resource references
- Complete examples

✅ **Organization**

- Proper directory hierarchy
- No duplicate information
- Clear separation of concerns

Run `node scripts/enhanced_validator.mjs <skill-path>` for automated validation.

## Quality Standards

**SKILL.md Requirements**:

- Size: <5k words (strict limit)
- Style: Imperative/infinitive form ("To do X..." not "You should...")
- Structure: Clear sections with workflow guidance
- References: Index all bundled resources

**Script Requirements**:

- ESM modules (.mjs) with a `#!/usr/bin/env node` shebang
- Node.js built-in imports (no inline interpreters)
- JSDoc comments for all functions
- Error handling

**Documentation Requirements**:

- Clear heading hierarchy
- Table of contents for long docs
- Inline examples
- No broken references

## Support

**For detailed workflows**: Load reference.md
**For usage examples**: Load examples.md

**Automated assistance**:

- Mode detection, complexity scoring, and structure generation: performed inline by the model (see Four Operating Modes and Complexity Evaluation)
- Validation: `node scripts/enhanced_validator.mjs <skill-path>`

The validator emits JSON output for programmatic use and a human-readable report for manual review.
