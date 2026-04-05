# Migration Guide - Upgrading to skill-constructor 2.0

## Executive Summary

skill-constructor 2.0 introduces a **layered file structure** with progressive disclosure, replacing the monolithic single-file approach of v1.x. This guide helps you migrate existing skills to the new architecture.

**Key Changes:**
- 📊 **Complexity-based structuring**: Skills organized by complexity (Simple/Medium/Complex)
- 📁 **File hierarchy**: SKILL.md (<5k) + reference.md + examples.md + knowledge/ + docs/
- 🎯 **Four operating modes**: CREATE, REFACTOR, IMPROVE, FIX
- ✅ **Enhanced validation**: Automated quality checks and standards enforcement
- 🔄 **Version management**: Semantic versioning with CHANGELOG support

---

## Migration Roadmap

### Step 1: Assess Your Current Skill

**Analyze complexity:**
```bash
cd /path/to/skill-constructor
python scripts/complexity_scorer.py --interactive
```

**Check SKILL.md size:**
```bash
wc -w /path/to/your-skill/SKILL.md
```

**Decision Matrix:**

| Current State | SKILL.md Size | Action Required |
|--------------|---------------|-----------------|
| Simple skill | <3k words | **Minimal** - Add metadata only |
| Medium skill | 3-5k words | **Moderate** - Consider adding reference.md |
| Large skill | >5k words | **Required** - Extract to layered structure |

---

## Migration Scenarios

### Scenario A: Simple Skill (<3k words, Score <0.4)

**Before:**
```
my-skill/
└── SKILL.md (2.8k words)
```

**Migration Steps:**

1. **Update YAML frontmatter:**
```yaml
---
name: my-skill
description: [Existing description - ensure >50 words with specific triggers]
version: 2.0.0  # ← ADD THIS
complexity: simple  # ← ADD THIS
created: 2026-01-15  # ← ADD THIS
updated: 2026-02-12  # ← ADD THIS
---
```

2. **Validate:**
```bash
python /path/to/skill-constructor/scripts/enhanced_validator.py /path/to/my-skill
```

3. **Package:**
```bash
python /path/to/skill-constructor/scripts/package_skill.py /path/to/my-skill
```

**After:**
```
my-skill/
└── SKILL.md (2.8k words + metadata)
```

**Time estimate:** 10-15 minutes

---

### Scenario B: Medium Skill (3-5k words, Score 0.4-0.7)

**Before:**
```
my-skill/
├── SKILL.md (6.5k words - too large!)
└── scripts/ (3 files)
```

**Migration Steps:**

1. **Extract detailed content to reference.md:**

**Identify content to extract:**
- Detailed algorithm explanations
- Step-by-step procedures
- Technical specifications
- Edge case handling

**Example extraction:**
```markdown
# In SKILL.md - BEFORE
## Phase 3: Data Processing
This phase involves complex data transformation using the following algorithm:
1. Parse input data structure...
2. Apply normalization rules...
[... 500 words of detailed steps ...]

# In SKILL.md - AFTER
## Phase 3: Data Processing
This phase transforms input data using normalization algorithms.
See `reference.md` for detailed processing steps and algorithms.

# In reference.md - NEW
## Phase 3: Data Processing - Detailed Workflow

### Algorithm Overview
[... 500 words of detailed steps ...]
```

2. **Create examples.md from inline examples:**

```markdown
# In SKILL.md - BEFORE
Example 1: Processing user data
```json
{ "user": "john", "age": 30 }
```
[... 3 more examples ...]

# In SKILL.md - AFTER
## Examples
See `examples.md` for 5+ real-world usage examples.

# In examples.md - NEW
# My Skill Examples

## Example 1: Processing User Data
### Input
```json
{ "user": "john", "age": 30 }
```
[... detailed example ...]
```

3. **Update SKILL.md frontmatter:**
```yaml
---
name: my-skill
description: [Updated with specific triggers]
version: 2.0.0
complexity: medium
created: 2026-01-15
updated: 2026-02-12
---
```

4. **Add resource references in SKILL.md:**
```markdown
## Resources

### reference.md
Detailed workflows, algorithms, and technical specifications.

### examples.md
5 real-world usage examples covering common scenarios.

### scripts/
Automation tools: [list scripts with brief descriptions]
```

5. **Validate and measure impact:**
```bash
# Validate
python scripts/enhanced_validator.py /path/to/my-skill

# Check size reduction
echo "Before: 6.5k words"
wc -w /path/to/my-skill/SKILL.md
```

