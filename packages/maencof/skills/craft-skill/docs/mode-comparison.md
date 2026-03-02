# Mode Comparison Guide

## Overview

skill-constructor 2.0 operates in **four distinct modes**, each optimized for specific skill lifecycle scenarios. This guide helps you choose the right mode and understand the differences.

---

## Quick Decision Tree

```
┌─────────────────────────────────────┐
│   Does the skill already exist?    │
└────────┬───────────────────┬────────┘
         NO                  YES
         │                   │
         ▼                   ▼
    ┌────────┐    ┌──────────────────────┐
    │ CREATE │    │ What do you need?    │
    └────────┘    └──────┬───────────────┘
                         │
        ┌────────────────┼────────────────┬────────────────┐
        │                │                │                │
        ▼                ▼                ▼                ▼
  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Structure│    │  Add      │    │  Quick   │    │ New Skill│
  │  better  │    │ features  │    │   fix    │    │ from old │
  └─────┬────┘    └─────┬────┘    └─────┬────┘    └─────┬────┘
        │               │               │               │
        ▼               ▼               ▼               ▼
   REFACTOR         IMPROVE           FIX           CREATE
```

---

## Mode Comparison Table

| Aspect | CREATE | REFACTOR | IMPROVE | FIX |
|--------|--------|----------|---------|-----|
| **Primary Goal** | New skill creation | Structure improvement | Feature expansion | Bug resolution |
| **Existing Skill** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **Scope** | Complete new skill | File reorganization | Incremental additions | Minimal targeted fix |
| **Risk Level** | Low (new) | Medium (transformative) | Low-Medium (additive) | Low (surgical) |
| **Time Estimate** | 30min - 3hrs | 1-4hrs | 30min - 2hrs | 15min - 1hr |
| **Breaking Changes** | N/A | Possible | Rare | Never |
| **Phases** | 6 phases | 6 phases | 6 phases | 6 phases |
| **Validation** | Full | Full | Full + Regression | Full + Regression |
| **Version Bump** | 1.0.0 | 2.0.0 (major) | 1.X.0 (minor) | 1.0.X (patch) |

---

## Detailed Mode Breakdown

### CREATE Mode

**When to Use:**
- Starting a completely new skill
- No existing skill directory
- Fresh requirements gathering needed

**Trigger Keywords:**
- "create new skill"
- "build skill"
- "initialize skill"
- "start skill"

**Process Flow:**
```
Phase 0: Mode Detection
  └─ Confirm: No existing skill → CREATE mode

Phase 1: Requirements Discovery (Interactive)
  ├─ Ask: What should this skill do? (3-5 concrete examples)
  ├─ Ask: What triggers this skill? (activation patterns)
  ├─ Identify: Reusable resources needed (scripts/references/assets)
  └─ Output: Requirements document

Phase 2: Complexity Evaluation
  ├─ Run: complexity_scorer.py
  ├─ Calculate: Based on files, MCP, workflow, conditionals, deps
  ├─ Categorize: Simple (<0.4) | Medium (0.4-0.7) | Complex (>0.7)
  └─ Output: Complexity score + structure recommendation

Phase 3: Structure Generation
  ├─ Simple: SKILL.md + scripts/ (1-2)
  ├─ Medium: + reference.md + examples.md + scripts/ (3-5)
  ├─ Complex: + knowledge/ (5) + docs/ (5) + scripts/ (5-7+)
  └─ Output: Directory structure with template files

Phase 4: Implementation
  ├─ Write SKILL.md (<5k words)
  ├─ Create scripts (functional, executable)
  ├─ Write reference.md (if complexity ≥ 0.4)
  ├─ Write examples.md (if complexity ≥ 0.4)
  └─ Create knowledge/ + docs/ (if complexity > 0.7)

Phase 5: Automated Validation
  ├─ Run: enhanced_validator.py
  ├─ Check: YAML, naming, size, organization, references
  ├─ If failed → Iterate Phase 4
  └─ Output: Validation report

Phase 6: Intelligent Deployment
  ├─ Package: skill.zip
  ├─ Generate: INSTALL.md
  ├─ Suggest: Deployment location
  └─ Output: Distributable package
```

