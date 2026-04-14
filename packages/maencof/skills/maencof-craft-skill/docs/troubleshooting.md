# Troubleshooting Guide

## Quick Diagnostics

**Before diving into specific issues, run the diagnostic:**

```bash
# Run enhanced validator
node scripts/enhanced_validator.mjs /path/to/your-skill

# Check complexity score
node scripts/complexity_scorer.mjs --interactive

# Verify file structure
ls -R /path/to/your-skill
```

---

## Common Issues

### 1. Validation Failures

#### Issue: "SKILL.md must start with YAML frontmatter"

**Symptom:**
```
❌ ERROR: SKILL.md must start with YAML frontmatter (---)
```

**Cause:** SKILL.md doesn't begin with `---`

**Solution:**
```markdown
# WRONG
# My Skill

Some content...

# CORRECT
---
name: my-skill
description: Complete description...
---

# My Skill
```

**Verification:**
```bash
head -1 /path/to/skill/SKILL.md
# Should output: ---
```

---

#### Issue: "Missing required field in frontmatter"

**Symptom:**
```
❌ ERROR: Missing required field 'name' in frontmatter
❌ ERROR: Missing required field 'description' in frontmatter
```

**Cause:** YAML frontmatter incomplete

**Required fields:**
- `name:`
- `description:`

**Optional but recommended:**
- `version:`
- `complexity:`
- `created:`
- `updated:`

**Solution:**
```yaml
---
name: my-skill
description: >
  This skill helps with specific task X when condition Y is met.
  Use it for scenarios A, B, and C. It provides capabilities
  including feature 1, feature 2, and feature 3.
---
```

**Verification:**
```bash
node scripts/enhanced_validator.mjs /path/to/skill | grep "Required field"
# Should show: ✅ PASS: Required field 'name' present
```

---

#### Issue: "Name must be hyphen-case"

**Symptom:**
```
❌ ERROR: Name 'mySkill' must be hyphen-case (lowercase, hyphens only)
❌ ERROR: Name 'my_skill' must be hyphen-case (lowercase, hyphens only)
```

**Cause:** Name uses camelCase, snake_case, or other formats

**Valid formats:**
- `my-skill` ✅
- `api-client-builder` ✅
- `pdf-converter` ✅

**Invalid formats:**
- `mySkill` ❌ (camelCase)
- `my_skill` ❌ (snake_case)
- `MySkill` ❌ (PascalCase)
- `my-Skill` ❌ (mixed case)
- `my--skill` ❌ (double hyphen)
- `-my-skill` ❌ (leading hyphen)

**Solution:**
```yaml
# Before
name: mySkill

# After
name: my-skill
```

**Also update directory name:**
```bash
mv /path/to/mySkill /path/to/my-skill
```

---

#### Issue: "SKILL.md is too large"

**Symptom:**
```
❌ ERROR: SKILL.md is too large (6200 words, max 5000)
```

**Cause:** SKILL.md exceeds 5k word limit

**Solution 1: Extract to reference.md (recommended)**
```bash
# 1. Create reference.md
touch /path/to/skill/reference.md

# 2. Move detailed content
# Extract: detailed workflows, algorithms, technical specs
# Keep in SKILL.md: high-level overview, resource index

# 3. Update SKILL.md to reference it
echo "See reference.md for detailed workflows" >> SKILL.md

# 4. Verify
wc -w /path/to/skill/SKILL.md
# Should be <5000
```

**Solution 2: Use REFACTOR mode**
```bash
# Automated extraction
python scripts/migrate_to_v2.py --plan /path/to/skill
python scripts/migrate_to_v2.py --migrate /path/to/skill
```

**Prevention:**
- Start with high-level overview in SKILL.md
- Put details in reference.md from the beginning
- Check word count regularly: `wc -w SKILL.md`

---

#### Issue: "Description is very short"

**Symptom:**
```
⚠️ WARNING: Description is very short (<10 words) - consider adding more detail
```

**Cause:** Description doesn't meet quality standards

**Bad description:**
```yaml
description: This skill helps with tasks
```