**After:**
```
my-skill/
├── SKILL.md (4.2k words ✅)
├── reference.md (2.8k words)
├── examples.md (1.5k words)
└── scripts/ (3 files)
```

**Time estimate:** 1-2 hours

---

### Scenario C: Complex Skill (>5k words, Score >0.7)

**Before:**
```
my-skill/
├── SKILL.md (15k words - way too large!)
└── scripts/ (8 files, unorganized)
```

**Migration Steps:**

**1. Create full layered structure:**

```bash
cd /path/to/my-skill
mkdir -p knowledge docs
```

**2. Extract content systematically:**

**SKILL.md → reference.md (workflows & algorithms):**
```markdown
# Extract from SKILL.md:
- Detailed phase workflows
- Algorithm pseudocode
- Technical specifications
- API references

# Target: 8-12k words in reference.md
```

**SKILL.md → examples.md (usage examples):**
```markdown
# Extract from SKILL.md:
- All inline examples
- Usage scenarios
- Before/after comparisons
- Common patterns

# Target: 3-5k words with 5-10 examples
```

**SKILL.md → knowledge/ (deep theory):**
```markdown
# Create knowledge/ files:
knowledge/
├── skill-anatomy.md        # How this skill is structured
├── progressive-disclosure.md  # Loading strategy
├── mcp-integration.md      # MCP server usage (if applicable)
├── bundled-resources.md    # Scripts/references/assets design
└── quality-standards.md    # Quality criteria

# Target: 2-4k words per file
```

**Create docs/ guides:**
```markdown
docs/
├── troubleshooting.md      # Common issues and solutions
├── advanced-patterns.md    # Advanced usage patterns
└── [other guides as needed]
```

**3. Compress SKILL.md to <5k words:**

**Before (15k words):**
```markdown
## Phase 1: Requirements Discovery

Step 1.1: Gather User Requirements
When gathering requirements, you should:
1. Ask about the primary use case
2. Understand the user's workflow
3. Identify pain points
[... 500 words ...]

Step 1.2: Analyze Technical Constraints
Technical constraints include:
- System requirements
- Dependencies
[... 400 words ...]

## Phase 2: [... more phases with similar detail]
```

**After (4.5k words):**
```markdown
## Phase 1: Requirements Discovery

Gather user requirements and analyze technical constraints.

**Key Steps:**
1. Understand primary use case
2. Identify workflow and pain points
3. Document technical constraints

See `reference.md` → "Phase 1: Requirements Discovery" for detailed procedures.
```

**4. Organize scripts/ directory:**

```bash
# Before
scripts/
├── script1.py
├── script2.py
├── helper.py
├── util.py
├── validator.py
├── generator.py
├── packager.py
└── deployer.py

# After (if 8+ scripts, organize by function)
scripts/
├── core/
│   ├── generator.py
│   └── packager.py
├── validation/
│   └── validator.py
├── utils/
│   ├── helper.py
│   └── util.py
└── deployment/
    └── deployer.py
```

**5. Update frontmatter and add index:**

```yaml
---
name: my-skill
description: [Comprehensive description with specific triggers]
version: 2.0.0
complexity: complex
created: 2026-01-15
updated: 2026-02-12
changelog: CHANGELOG.md
---

# My Skill

## Quick Start
[2-3 sentence overview - keep brief!]

## When to Use This Skill
[Bulleted list of specific trigger scenarios]

## Core Workflow
[High-level overview - 5-7 main steps with references]

## Resources

### reference.md
Comprehensive workflows, algorithms, mode-specific processes, and technical details.

### examples.md
10 real-world examples covering simple to complex usage scenarios.

### knowledge/
Deep-dive topics:
- `skill-anatomy.md` - Structural design principles
- `progressive-disclosure.md` - Loading strategy
- `mcp-integration.md` - MCP server integration (if applicable)
- `bundled-resources.md` - Scripts/references/assets design
- `quality-standards.md` - Quality criteria and best practices

### scripts/
Automation tools organized by function. See `reference.md` → "Scripts Reference" for details.

### docs/
- `troubleshooting.md` - Common issues and solutions
- `advanced-patterns.md` - Advanced usage patterns

## Quick Reference
[Essential operations only - full reference in reference.md]
```

**6. Create CHANGELOG.md:**