**Input Example:**
```
User: "Create a new skill for converting Markdown to PDF with custom styling"

Claude (CREATE mode):
1. Requirements Discovery:
   - What styling options? (fonts, colors, layouts)
   - What PDF features? (TOC, page numbers, headers/footers)
   - Any dependencies? (pandoc, wkhtmltopdf, LaTeX)

2. Complexity Evaluation:
   - Files: 5 (SKILL.md, reference.md, examples.md, 2 scripts)
   - MCP: No
   - Workflow: 4 steps
   - Conditionals: 3 (styling options)
   - Deps: 2 (pandoc, python-markdown)
   - Score: 0.48 → Medium complexity

3. Structure: Medium (SKILL.md + reference.md + examples.md + scripts/)
4. Implementation: [Creates all files]
5. Validation: [Runs checks]
6. Deployment: [Packages skill]
```

**Output:**
- New skill directory with appropriate structure
- Version: 1.0.0
- All files populated with content
- Ready for use

---

### REFACTOR Mode

**When to Use:**
- Improving existing skill structure
- SKILL.md too large (>5k words)
- Poor organization
- Missing progressive disclosure

**Trigger Keywords:**
- "refactor skill"
- "restructure skill"
- "reorganize skill"
- "clean up structure"

**Process Flow:**
```
Phase 0: Mode Detection
  └─ Existing skill + "refactor" keywords → REFACTOR mode

Phase 1: Current Structure Analysis
  ├─ Read: All existing files
  ├─ Assess: Current complexity score
  ├─ Identify: Structural issues
  │   ├─ SKILL.md too large (>5k words)?
  │   ├─ Missing layer separation?
  │   ├─ Poor resource organization?
  │   └─ Inadequate documentation?
  └─ Output: Refactoring assessment report

Phase 2: Refactoring Plan
  ├─ Propose: New structure based on complexity
  ├─ Generate: Diff preview
  │   ├─ Files to create (reference.md, examples.md)
  │   ├─ Content to move (SKILL.md → reference.md)
  │   ├─ Files to reorganize (scripts/)
  │   └─ Files to delete (if redundant)
  ├─ Get: User approval
  └─ Output: Approved refactoring plan

Phase 3: Diff-based Transformation
  ├─ Execute: Transformations
  │   ├─ Extract: SKILL.md → reference.md
  │   ├─ Create: examples.md from inline examples
  │   ├─ Organize: knowledge/ from scattered info
  │   ├─ Reorganize: scripts/ by function
  │   └─ Update: Cross-references
  ├─ Preserve: All functionality, script behavior, interfaces
  └─ Output: Refactored structure

Phase 4: Validation & Testing
  ├─ Run: enhanced_validator.py
  ├─ Test: Script executability
  ├─ Verify: Resource references
  ├─ Check: Backward compatibility
  └─ Output: Validation report

Phase 5: Impact Analysis
  ├─ Compare: Before/after metrics
  │   ├─ SKILL.md size reduction
  │   ├─ Organization improvement
  │   ├─ Maintainability score
  │   └─ Load time estimate
  └─ Output: Impact analysis report

Phase 6: Deployment
  ├─ Create: Migration guide
  ├─ Package: Refactored skill
  ├─ Provide: Rollback instructions
  └─ Output: Package + migration docs
```

**Input Example:**
```
User: "Refactor the api-client skill - SKILL.md is 12k words"

Claude (REFACTOR mode):
1. Analysis:
   - Current: 12k words, no reference.md
   - Issues: Too large, poor progressive disclosure
   - Complexity: 0.55 (medium)

2. Plan:
   - Extract 7k words → reference.md (detailed workflows)
   - Create examples.md (2k words)
   - Compress SKILL.md to 4.5k words
   - Reorganize scripts/ (group by function)

3. Preview:
   [Shows diff of changes]

4. User approves → Execute transformation
5. Validate: All checks pass ✅
6. Impact: 62% load time reduction, 100% quality score
```

**Output:**
- Restructured skill with layered organization
- Version: 2.0.0 (breaking structural change)
- SKILL.md: 4.5k words (was 12k)
- Migration guide included

---

### IMPROVE Mode

**When to Use:**
- Adding new features to existing skill
- Enhancing current functionality
- Extending capabilities
- Upgrading dependencies

**Trigger Keywords:**
- "improve skill"
- "add feature"
- "enhance skill"
- "extend skill"