**Good description:**
```yaml
description: >
  Use this skill for converting Markdown files to PDF with custom styling.
  Triggers: when user mentions "markdown to pdf", "generate pdf from md",
  or "styled pdf output". Supports custom fonts, colors, page layouts,
  table of contents, headers/footers, and embedded images. Requires
  pandoc and wkhtmltopdf dependencies.
```

**Requirements:**
- Minimum 20 characters (recommended under 250 chars)
- Explain WHAT the skill does
- List WHEN to use it (trigger scenarios)
- Describe key capabilities
- Mention major dependencies (if any)
- No angle brackets (`<` or `>`) except in YAML multiline (`>`)

**Verification:**
```bash
# Count description words
grep -A 10 "description:" SKILL.md | wc -w
```

---

#### Issue: "Referenced file doesn't exist"

**Symptom:**
```
❌ ERROR: SKILL.md references reference.md but file doesn't exist
```

**Cause:** SKILL.md mentions a file that hasn't been created

**Solution:**
```bash
# Create the missing file
touch /path/to/skill/reference.md
echo "# Detailed Reference" > reference.md

# Or remove the reference from SKILL.md
# Edit SKILL.md and remove mentions of reference.md
```

**Common missing files:**
- `reference.md`
- `examples.md`
- `knowledge/` directory
- `docs/` directory

---

### 2. Script Execution Issues

#### Issue: "Script is not executable"

**Symptom:**
```
⚠️ WARNING: Script generate.py is not executable (chmod +x needed)
```

**Cause:** Script doesn't have execute permissions

**Solution:**
```bash
# Make script executable
chmod +x /path/to/skill/scripts/*.py

# Verify
ls -la /path/to/skill/scripts/
# Should show: -rwxr-xr-x (executable)
```

**Prevention:**
Create scripts with execute permissions:
```bash
touch script.py
chmod +x script.py
```

---

#### Issue: "ModuleNotFoundError" when running scripts

**Symptom:**
```
ModuleNotFoundError: No module named 'requests'
```

**Cause:** Missing Python dependencies

**Solution 1: Install dependencies**
```bash
# If requirements.txt exists
pip install -r requirements.txt

# Manual installation
pip install requests jinja2 pyyaml
```

**Solution 2: Create requirements.txt**
```bash
# List dependencies
echo "requests>=2.28.0" > requirements.txt
echo "jinja2>=3.1.0" >> requirements.txt

# Install
pip install -r requirements.txt
```

**Solution 3: Use virtual environment**
```bash
# Create venv
python -m venv venv

# Activate
source venv/bin/activate  # Linux/Mac
# OR
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

---

#### Issue: "Permission denied" when running script

**Symptom:**
```
bash: ./scripts/generate.py: Permission denied
```

**Cause:** Script not executable or wrong interpreter

**Solution:**
```bash
# Option 1: Make executable and add shebang
chmod +x scripts/generate.py

# Add to top of script:
#!/usr/bin/env python3

# Option 2: Run with python explicitly
python scripts/generate.py
```

---

### 3. Structure and Organization Issues

#### Issue: "No scripts/ directory found"

**Symptom:**
```
⚠️ WARNING: No scripts/ directory found - consider if automation scripts would be helpful
```

**Cause:** Missing scripts directory (even for simple skills)

**Solution:**
```bash
# Create scripts directory
mkdir -p /path/to/skill/scripts

# Add at least one example script
cat > scripts/example.py <<'EOF'
#!/usr/bin/env python3
"""Example script for my-skill"""

def main():
    print("Example script")

if __name__ == "__main__":
    main()
EOF

chmod +x scripts/example.py
```

**When it's OK to skip scripts/:**
- Pure documentation skills (no automation possible)
- Skills that only provide guidance (no code execution)

---

#### Issue: "File organization is confusing"

**Symptom:** Hard to find files, unclear structure

**Cause:** Files not organized by function

**Solution: Organize by complexity category**

**Simple (score <0.4):**
```
skill/
├── SKILL.md
└── scripts/
    └── script.py
```

**Medium (score 0.4-0.7):**
```
skill/
├── SKILL.md
├── reference.md
├── examples.md
└── scripts/
    ├── script1.py
    └── script2.py