```markdown
# Changelog

## [2.0.0] - 2026-02-12

### Changed
- **BREAKING**: Restructured to layered file hierarchy
- SKILL.md reduced from 15k to 4.5k words (70% reduction)
- Detailed content moved to reference.md (12k words)
- Examples extracted to examples.md (4k words)

### Added
- knowledge/ directory with 5 deep-dive topics
- docs/ directory with troubleshooting and advanced patterns
- Enhanced validation support
- Complexity metadata

### Migration
See docs/migration-guide.md for upgrading from v1.x

## [1.0.0] - 2026-01-15

### Added
- Initial release with monolithic SKILL.md
```

**7. Validate and analyze impact:**

```bash
# Validate structure
python scripts/enhanced_validator.py /path/to/my-skill

# Analyze impact
echo "=== Impact Analysis ==="
echo "SKILL.md size: 15k → $(wc -w /path/to/my-skill/SKILL.md | awk '{print $1}') words"
echo "Files created: reference.md, examples.md, knowledge/ (5), docs/ (2)"
echo "Load time estimate: 20s → 5s (75% reduction)"
```

**After:**
```
my-skill/
├── SKILL.md (4.5k words ✅)
├── reference.md (12k words)
├── examples.md (4k words)
├── CHANGELOG.md
├── knowledge/
│   ├── skill-anatomy.md
│   ├── progressive-disclosure.md
│   ├── mcp-integration.md
│   ├── bundled-resources.md
│   └── quality-standards.md
├── scripts/
│   ├── core/
│   ├── validation/
│   ├── utils/
│   └── deployment/
└── docs/
    ├── troubleshooting.md
    └── advanced-patterns.md
```

**Time estimate:** 3-5 hours

---

## Automated Migration Tool

For complex migrations, use the automated migration assistant:

```bash
# Analyze migration needs
python scripts/migrate_to_v2.py --analyze /path/to/my-skill

# Preview migration plan
python scripts/migrate_to_v2.py --plan /path/to/my-skill

# Execute migration (creates backup first)
python scripts/migrate_to_v2.py --migrate /path/to/my-skill

# Rollback if needed
python scripts/migrate_to_v2.py --rollback /path/to/my-skill
```

**Tool features:**
- ✅ Automatic complexity assessment
- ✅ Content extraction with smart categorization
- ✅ Backup creation before changes
- ✅ Validation after migration
- ✅ Impact analysis report
- ✅ Rollback capability

---

## Compatibility Checklist

### Before Migration
- [ ] Backup entire skill directory
- [ ] Document current version number
- [ ] Note any custom modifications
- [ ] List external dependencies
- [ ] Test current functionality

### During Migration
- [ ] Follow scenario-specific steps
- [ ] Maintain all functionality
- [ ] Preserve script behavior
- [ ] Keep user-facing interfaces
- [ ] Update cross-references

### After Migration
- [ ] Run enhanced_validator.py
- [ ] Test all scripts
- [ ] Verify resource references
- [ ] Check examples work
- [ ] Measure load time improvement
- [ ] Update documentation
- [ ] Create CHANGELOG entry
- [ ] Increment version to 2.0.0

---

## Breaking Changes in v2.0

### 1. SKILL.md Size Limit
**Change:** SKILL.md must be <5k words
**Impact:** Large skills must extract content to reference.md
**Migration:** Extract detailed workflows, algorithms to reference.md

### 2. Required Metadata Fields
**Change:** `complexity` field now required in frontmatter
**Impact:** Validation fails without it
**Migration:** Add `complexity: simple|medium|complex` based on assessment

### 3. File Hierarchy
**Change:** Layered structure expected for medium/complex skills
**Impact:** Single-file skills will get warnings
**Migration:** Create reference.md for extensibility

### 4. Naming Conventions
**Change:** Strict hyphen-case enforcement
**Impact:** Names with underscores or camelCase rejected
**Migration:** Rename to hyphen-case (e.g., `mySkill` → `my-skill`)

### 5. Description Quality
**Change:** Descriptions must be >50 words with specific triggers
**Impact:** Vague descriptions fail validation
**Migration:** Expand description with concrete use cases

---

## Rollback Procedure

If migration causes issues:

### 1. Automated Rollback
```bash
python scripts/migrate_to_v2.py --rollback /path/to/my-skill
```

### 2. Manual Rollback
```bash
# Restore from backup
cp -r /path/to/my-skill.backup/* /path/to/my-skill/

# Verify restoration
python scripts/enhanced_validator.py /path/to/my-skill --v1-mode
```