**Process Flow:**
```
Phase 0: Mode Detection
  └─ Existing skill + "improve/add/enhance" keywords → IMPROVE mode

Phase 1: Enhancement Analysis
  ├─ Understand: Improvement request
  ├─ Analyze: Existing functionality
  ├─ Identify: Extension points
  ├─ Assess: Complexity change
  │   ├─ Current complexity score
  │   ├─ Projected complexity score
  │   └─ Structure adjustment needed?
  └─ Output: Enhancement plan

Phase 2: Feature Planning
  ├─ Design: New feature
  │   ├─ New scripts needed?
  │   ├─ New references needed?
  │   ├─ SKILL.md updates needed?
  │   └─ Breaking changes?
  ├─ Plan: Integration
  │   ├─ Backward compatibility
  │   ├─ Documentation updates
  │   └─ Example additions
  └─ Output: Feature specification

Phase 3: Incremental Implementation
  ├─ Add: New resources
  │   ├─ scripts/ additions
  │   ├─ references/ additions
  │   └─ assets/ additions
  ├─ Update: SKILL.md
  │   ├─ Add feature description
  │   ├─ Update workflow
  │   └─ Maintain <5k words (move to reference.md if exceeded)
  └─ Output: Enhanced skill

Phase 4: Integration Validation
  ├─ Test: New features
  ├─ Test: Existing features (regression)
  ├─ Validate: Documentation
  ├─ Check: Complexity score
  │   └─ If jumped category → Suggest refactoring
  └─ Output: Validation report

Phase 5: Version Management
  ├─ Update: Version metadata
  ├─ Document: Changes (CHANGELOG)
  ├─ Tag: Release
  └─ Output: Version documentation

Phase 6: Deployment
  ├─ Package: Enhanced skill
  ├─ Generate: Upgrade guide
  └─ Output: Enhanced package + docs
```

**Input Example:**
```
User: "Add JSON schema validation to the api-client skill"

Claude (IMPROVE mode):
1. Enhancement Analysis:
   - Current: Basic API client generation
   - Add: JSON schema validation support
   - Complexity: 0.52 → 0.58 (still medium)

2. Feature Planning:
   - New script: scripts/schema_validator.py
   - Update: SKILL.md workflow (add validation step)
   - New example: examples.md (schema validation example)
   - Breaking: No

3. Implementation:
   - Create: schema_validator.py
   - Update: SKILL.md (add Phase 2.5: Schema Validation)
   - Add: Example in examples.md
   - SKILL.md: 4.2k → 4.5k words (still <5k ✅)

4. Validation:
   - New feature: Works ✅
   - Existing features: All pass ✅
   - Complexity: 0.58 (medium, no structure change needed)

5. Version: 1.1.0 (minor feature addition)
6. Package + upgrade guide
```

**Output:**
- Enhanced skill with new feature
- Version: 1.1.0 (minor bump)
- Backward compatible
- CHANGELOG updated

---

### FIX Mode

**When to Use:**
- Fixing bugs in existing skill
- Correcting documentation errors
- Resolving validation failures
- Patching script issues

**Trigger Keywords:**
- "fix bug"
- "resolve issue"
- "debug"
- "error"
- "broken"

**Process Flow:**
```
Phase 0: Mode Detection
  └─ Existing skill + "fix/bug/issue" keywords → FIX mode

Phase 1: Issue Diagnosis
  ├─ Understand: Reported issue
  ├─ Locate: Problematic code/documentation
  ├─ Identify: Root cause
  │   ├─ Script logic error?
  │   ├─ Documentation inaccuracy?
  │   ├─ Resource reference broken?
  │   └─ Validation rule issue?
  └─ Output: Diagnosis report

Phase 2: Minimal Fix Design
  ├─ Design: Smallest possible fix
  ├─ Avoid: Scope creep
  ├─ Preserve: Existing behavior
  └─ Output: Fix specification

Phase 3: Targeted Implementation
  ├─ Apply: Fix
  │   ├─ Script patch
  │   ├─ Documentation correction
  │   └─ Resource update
  ├─ Principle: Minimal surface area
  └─ Output: Fixed skill

Phase 4: Regression Testing
  ├─ Test: Fixed behavior
  ├─ Test: Unchanged behavior
  ├─ Run: enhanced_validator.py
  └─ Output: Test report

Phase 5: Documentation Update
  ├─ Update: Relevant docs
  ├─ Add: To troubleshooting guide
  ├─ Update: Examples if needed
  └─ Output: Updated documentation

Phase 6: Hotfix Deployment
  ├─ Package: Fixed skill
  ├─ Generate: Fix notes
  ├─ Tag: Hotfix version
  └─ Output: Hotfix package + notes
```