```

**Complex (score >0.7):**
```
skill/
├── SKILL.md
├── reference.md
├── examples.md
├── knowledge/
│   ├── topic1.md
│   └── topic2.md
├── scripts/
│   ├── core/
│   ├── utils/
│   └── validation/
└── docs/
    ├── troubleshooting.md
    └── advanced.md
```

---

### 4. Performance Issues

#### Issue: "Skill loads slowly"

**Symptom:** Takes >10 seconds to load skill

**Diagnosis:**
```bash
# Check SKILL.md size
wc -w SKILL.md

# Check total skill size
du -sh /path/to/skill
```

**Causes and Solutions:**

**Cause 1: SKILL.md too large**
```
SKILL.md: 15k words ❌
Solution: Extract to reference.md (see REFACTOR mode)
Target: <5k words ✅
```

**Cause 2: Too many files loaded eagerly**
```
150 files in knowledge/ ❌
Solution: Use progressive disclosure, reference docs instead of loading all
Target: <50 files in main structure ✅
```

**Cause 3: Large binary assets**
```
assets/template.pptx: 25MB ❌
Solution: Store externally, download on-demand
Target: <5MB per asset ✅
```

---

#### Issue: "High memory usage"

**Symptom:** System slows down when using skill

**Diagnosis:**
```bash
# Check skill size
du -sh /path/to/skill/*

# Check for large files
find /path/to/skill -type f -size +1M
```

**Solution:**
```bash
# Remove large files
rm large-file.dat

# Or store externally and download on-demand
# In script:
# download_if_needed("https://example.com/large-file.dat")
```

---

### 5. Complexity Scoring Issues

#### Issue: "Complexity score doesn't match expectations"

**Symptom:**
```
Expected: Simple (based on feel)
Actual: 0.68 (Medium)
```

**Diagnosis:**
```bash
node scripts/complexity_scorer.mjs --spec skill-spec.json --verbose
```

**Example output:**
```json
{
  "score": 0.68,
  "category": "medium",
  "components": {
    "file_score": 0.45,      # 9 files
    "mcp_score": 0.20,       # Has MCP integration
    "workflow_score": 0.30,  # 3 steps
    "conditional_score": 0.20, # 3 conditionals
    "deps_score": 0.40       # 2 dependencies
  }
}
```

**Analysis:**
- File count (9) contributing 0.45 × 0.3 = **0.135**
- MCP integration contributing 0.20 × 1.0 = **0.200** ← High impact
- Workflow (3 steps) contributing 0.30 × 0.1 = **0.030**
- Conditionals (3) contributing 0.20 × 0.15 = **0.030**
- Dependencies (2) contributing 0.40 × 0.25 = **0.100**

**Total: 0.495 (actual 0.68 suggests input error)**

**Solutions:**

1. **Verify inputs are accurate**
```bash
# Recount manually
ls -R skill/ | grep -E "\.py$|\.md$" | wc -l  # File count
grep -i "mcp\|playwright" SKILL.md  # MCP check
```

2. **Tune formula for your domain** (see complexity-tuning.md)

3. **Accept the score if inputs are correct**
- Complexity is objective, not subjective
- MCP integration significantly increases complexity

---

#### Issue: "Skill jumped complexity categories after minor change"

**Symptom:**
```
Before: 0.68 (Medium)
After adding 1 script: 0.72 (Complex)
```

**Cause:** Skill was near boundary, small change pushed it over

**Solutions:**

**Option 1: Accept the new category**
```bash
# Add knowledge/ and docs/ as recommended for Complex
mkdir knowledge docs
# Create required files
```

**Option 2: Remove the addition if not essential**
```bash
# If the added script isn't critical
rm scripts/new-script.py
```

**Option 3: Refactor to reduce other components**
```bash
# Reduce file count by consolidating
# Or simplify workflow
# Goal: bring score back under 0.7
```

**Prevention:**
- Check complexity score before adding features
- Stay well below category boundaries (buffer of 0.05)
- Use IMPROVE mode which checks for category jumps

---

### 6. Deployment and Packaging Issues

#### Issue: "Package creation fails"

**Symptom:**
```
Error: Validation failed, cannot package skill
```

**Cause:** Skill has validation errors

**Solution:**
```bash
# 1. Run validation
node scripts/enhanced_validator.mjs /path/to/skill

# 2. Fix all errors
# (See validation failures section above)

# 3. Re-run packaging
node scripts/package_skill.mjs /path/to/skill

# Should succeed if all errors fixed
```

---

#### Issue: "Skill installed but not recognized by Claude"

**Symptom:** Claude doesn't see the skill after installation

**Diagnosis:**
```bash
# Check installation location
ls -la ~/.claude/skills/my-skill/

# Verify SKILL.md exists
ls -la ~/.claude/skills/my-skill/SKILL.md

# Check YAML frontmatter
head -20 ~/.claude/skills/my-skill/SKILL.md
```

**Common causes:**

**Cause 1: Wrong installation location**
```bash
# Should be: ~/.claude/skills/skill-name/
# NOT: ~/.claude/skills/skill-name/skill-name/

# Fix
mv ~/.claude/skills/my-skill/my-skill/* ~/.claude/skills/my-skill/
rmdir ~/.claude/skills/my-skill/my-skill
```

**Cause 2: Invalid YAML frontmatter**
```bash
# Run validator
node scripts/enhanced_validator.mjs ~/.claude/skills/my-skill

# Fix any YAML errors
```

**Cause 3: File permissions**
```bash
# Make files readable
chmod -R 644 ~/.claude/skills/my-skill/*
chmod 755 ~/.claude/skills/my-skill/scripts/*
```

**Cause 4: Claude Code needs restart**
```bash
# Restart Claude Code application
# Skills are loaded on startup
```

---

### 7. Version Management Issues

#### Issue: "CHANGELOG is missing or incorrect format"

**Symptom:**
```
⚠️ WARNING: CHANGELOG.md not found or incorrectly formatted
```

**Solution: Create proper CHANGELOG.md**
```markdown
# Changelog

All notable changes to this skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-12

### Added
- Initial release with core functionality
- Scripts for automation
- Comprehensive documentation

### Changed
- N/A (initial release)

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A
```

---

#### Issue: "Version numbers inconsistent"

**Symptom:** Different versions in different files

**Diagnosis:**
```bash
# Check version in SKILL.md
grep "version:" SKILL.md

# Check version in package metadata
cat .skill-metadata.json | grep version

# Check CHANGELOG
head -20 CHANGELOG.md
```

**Solution:** Use git tags and CHANGELOG.md for version tracking
```bash
# 1. CHANGELOG.md
## [2.1.0] - 2026-02-12

# 2. Git tag
git tag -a v2.1.0 -m "Release v2.1.0"
```

---

### 8. Migration Issues

#### Issue: "Migration script fails midway"

**Symptom:**
```
Error during migration: Backup created at /path/backup
Rolling back...
```

**Cause:** Migration encountered an issue

**Recovery:**
```bash
# Check backup exists
ls -la /path/to/skill.backup/

# Restore if needed
cp -r /path/to/skill.backup/* /path/to/skill/

# Check what failed
cat /tmp/migration-error.log

# Fix the issue, retry migration
python scripts/migrate_to_v2.py --migrate /path/to/skill
```

---

#### Issue: "After migration, functionality broke"

**Symptom:** Scripts don't work after REFACTOR

**Cause:** Paths changed during reorganization

**Diagnosis:**
```bash
# Test scripts
python scripts/generate.py
# Check for import errors or file not found

# Check for hardcoded paths
grep -r "/old/path" scripts/
```

**Solution: Update paths**
```python
# Before refactoring
from utils import helper  # Worked when utils.py was in scripts/

# After refactoring (utils moved to scripts/utils/)
from scripts.utils import helper  # Now fails

# Fix: Update import
from utils.helper import function  # Correct for new structure
```

**Prevention:**
- Use relative imports
- Test all scripts after migration
- Update path references in documentation

---

## Debugging Techniques

### 1. Verbose Validation

```bash
# Run with verbose output
node scripts/enhanced_validator.mjs /path/to/skill --verbose

# Shows detailed checks:
# - Checking YAML frontmatter...
# - Validating name format...
# - Checking file references...
```

---

### 2. Component-by-Component Testing

Test complexity components individually:

```bash
# Test file count
find /path/to/skill -type f | wc -l

# Test MCP integration
grep -i "mcp\|playwright\|context7\|sequential" SKILL.md

# Count workflow steps
grep "^## " SKILL.md | wc -l

# Count conditionals
grep -iE "if|when|option|mode" SKILL.md | wc -l

# List dependencies
cat requirements.txt | wc -l
```

---

### 3. Diff Comparison

Compare before/after for migrations:

```bash
# Before migration
tree /path/to/skill > before.txt
wc -w SKILL.md >> before.txt

# After migration
tree /path/to/skill > after.txt
wc -w SKILL.md >> after.txt

# Compare
diff before.txt after.txt
```

---

### 4. Incremental Validation

Validate in steps:

```bash
# Step 1: YAML only
python -c "import yaml; yaml.safe_load(open('SKILL.md').mcp_t_read().split('---')[1])"

# Step 2: File structure
ls -R

# Step 3: Scripts executable
find scripts/ -name "*.py" -exec file {} \;

# Step 4: Full validation
node scripts/enhanced_validator.mjs .
```

---

## Error Message Reference

### Critical Errors (Must Fix)

| Error | Cause | Priority |
|-------|-------|----------|
| YAML frontmatter format invalid | Malformed YAML | 🔴 Critical |
| Missing required field 'name' | No name in frontmatter | 🔴 Critical |
| SKILL.md not found | Missing main file | 🔴 Critical |
| Name must be hyphen-case | Wrong naming format | 🔴 Critical |
| SKILL.md is too large | >5k words | 🟠 High |

### Warnings (Should Fix)

| Warning | Cause | Priority |
|---------|-------|----------|
| Description is very short | <20 chars | 🟡 Medium |
| No scripts/ directory | Missing automation | 🟡 Medium |
| Script not executable | Missing chmod +x | 🟡 Medium |
| Approaching size limit | 4500-5000 words | 🟡 Medium |

### Info (Optional)

| Info | Cause | Priority |
|------|-------|----------|
| Consider adding examples.md | Medium complexity without examples | 🟢 Low |
| Could organize scripts/ better | 8+ scripts in flat structure | 🟢 Low |

---

## Getting Help

### Self-Service Resources

1. **Check this troubleshooting guide** (you are here)
2. **Review examples.md** for working patterns
3. **Read PRD** for architectural details
4. **Check complexity-tuning.md** for scoring issues

### Diagnostic Commands

```bash
# Full diagnostic
node scripts/enhanced_validator.mjs /path/to/skill --verbose > diagnostic.txt

# Include in support request:
cat diagnostic.txt
tree /path/to/skill
wc -w SKILL.md
node scripts/complexity_scorer.mjs --spec skill-spec.json
```

### Common Quick Fixes

**90% of issues are:**
1. Missing YAML frontmatter (add `---` at start)
2. Wrong name format (use hyphen-case)
3. SKILL.md too large (extract to reference.md)
4. Scripts not executable (chmod +x)
5. Missing dependencies (pip install -r requirements.txt)

**Try these first before deep debugging.**

---

## Prevention Checklist

**Before creating a skill:**
- [ ] Understand complexity implications
- [ ] Plan file structure based on complexity
- [ ] Prepare dependencies list
- [ ] Design for progressive disclosure

**During skill development:**
- [ ] Validate frequently (after each major change)
- [ ] Keep SKILL.md <5k words from start
- [ ] Make scripts executable immediately
- [ ] Document as you go

**Before deployment:**
- [ ] Run full validation suite
- [ ] Test all scripts
- [ ] Verify all examples work
- [ ] Check version consistency
- [ ] Create backup before packaging

---

**Still stuck?** Review the PRD Section 9 (Migration Guide) or docs/migration-guide.md for detailed walkthroughs.