### 3. Partial Rollback
If only some changes need reverting:
```bash
# Restore specific file
cp /path/to/my-skill.backup/SKILL.md /path/to/my-skill/

# Keep new additions (reference.md, examples.md)
# Remove if needed: rm reference.md examples.md
```

---

## FAQ

### Q1: Do I have to migrate immediately?
**A:** No. v1.x skills continue to work, but v2.0 provides better performance, validation, and maintainability. Migrate when you're adding features or refactoring.

### Q2: Will my existing skill stop working?
**A:** No. Claude Code maintains backward compatibility. However, new features require v2.0 structure.

### Q3: Can I migrate incrementally?
**A:** Yes! For simple skills, just add metadata. For medium/complex skills, extract content over multiple sessions using multi-turn refinement.

### Q4: What if my skill is between thresholds (4.8k words)?
**A:** You're close to the limit. Consider adding reference.md for future extensibility even if not strictly required.

### Q5: How do I handle custom scripts?
**A:** Scripts remain functional. For 8+ scripts, organize into subdirectories by function. Update references in SKILL.md if paths change.

### Q6: What about skills with MCP integration?
**A:** MCP integration increases complexity score. Ensure `has_mcp_integration: true` in metadata and document integration in `knowledge/mcp-integration.md`.

### Q7: Can I customize the complexity formula?
**A:** Yes! See `docs/complexity-tuning.md` for guidance on adjusting weights for domain-specific needs.

### Q8: How do I version the migration?
**A:** Bump to 2.0.0 for breaking structural changes. Use CHANGELOG.md to document the migration. Tag the release for easy rollback reference.

---

## Post-Migration Best Practices

### 1. Update Documentation
- Review SKILL.md for clarity and conciseness
- Ensure reference.md has comprehensive details
- Add real examples to examples.md
- Update any external references to the skill

### 2. Validate Regularly
```bash
# Run validation after any changes
python scripts/enhanced_validator.py /path/to/my-skill
```

### 3. Monitor Performance
```bash
# Measure load time before/after
time cat /path/to/my-skill/SKILL.md > /dev/null
```

### 4. Gather Feedback
- Test with real usage scenarios
- Collect user feedback on new structure
- Iterate based on usability findings

### 5. Maintain Quality
- Keep SKILL.md under 5k words
- Add examples as you discover new use cases
- Update reference.md when workflows change
- Use multi-turn refinement for continuous improvement

---

## Migration Timeline Recommendation

**Week 1-2:** Simple skills (batch migration possible)
**Week 3-4:** Medium skills (requires content extraction)
**Week 5-8:** Complex skills (full restructuring)
**Week 9-10:** Testing and refinement
**Week 11-12:** Documentation and knowledge sharing

**Prioritize:**
1. High-usage skills first
2. Skills being actively developed
3. Skills with quality issues
4. Older skills needing refresh

---

## Success Metrics

Track these metrics post-migration:

### Performance
- [ ] SKILL.md load time reduced by >50%
- [ ] Context window usage reduced
- [ ] Initial skill discovery faster

### Quality
- [ ] Validation score >80
- [ ] Zero validation errors
- [ ] All examples functional
- [ ] Documentation complete

### Usability
- [ ] User feedback positive
- [ ] Easier to understand structure
- [ ] Faster to find specific information
- [ ] Better progressive disclosure

---

## Support

**Issues during migration?**

1. Check `docs/troubleshooting.md` in skill-constructor
2. Run validation with `--verbose` flag for detailed errors
3. Review migration logs in `.omc/logs/migration-*.log`
4. Use rollback procedure if needed

**Need help?**
- Review examples in `examples.md`
- Check `knowledge/` for deep-dive topics
- Consult PRD Section 9 for technical details

---

**Migration Checklist:**
- [ ] Backed up original skill
- [ ] Assessed complexity score
- [ ] Followed scenario-specific steps
- [ ] Created required files (reference.md, examples.md, etc.)
- [ ] Updated SKILL.md frontmatter
- [ ] Compressed SKILL.md to <5k words
- [ ] Added resource references
- [ ] Created CHANGELOG.md
- [ ] Ran enhanced_validator.py (passed)
- [ ] Tested all functionality
- [ ] Measured performance improvement
- [ ] Documented migration in CHANGELOG
- [ ] Incremented version to 2.0.0
- [ ] Packaged updated skill

**Congratulations on migrating to skill-constructor 2.0! 🎉**