**Input Example:**
```
User: "Fix bug in api-client: validation script crashes on empty response"

Claude (FIX mode):
1. Diagnosis:
   - Issue: scripts/validator.py line 45
   - Root cause: Missing null check before json.loads()
   - Impact: Crashes on empty API responses

2. Minimal Fix:
   - Add: if response.text check before parsing
   - Lines changed: 2
   - No behavior changes for valid responses

3. Implementation:
   ```python
   # Before
   data = json.loads(response.text)

   # After
   if not response.text:
       return {"error": "Empty response"}
   data = json.loads(response.text)
   ```

4. Testing:
   - Fixed: Empty response handling ✅
   - Regression: Valid responses still work ✅
   - Validation: Passes ✅

5. Documentation:
   - Update: troubleshooting.md (add empty response issue)
   - CHANGELOG: "Fixed crash on empty API responses"

6. Version: 1.0.1 (patch)
```

**Output:**
- Fixed skill with minimal changes
- Version: 1.0.1 (patch bump)
- Regression tested
- Troubleshooting docs updated

---

## Phase Comparison Across Modes

### Phase 0: Mode Detection
| Mode | Detection Logic |
|------|----------------|
| CREATE | No existing skill |
| REFACTOR | Existing + "refactor/restructure/reorganize" |
| IMPROVE | Existing + "improve/add/enhance/extend" |
| FIX | Existing + "fix/bug/issue/error/broken" |

### Phase 1: Analysis/Discovery
| Mode | Focus |
|------|-------|
| CREATE | **Requirements Discovery** - What should it do? |
| REFACTOR | **Structure Analysis** - What's wrong with current structure? |
| IMPROVE | **Enhancement Analysis** - What feature to add? |
| FIX | **Issue Diagnosis** - What's broken and why? |

### Phase 2: Planning
| Mode | Output |
|------|--------|
| CREATE | **Complexity Evaluation** + structure recommendation |
| REFACTOR | **Refactoring Plan** + diff preview |
| IMPROVE | **Feature Specification** + integration plan |
| FIX | **Fix Design** + minimal change spec |

### Phase 3: Implementation
| Mode | Scope |
|------|-------|
| CREATE | **Full skill creation** - all files |
| REFACTOR | **Structure transformation** - reorganize existing |
| IMPROVE | **Incremental addition** - add new features |
| FIX | **Targeted patch** - minimal changes |

### Phase 4: Validation
| Mode | Testing Scope |
|------|--------------|
| CREATE | Full validation (new skill) |
| REFACTOR | Full + backward compatibility |
| IMPROVE | Full + regression testing |
| FIX | Full + regression testing |

### Phase 5: Documentation/Analysis
| Mode | Focus |
|------|-------|
| CREATE | **Validation results** |
| REFACTOR | **Impact Analysis** - before/after metrics |
| IMPROVE | **Version Management** - CHANGELOG |
| FIX | **Documentation Update** - troubleshooting |

### Phase 6: Deployment
| Mode | Package Type |
|------|-------------|
| CREATE | New skill (v1.0.0) |
| REFACTOR | Migration guide + rollback (v2.0.0) |
| IMPROVE | Upgrade guide (v1.X.0) |
| FIX | Fix notes (v1.0.X) |

---

## When to Switch Modes

### CREATE → REFACTOR
**Scenario:** Created a skill, but it grew too large
```
Initial CREATE: skill v1.0.0 (SKILL.md = 3k words)
After 6 months: SKILL.md = 8k words
Action: REFACTOR to extract to reference.md
Result: skill v2.0.0 (layered structure)
```

### IMPROVE → REFACTOR
**Scenario:** Added features, complexity jumped categories
```
Before IMPROVE: Medium complexity (0.52)
After IMPROVE: Complex complexity (0.78)
Action: REFACTOR to add knowledge/ and docs/
Result: skill v2.0.0 (full hierarchy)
```

### FIX → IMPROVE
**Scenario:** Fix reveals need for better feature
```
Initial: FIX bug in validation
Realize: Validation should be more robust
Action: IMPROVE with enhanced validation
Result: skill v1.1.0 (better feature)
```

### Any → CREATE
**Scenario:** Skill needs complete rewrite
```
Old skill: Too messy to refactor
Decision: Start fresh with lessons learned
Action: CREATE new v2.0.0 from scratch
Result: Clean, well-structured skill
```

---

## Mode Selection Flowchart

```
                    ┌─────────────────────┐
                    │  Skill Task Needed  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Does skill exist?   │
                    └──┬──────────────┬───┘
                       │ NO           │ YES
                       ▼              ▼
                  ┌────────┐    ┌─────────────────┐
                  │ CREATE │    │ What's the goal?│
                  └────────┘    └────┬────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
         ┌────────────────┐  ┌──────────────┐  ┌──────────────┐
         │ Better structure? REFACTOR       │ Add features?  │ Fix bug?
         └────────────────┘  └──────────────┘  └──────┬───────┘
                  │                  │                 │
                  ▼                  ▼                 ▼
             REFACTOR            IMPROVE             FIX
                  │                  │                 │
                  └──────────┬───────┴─────────────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Execute mode workflow│
                  └──────────────────────┘
```

---

## Common Patterns

### Pattern 1: CREATE → IMPROVE → REFACTOR
```
Year 1: CREATE skill v1.0.0 (simple)
Year 1-2: IMPROVE add features → v1.1.0, v1.2.0, v1.3.0
Year 2: REFACTOR to handle complexity → v2.0.0
```

### Pattern 2: CREATE → FIX → FIX → IMPROVE
```
Month 1: CREATE skill v1.0.0
Month 2: FIX bug → v1.0.1
Month 3: FIX another bug → v1.0.2
Month 4: IMPROVE with better design → v1.1.0
```

### Pattern 3: CREATE → REFACTOR → IMPROVE
```
Week 1: CREATE skill v1.0.0 (rapid prototype)
Week 2: REFACTOR for production quality → v2.0.0
Week 3+: IMPROVE add features → v2.1.0, v2.2.0
```

---

## Best Practices by Mode

### CREATE Mode
✅ **Do:**
- Gather comprehensive requirements upfront
- Assess complexity accurately
- Follow recommended structure
- Write clear examples
- Validate thoroughly

❌ **Don't:**
- Rush into implementation without planning
- Ignore complexity signals
- Skip validation
- Create overly complex initial version

### REFACTOR Mode
✅ **Do:**
- Create backup before refactoring
- Generate clear diff preview
- Get user approval before changes
- Measure impact metrics
- Provide rollback instructions

❌ **Don't:**
- Change functionality during refactoring
- Skip backward compatibility checks
- Refactor without clear goals
- Ignore migration guide creation

### IMPROVE Mode
✅ **Do:**
- Maintain backward compatibility
- Test existing features (regression)
- Update CHANGELOG
- Check if complexity jumped categories
- Add examples for new features

❌ **Don't:**
- Add features without planning
- Break existing functionality
- Skip regression testing
- Let SKILL.md exceed 5k words

### FIX Mode
✅ **Do:**
- Design minimal fix
- Avoid scope creep
- Test both fixed and unchanged behavior
- Update troubleshooting docs
- Use patch version bump

❌ **Don't:**
- Add features while fixing bugs
- Make broad changes
- Skip regression testing
- Change API/interfaces

---

## FAQ

**Q: Can I switch modes mid-process?**
A: Yes, but complete the current phase first. Example: During IMPROVE, if you realize structure needs refactoring, finish current feature, then switch to REFACTOR mode.

**Q: What if keywords are ambiguous?**
A: Mode detector will ask for clarification. Example: "update skill" could be REFACTOR or IMPROVE - system will present options.

**Q: Can I skip phases?**
A: No. All phases are required for quality and safety. However, some phases may be very brief for simple cases.

**Q: How do I know which mode I'm in?**
A: Phase 0 explicitly confirms mode detection. The system will state: "Mode detected: REFACTOR"

**Q: What if I choose the wrong mode?**
A: You can restart in a different mode. If you've already made changes, use rollback (for REFACTOR) or version control to revert.

---

**Mode Selection Checklist:**

- [ ] I know if the skill exists
- [ ] I know my primary goal (create/restructure/enhance/fix)
- [ ] I've checked trigger keywords
- [ ] I understand the expected outcome
- [ ] I'm ready to follow the mode's workflow

**Need help choosing? Ask yourself:**
1. **Does the skill exist?** No → CREATE
2. **Is the structure the problem?** Yes → REFACTOR
3. **Do I want to add features?** Yes → IMPROVE
4. **Do I need to fix a bug?** Yes → FIX
